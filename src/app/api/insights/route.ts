import { NextRequest, NextResponse } from "next/server";
import { chatWithGemini, CARBON_COACH_SYSTEM_PROMPT } from "@/lib/gemini";
import { getReductionSuggestions, formatCO2 } from "@/lib/carbon-calculator";
import { UserProfile, CarbonEntry, CarbonCategory } from "@/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Cap entries per request to bound LLM cost / payload size.
const MAX_ENTRIES = 1000;

// In-memory rate limit (mirrors /api/chat). Insights is more expensive than chat,
// so keep the window tighter — 5 req / 60s per IP.
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Insight response cache keyed by hash(profile + entries). Repeated calls within
// CACHE_TTL_MS reuse the Gemini response instead of re-billing.
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
type CachedInsight = {
  expiresAt: number;
  payload: {
    totalEmissions: number;
    topCategory: CarbonCategory;
    improvement: number;
    aiInsight: string;
    suggestions: ReturnType<typeof getReductionSuggestions>;
  };
};
const insightCache = new Map<string, CachedInsight>();

function hashKey(s: string): string {
  // Tiny non-cryptographic hash (FNV-1a 32-bit) — fine for cache keying.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function todayLocalDateStr(now: Date = new Date()): string {
  // Local-timezone YYYY-MM-DD, matching how entries are stored client-side
  // (`new Date().toISOString().split('T')[0]` is timezone-naive but written
  // in the user's wall clock; we compare lexicographically below).
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDateStr(dateStr: string, deltaDays: number): string {
  // dateStr is YYYY-MM-DD. Parse as local date, shift by deltaDays, re-emit.
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  return todayLocalDateStr(dt);
}

// Not exported — Next.js disallows non-handler exports from route files.
// Test via the route handler if direct testing is needed.
function calculateWeeklyStats(
  entries: CarbonEntry[],
  now: Date = new Date()
) {
  const todayStr = todayLocalDateStr(now);
  const weekAgoStr = shiftDateStr(todayStr, -6); // last 7 days inclusive of today
  const twoWeeksAgoStr = shiftDateStr(todayStr, -13);

  // ISO YYYY-MM-DD is lex-sortable, so string compare avoids the UTC/local
  // off-by-one bug from new Date('YYYY-MM-DD') (which parses as UTC midnight).
  // We also clamp out future-dated entries (> todayStr) so client clock skew
  // or bad data can't pollute thisWeek totals.
  const thisWeek = entries.filter(
    (e) => typeof e?.date === "string" && e.date >= weekAgoStr && e.date <= todayStr
  );
  const lastWeek = entries.filter(
    (e) =>
      typeof e?.date === "string" &&
      e.date >= twoWeeksAgoStr &&
      e.date < weekAgoStr
  );

  const thisWeekTotal = thisWeek.reduce(
    (sum, e) => sum + (e.isReduction ? -e.co2Kg : e.co2Kg),
    0
  );
  const lastWeekTotal = lastWeek.reduce(
    (sum, e) => sum + (e.isReduction ? -e.co2Kg : e.co2Kg),
    0
  );

  const categoryTotals: Record<CarbonCategory, number> = {
    transport: 0,
    food: 0,
    energy: 0,
    shopping: 0,
    other: 0,
  };

  for (const entry of thisWeek) {
    if (!entry.isReduction) {
      categoryTotals[entry.category] += entry.co2Kg;
    }
  }

  // Pick top category only when there's actual emission this week. Without this
  // guard, an empty/all-zero week would deterministically pick the first key.
  const maxCategoryValue = Math.max(...Object.values(categoryTotals));
  let topCategory: CarbonCategory = "other";
  if (maxCategoryValue > 0) {
    // Stable tie-break: iterate in fixed order (declaration order of the record)
    // so ties are broken deterministically rather than relying on sort stability.
    const order: CarbonCategory[] = ["transport", "food", "energy", "shopping", "other"];
    for (const cat of order) {
      if (categoryTotals[cat] === maxCategoryValue) {
        topCategory = cat;
        break;
      }
    }
  }

  // Improvement %:
  //  - lastWeek > 0 and thisWeek <= 0 (net reductions or none): 100% improvement, capped.
  //  - lastWeek > 0: standard week-over-week delta.
  //  - lastWeek <= 0 and thisWeek > 0: report a -100% (genuine increase) instead of hiding it.
  //  - both <= 0: 0 (no signal).
  let improvement = 0;
  if (lastWeekTotal > 0) {
    improvement = Math.round(((lastWeekTotal - thisWeekTotal) / lastWeekTotal) * 100);
  } else if (thisWeekTotal > 0) {
    improvement = -100;
  }

  return {
    totalEmissions: Math.round(thisWeekTotal * 100) / 100,
    topCategory,
    improvement,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415, headers: CORS_HEADERS }
      );
    }

    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} requests per 60 seconds.` },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const { profile, entries } = body;

    if (!profile || typeof profile !== "object" || !profile.lifestyle) {
      return NextResponse.json(
        { error: "profile with lifestyle data is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "entries must be an array of CarbonEntry objects" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (entries.length > MAX_ENTRIES) {
      return NextResponse.json(
        { error: `entries must contain at most ${MAX_ENTRIES} items` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const userProfile = profile as UserProfile;
    const { totalEmissions, topCategory, improvement } = calculateWeeklyStats(entries);
    const suggestions = getReductionSuggestions(userProfile.lifestyle);

    // Cache keyed on lifestyle + streak + today + computed weekly stats. The
    // weekly stats already encode the relevant entry-derived inputs, so we
    // don't need to hash every entry — keeps the key small but still changes
    // when the user's situation changes.
    const cacheKey = hashKey(
      JSON.stringify({
        lifestyle: userProfile.lifestyle,
        streak: userProfile.streak,
        today: todayLocalDateStr(),
        totalEmissions,
        topCategory,
        improvement,
      })
    );
    const cached = insightCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, { headers: CORS_HEADERS });
    }

    const insightPrompt = `Based on this user's weekly carbon data, write a short personalized insight (2-3 sentences):
- Total emissions this week: ${formatCO2(totalEmissions)}
- Biggest category: ${topCategory}
- Week-over-week change: ${improvement > 0 ? `${improvement}% improvement` : improvement < 0 ? `${Math.abs(improvement)}% increase` : "no change"}
- Their lifestyle: ${userProfile.lifestyle.transport} transport, ${userProfile.lifestyle.diet} diet, ${userProfile.lifestyle.homeEnergy} energy usage
- Streak: ${userProfile.streak} days

Be encouraging, specific, and give one actionable tip.`;

    const messages = [{ role: "user" as const, parts: [{ text: insightPrompt }] }];
    const aiInsight = await chatWithGemini(messages, CARBON_COACH_SYSTEM_PROMPT);

    const payload = {
      totalEmissions,
      topCategory,
      improvement,
      aiInsight,
      suggestions,
    };

    insightCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload, { headers: CORS_HEADERS });
  } catch (error) {
    // Never propagate upstream / internal error text to clients — it can
    // contain API keys, vendor stack traces, or other internals. Log
    // server-side instead.
    console.error("[insights] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
