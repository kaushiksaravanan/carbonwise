export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
  lifestyle: LifestyleData;
  garden: GardenState;
  streak: number;
  totalCO2Saved: number;
}

export interface LifestyleData {
  transport: "car" | "public" | "bike" | "walk" | "mixed";
  diet: "meat-heavy" | "balanced" | "vegetarian" | "vegan";
  homeEnergy: "high" | "medium" | "low";
  shopping: "frequent" | "moderate" | "minimal";
  homeSize: "apartment" | "small-house" | "large-house";
}

export interface CarbonEntry {
  id: string;
  date: string;
  category: CarbonCategory;
  activity: string;
  co2Kg: number;
  isReduction: boolean;
}

export type CarbonCategory = "transport" | "food" | "energy" | "shopping" | "other";

export interface DailyBudget {
  date: string;
  budgetKg: number;
  usedKg: number;
  entries: CarbonEntry[];
}

export interface GardenState {
  trees: number;
  flowers: number;
  health: number; // 0-100
  level: number;
  lastWatered: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface WhatIfScenario {
  id: string;
  description: string;
  currentCO2Kg: number;
  projectedCO2Kg: number;
  savingsKg: number;
  savingsPercent: number;
  timeframe: "weekly" | "monthly" | "yearly";
}

export interface WeeklyInsight {
  weekStart: string;
  totalEmissions: number;
  topCategory: CarbonCategory;
  improvement: number;
  suggestion: string;
  gardenGrowth: number;
}
