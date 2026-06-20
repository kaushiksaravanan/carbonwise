export interface UserProfile {
  id: string;
  name: string;
  createdAt: string;
  lifestyle: LifestyleData;
  garden: GardenState;
  streak: number;
  totalCO2Saved: number;
}

export const TRANSPORT_OPTIONS = ["car", "public", "bike", "walk", "mixed"] as const;
export const DIET_OPTIONS = ["meat-heavy", "balanced", "vegetarian", "vegan"] as const;
export const HOME_ENERGY_OPTIONS = ["high", "medium", "low"] as const;
export const SHOPPING_OPTIONS = ["frequent", "moderate", "minimal"] as const;
export const HOME_SIZE_OPTIONS = ["apartment", "small-house", "large-house"] as const;

export type Transport = (typeof TRANSPORT_OPTIONS)[number];
export type Diet = (typeof DIET_OPTIONS)[number];
export type HomeEnergy = (typeof HOME_ENERGY_OPTIONS)[number];
export type Shopping = (typeof SHOPPING_OPTIONS)[number];
export type HomeSize = (typeof HOME_SIZE_OPTIONS)[number];

export interface LifestyleData {
  transport: Transport;
  diet: Diet;
  homeEnergy: HomeEnergy;
  shopping: Shopping;
  homeSize: HomeSize;
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
