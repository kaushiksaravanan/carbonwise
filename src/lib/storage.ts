import { UserProfile, CarbonEntry, DailyBudget, GardenState } from "@/types";
import { calculateDailyBudget } from "./carbon-calculator";

const STORAGE_KEY = "carbonwise_profile";
const ENTRIES_KEY = "carbonwise_entries";
const CHAT_KEY = "carbonwise_chat";

// Safely parse JSON from localStorage. Returns the fallback when:
// - the key is missing
// - the stored payload is malformed JSON
// - the parsed value contains a `__proto__` or `constructor` key (basic
//   prototype-pollution guard)
// On parse failure the corrupted key is cleared so subsequent reads
// don't keep throwing/returning fallbacks for the same bad payload.
function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const data = localStorage.getItem(key);
  if (data === null) return fallback;
  try {
    const parsed = JSON.parse(data, (k, v) => {
      if (k === "__proto__" || k === "constructor") return undefined;
      return v;
    });
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch {
    // Corrupted/tampered payload — clear it so we don't keep tripping over it.
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore — storage may be unavailable
    }
    return fallback;
  }
}

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const parsed = safeParse<UserProfile | null>(STORAGE_KEY, null);
  // Reject non-object payloads (e.g. localStorage holding `"string"` or `42`)
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getEntries(): CarbonEntry[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<CarbonEntry[]>(ENTRIES_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed;
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

export function getChatHistory(): Array<{ role: string; content: string; timestamp?: string }> {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<Array<{ role: string; content: string; timestamp?: string }>>(CHAT_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed;
}

export function saveChatHistory(messages: Array<{ role: string; content: string; timestamp?: string }>): void {
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
