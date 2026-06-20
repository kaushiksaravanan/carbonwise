import { LifestyleData, CarbonCategory } from "@/types";

// Emission factors in kg CO2e per unit (sourced from EPA, DEFRA, and IPCC)
const EMISSION_FACTORS = {
  transport: {
    car: 0.21, // kg CO2 per km
    public: 0.089,
    bike: 0.0,
    walk: 0.0,
    mixed: 0.12,
  },
  food: {
    "meat-heavy": 7.2, // kg CO2 per day
    balanced: 5.0,
    vegetarian: 3.8,
    vegan: 2.9,
  },
  energy: {
    high: 18.0, // kg CO2 per day (large home, high usage)
    medium: 11.0,
    low: 6.5,
  },
  shopping: {
    frequent: 8.5, // kg CO2 per day (fast fashion, gadgets)
    moderate: 4.2,
    minimal: 1.8,
  },
} as const;

// Per-activity emission factors used by calculateActivityEmission.
// NOTE: units differ per row — see the comment next to each group. These intentionally
// have a finer granularity than EMISSION_FACTORS above (which models whole-day lifestyle
// averages). Keep both tables in sync when adjusting shared rates (e.g. transport.car
// vs drive-car are both per-km and should match).
const ACTIVITY_FACTORS: Record<string, number> = {
  // Transport — kg CO2 per km
  "drive-car": 0.21,
  "take-bus": 0.089,
  "take-train": 0.041,
  "ride-bike": 0.0,
  "walk": 0.0,
  "fly-domestic": 0.255,
  "fly-international": 0.195,
  // Food — kg CO2 per meal
  "meal-beef": 6.6,
  "meal-chicken": 2.3,
  "meal-fish": 1.8,
  "meal-vegetarian": 1.0,
  "meal-vegan": 0.7,
  // Energy — kg CO2 per hour
  "heating": 1.5,
  "cooling": 1.2,
  "electronics": 0.05,
  "laundry": 0.6,
  // Shopping — kg CO2 per item
  "clothing-new": 8.0,
  "clothing-secondhand": 0.5,
  "electronics-new": 50.0,
  "groceries": 0.8,
} as const;

// Average daily CO2 per person globally: ~13.1 kg (World Bank 2023 data for India: ~5.2 kg)
const GLOBAL_AVERAGE_DAILY_KG = 13.1;
const INDIA_AVERAGE_DAILY_KG = 5.2;

export function calculateDailyBaseline(lifestyle: LifestyleData): number {
  const transport = EMISSION_FACTORS.transport[lifestyle.transport] * 15; // assume 15km/day
  const food = EMISSION_FACTORS.food[lifestyle.diet];
  const energy = EMISSION_FACTORS.energy[lifestyle.homeEnergy];
  const shopping = EMISSION_FACTORS.shopping[lifestyle.shopping];

  return Math.round((transport + food + energy + shopping) * 100) / 100;
}

export function calculateDailyBudget(lifestyle: LifestyleData): number {
  const baseline = calculateDailyBaseline(lifestyle);
  // Budget is 80% of baseline — a realistic 20% reduction target
  return Math.round(baseline * 0.8 * 100) / 100;
}

export function calculateActivityEmission(
  category: CarbonCategory,
  activity: string,
  quantity: number
): number {
  const factor = ACTIVITY_FACTORS[activity] ?? 1.0;
  return Math.round(factor * quantity * 100) / 100;
}

export function getReductionSuggestions(lifestyle: LifestyleData): string[] {
  const suggestions: string[] = [];

  if (lifestyle.transport === "car" || lifestyle.transport === "mixed") {
    suggestions.push("Switch one car trip per week to public transport (-2.1 kg CO2)");
    suggestions.push("Try cycling for trips under 5km (-1.0 kg CO2 each)");
  }
  if (lifestyle.diet === "meat-heavy" || lifestyle.diet === "balanced") {
    suggestions.push("Go meat-free one day per week (-3.4 kg CO2)");
    suggestions.push("Replace beef with chicken twice a week (-8.6 kg CO2)");
  }
  if (lifestyle.homeEnergy === "high") {
    suggestions.push("Reduce heating/cooling by 2 degrees (-2.5 kg CO2/day)");
    suggestions.push("Switch to LED bulbs throughout your home (-0.5 kg CO2/day)");
  }
  if (lifestyle.shopping === "frequent") {
    suggestions.push("Try a no-buy week once a month (-60 kg CO2/month)");
    suggestions.push("Choose secondhand for your next clothing purchase (-7.5 kg CO2)");
  }

  return suggestions;
}

export function calculateWhatIf(
  currentLifestyle: LifestyleData,
  change: Partial<LifestyleData>
): { currentDaily: number; projectedDaily: number; savingsPercent: number } {
  const currentDaily = calculateDailyBaseline(currentLifestyle);
  const projectedDaily = calculateDailyBaseline({ ...currentLifestyle, ...change });
  const savingsPercent = Math.round(((currentDaily - projectedDaily) / currentDaily) * 100);

  return { currentDaily, projectedDaily, savingsPercent };
}

export function getCategoryColor(category: CarbonCategory): string {
  const colors: Record<CarbonCategory, string> = {
    transport: "#3b82f6",
    food: "#f59e0b",
    energy: "#ef4444",
    shopping: "#8b5cf6",
    other: "#6b7280",
  };
  return colors[category];
}

export function getCategoryIcon(category: CarbonCategory): string {
  const icons: Record<CarbonCategory, string> = {
    transport: "🚗",
    food: "🍽️",
    energy: "⚡",
    shopping: "🛍️",
    other: "📦",
  };
  return icons[category];
}

export function formatCO2(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  if (kg >= 1) return `${kg.toFixed(1)}kg`;
  return `${(kg * 1000).toFixed(0)}g`;
}

export { EMISSION_FACTORS, GLOBAL_AVERAGE_DAILY_KG, INDIA_AVERAGE_DAILY_KG };
