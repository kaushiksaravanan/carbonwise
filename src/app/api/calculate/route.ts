import { NextRequest, NextResponse } from "next/server";
import {
  calculateDailyBaseline,
  calculateDailyBudget,
  calculateActivityEmission,
  calculateWhatIf,
  formatCO2,
} from "@/lib/carbon-calculator";
import {
  LifestyleData,
  CarbonCategory,
  TRANSPORT_OPTIONS,
  DIET_OPTIONS,
  HOME_ENERGY_OPTIONS,
  SHOPPING_OPTIONS,
  HOME_SIZE_OPTIONS,
} from "@/types";

const VALID_CATEGORIES: CarbonCategory[] = ["transport", "food", "energy", "shopping", "other"];

function validateLifestyle(lifestyle: unknown): lifestyle is LifestyleData {
  if (!lifestyle || typeof lifestyle !== "object") return false;
  const l = lifestyle as Record<string, unknown>;
  return (
    (TRANSPORT_OPTIONS as readonly string[]).includes(l.transport as string) &&
    (DIET_OPTIONS as readonly string[]).includes(l.diet as string) &&
    (HOME_ENERGY_OPTIONS as readonly string[]).includes(l.homeEnergy as string) &&
    (SHOPPING_OPTIONS as readonly string[]).includes(l.shopping as string) &&
    (HOME_SIZE_OPTIONS as readonly string[]).includes(l.homeSize as string)
  );
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

    const body = await request.json();
    const { action, data } = body;

    if (!action || !["baseline", "activity", "whatif"].includes(action)) {
      return NextResponse.json(
        { error: "action must be one of: baseline, activity, whatif" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "data is required and must be an object" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (action === "baseline") {
      if (!validateLifestyle(data.lifestyle)) {
        return NextResponse.json(
          { error: "Invalid lifestyle data" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const dailyKg = calculateDailyBaseline(data.lifestyle);
      const yearlyKg = Math.round(dailyKg * 365 * 100) / 100;
      const budget = calculateDailyBudget(data.lifestyle);

      return NextResponse.json(
        { dailyKg, yearlyKg, budget, formatted: { daily: formatCO2(dailyKg), yearly: formatCO2(yearlyKg), budget: formatCO2(budget) } },
        { headers: CORS_HEADERS }
      );
    }

    if (action === "activity") {
      const { category, activity, quantity } = data;

      if (!category || !VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!activity || typeof activity !== "string") {
        return NextResponse.json(
          { error: "activity is required and must be a string" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (typeof quantity !== "number" || quantity <= 0) {
        return NextResponse.json(
          { error: "quantity must be a positive number" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const co2Kg = calculateActivityEmission(category, activity, quantity);
      const equivalent = `Equivalent to driving ${(co2Kg / 0.21).toFixed(1)} km`;

      return NextResponse.json(
        { co2Kg, formatted: formatCO2(co2Kg), equivalent },
        { headers: CORS_HEADERS }
      );
    }

    if (action === "whatif") {
      const { currentLifestyle, change } = data;

      if (!validateLifestyle(currentLifestyle)) {
        return NextResponse.json(
          { error: "Invalid currentLifestyle data" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (!change || typeof change !== "object") {
        return NextResponse.json(
          { error: "change must be a partial lifestyle object" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const result = calculateWhatIf(currentLifestyle, change);

      return NextResponse.json(
        {
          currentDaily: result.currentDaily,
          projectedDaily: result.projectedDaily,
          savingsKg: Math.round((result.currentDaily - result.projectedDaily) * 100) / 100,
          savingsPercent: result.savingsPercent,
          formatted: {
            current: formatCO2(result.currentDaily),
            projected: formatCO2(result.projectedDaily),
            savings: formatCO2(result.currentDaily - result.projectedDaily),
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // Defensive fallback: should be unreachable given the action whitelist above,
    // but guarantees the handler always returns a NextResponse.
    return NextResponse.json(
      { error: "Unhandled action" },
      { status: 500, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[api/calculate] error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
