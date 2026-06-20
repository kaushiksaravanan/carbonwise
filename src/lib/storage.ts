import { UserProfile, CarbonEntry, DailyBudget, GardenState } from "@/types";

const STORAGE_KEY = "carbonwise_profile";
const ENTRIES_KEY = "carbonwise_entries";
const CHAT_KEY = "carbonwise_chat";

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getEntries(): CarbonEntry[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ENTRIES_KEY);
  return data ? JSON.parse(data) : [];
}

export function addEntry(entry: CarbonEntry): void {
  const entries = getEntries();
  entries.push(entry);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function getTodayBudget(profile: UserProfile): DailyBudget {
  const today = new Date().toISOString().split("T")[0];
  const entries = getEntries().filter((e) => e.date === today);
  const usedKg = entries.reduce((sum, e) => sum + (e.isReduction ? -e.co2Kg : e.co2Kg), 0);

  const { calculateDailyBudget } = require("./carbon-calculator");
  const budgetKg = calculateDailyBudget(profile.lifestyle);

  return { date: today, budgetKg, usedKg: Math.max(0, usedKg), entries };
}

export function updateGarden(profile: UserProfile): GardenState {
  const garden = { ...profile.garden };
  const today = new Date().toISOString().split("T")[0];

  if (garden.lastWatered !== today) {
    const budget = getTodayBudget(profile);
    const ratio = budget.usedKg / budget.budgetKg;

    if (ratio <= 1.0) {
      // Under budget — garden grows
      garden.health = Math.min(100, garden.health + 5);
      garden.flowers += ratio <= 0.7 ? 2 : 1;
      if (garden.flowers >= 10) {
        garden.trees += 1;
        garden.flowers -= 10;
        garden.level += 1;
      }
    } else {
      // Over budget — garden wilts slightly
      garden.health = Math.max(0, garden.health - 3);
    }
    garden.lastWatered = today;
  }

  return garden;
}

export function getChatHistory(): Array<{ role: string; content: string }> {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CHAT_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveChatHistory(messages: Array<{ role: string; content: string }>): void {
  // Keep last 50 messages to avoid localStorage bloat
  const trimmed = messages.slice(-50);
  localStorage.setItem(CHAT_KEY, JSON.stringify(trimmed));
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ENTRIES_KEY);
  localStorage.removeItem(CHAT_KEY);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
