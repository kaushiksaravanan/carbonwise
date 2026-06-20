// Gemini proxy via CipherStack — keys auto-rotate on 429, see lib/gemini.ts
import { NextRequest, NextResponse } from "next/server";
import { chatWithGemini, CARBON_COACH_SYSTEM_PROMPT } from "@/lib/gemini";
import { calculateDailyBaseline, calculateDailyBudget, formatCO2 } from "@/lib/carbon-calculator";
import { UserProfile } from "@/types";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) return false;
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

function buildUserContext(profile: UserProfile): string {
  const daily = calculateDailyBaseline(profile.lifestyle);
  const budget = calculateDailyBudget(profile.lifestyle);

  return `
User context:
- Name: ${profile.name}
- Transport: ${profile.lifestyle.transport}
- Diet: ${profile.lifestyle.diet}
- Home energy: ${profile.lifestyle.homeEnergy}
- Shopping: ${profile.lifestyle.shopping}
- Home size: ${profile.lifestyle.homeSize}
- Daily baseline: ${formatCO2(daily)}
- Daily budget target: ${formatCO2(budget)}
- Streak: ${profile.streak} days
- Total CO2 saved: ${formatCO2(profile.totalCO2Saved)}
`.trim();
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
        { error: "Rate limit exceeded. Max 10 requests per 60 seconds." },
        { status: 429, headers: CORS_HEADERS }
      );
    }

    const body = await request.json();
    const { message, profile, history } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required and must be a string" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: "message must be 1000 characters or fewer" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const userContext = profile ? buildUserContext(profile as UserProfile) : "";
    const systemPrompt = userContext
      ? `${CARBON_COACH_SYSTEM_PROMPT}\n\n${userContext}`
      : CARBON_COACH_SYSTEM_PROMPT;

    const messages = [
      ...(Array.isArray(history)
        ? history.map((msg: { role: string; content: string }) => ({
            role: msg.role === "user" ? "user" as const : "model" as const,
            parts: [{ text: msg.content }],
          }))
        : []),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const response = await chatWithGemini(messages, systemPrompt);

    return NextResponse.json({ response }, { headers: CORS_HEADERS });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate response", details },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
