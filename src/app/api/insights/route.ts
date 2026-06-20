import { NextRequest, NextResponse } from "next/server";
import { chatWithGemini, CARBON_COACH_SYSTEM_PROMPT } from "@/lib/gemini";
import { getReductionSuggestions, formatCO2 } from "@/lib/carbon-calculator";
import { UserProfile, CarbonEntry, CarbonCategory } from "@/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function calculateWeeklyStats(entries: CarbonEntry[]) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = entries.filter((e) => new Date(e.date) >= weekAgo);
  const lastWeek = entries.filter(
    (e) => new Date(e.date) >= twoWeeksAgo && new Date(e.date) < weekAgo
  );

  const thisWeekTotal = thisWeek.reduce((sum, e) => sum + (e.isReduction ? -e.co2Kg : e.co2Kg), 0);
  const lastWeekTotal = lastWeek.reduce((sum, e) => sum + (e.isReduction ? -e.co2Kg : e.co2Kg), 0);

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

  const topCategory = (Object.entries(categoryTotals) as [CarbonCategory, number][])
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "other";

  const improvement =
    lastWeekTotal > 0
      ? Math.round(((lastWeekTotal - thisWeekTotal) / lastWeekTotal) * 100)
      : 0;

  return { totalEmissions: Math.round(thisWeekTotal * 100) / 100, topCategory, improvement };
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

    const userProfile = profile as UserProfile;
    const { totalEmissions, topCategory, improvement } = calculateWeeklyStats(entries);
    const suggestions = getReductionSuggestions(userProfile.lifestyle);

    const insightPrompt = `Based on this user's weekly carbon data, write a short personalized insight (2-3 sentences):
- Total emissions this week: ${formatCO2(totalEmissions)}
- Biggest category: ${topCategory}
- Week-over-week change: ${improvement > 0 ? `${improvement}% improvement` : improvement < 0 ? `${Math.abs(improvement)}% increase` : "no change"}
- Their lifestyle: ${userProfile.lifestyle.transport} transport, ${userProfile.lifestyle.diet} diet, ${userProfile.lifestyle.homeEnergy} energy usage
- Streak: ${userProfile.streak} days

Be encouraging, specific, and give one actionable tip.`;

    const messages = [{ role: "user" as const, parts: [{ text: insightPrompt }] }];
    const aiInsight = await chatWithGemini(messages, CARBON_COACH_SYSTEM_PROMPT);

    return NextResponse.json(
      {
        totalEmissions,
        topCategory,
        improvement,
        aiInsight,
        suggestions,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate insights", details },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
