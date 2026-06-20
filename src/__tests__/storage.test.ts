import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getProfile,
  saveProfile,
  getEntries,
  addEntry,
  generateId,
  clearAllData,
  getTodayBudget,
  updateGarden,
  getChatHistory,
} from "@/lib/storage";
import { calculateDailyBudget } from "@/lib/carbon-calculator";
import { UserProfile, CarbonEntry } from "@/types";

const mockProfile: UserProfile = {
  id: "test-123",
  name: "Test User",
  createdAt: "2024-01-01T00:00:00.000Z",
  lifestyle: {
    transport: "public",
    diet: "balanced",
    homeEnergy: "medium",
    shopping: "moderate",
    homeSize: "apartment",
  },
  garden: {
    trees: 0,
    flowers: 3,
    health: 80,
    level: 1,
    lastWatered: "2024-01-01",
  },
  streak: 5,
  totalCO2Saved: 12.5,
};

const mockEntry: CarbonEntry = {
  id: "entry-1",
  date: "2024-01-15",
  category: "transport",
  activity: "drive-car",
  co2Kg: 2.1,
  isReduction: false,
};

beforeEach(() => {
  localStorage.clear();
});

describe("getProfile", () => {
  it("returns null when empty", () => {
    expect(getProfile()).toBeNull();
  });
});

describe("saveProfile + getProfile", () => {
  it("round-trips a profile correctly", () => {
    saveProfile(mockProfile);
    const retrieved = getProfile();
    expect(retrieved).toEqual(mockProfile);
  });

  it("overwrites existing profile", () => {
    saveProfile(mockProfile);
    const updated = { ...mockProfile, name: "Updated User" };
    saveProfile(updated);
    expect(getProfile()?.name).toBe("Updated User");
  });
});

describe("addEntry + getEntries", () => {
  it("returns empty array when no entries", () => {
    expect(getEntries()).toEqual([]);
  });

  it("adds and retrieves an entry", () => {
    addEntry(mockEntry);
    const entries = getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(mockEntry);
  });

  it("accumulates multiple entries", () => {
    addEntry(mockEntry);
    addEntry({ ...mockEntry, id: "entry-2", co2Kg: 3.5 });
    const entries = getEntries();
    expect(entries).toHaveLength(2);
  });
});

describe("generateId", () => {
  it("returns a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("returns unique strings", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("contains a timestamp component", () => {
    const id = generateId();
    const timestamp = parseInt(id.split("-")[0], 10);
    expect(timestamp).toBeGreaterThan(0);
  });
});

describe("clearAllData", () => {
  it("removes profile", () => {
    saveProfile(mockProfile);
    clearAllData();
    expect(getProfile()).toBeNull();
  });

  it("removes entries", () => {
    addEntry(mockEntry);
    clearAllData();
    expect(getEntries()).toEqual([]);
  });

  it("removes everything in one call", () => {
    saveProfile(mockProfile);
    addEntry(mockEntry);
    clearAllData();
    expect(getProfile()).toBeNull();
    expect(getEntries()).toEqual([]);
  });
});

// Helpers shared by date-sensitive tests
const STORAGE_KEY = "carbonwise_profile";
const ENTRIES_KEY = "carbonwise_entries";
const CHAT_KEY = "carbonwise_chat";

describe("malformed JSON in localStorage", () => {
  it("getProfile returns null for invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getProfile()).toBeNull();
  });

  it("getProfile returns null for stored 'null'", () => {
    localStorage.setItem(STORAGE_KEY, "null");
    expect(getProfile()).toBeNull();
  });

  it("getProfile returns null when payload is a bare string", () => {
    localStorage.setItem(STORAGE_KEY, '"just a string"');
    expect(getProfile()).toBeNull();
  });

  it("getEntries returns [] for invalid JSON", () => {
    localStorage.setItem(ENTRIES_KEY, "{not json");
    expect(getEntries()).toEqual([]);
  });

  it("getEntries returns [] when payload is not an array", () => {
    localStorage.setItem(ENTRIES_KEY, '{"not":"an array"}');
    expect(getEntries()).toEqual([]);
  });

  it("getChatHistory returns [] for invalid JSON", () => {
    localStorage.setItem(CHAT_KEY, "{not json");
    expect(getChatHistory()).toEqual([]);
  });

  it("getChatHistory returns [] when payload is not an array", () => {
    localStorage.setItem(CHAT_KEY, '"a string"');
    expect(getChatHistory()).toEqual([]);
  });

  it("strips __proto__ from a tampered profile payload", () => {
    localStorage.setItem(
      STORAGE_KEY,
      '{"id":"x","name":"y","__proto__":{"polluted":true}}'
    );
    const p = getProfile() as Record<string, unknown> | null;
    expect(p).not.toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(p, "__proto__")).toBe(false);
  });
});

describe("getTodayBudget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("only sums entries dated today", () => {
    addEntry({ ...mockEntry, id: "y", date: "2024-06-14", co2Kg: 5.0 });
    addEntry({ ...mockEntry, id: "t", date: "2024-06-15", co2Kg: 2.0 });
    addEntry({ ...mockEntry, id: "tm", date: "2024-06-16", co2Kg: 9.0 });
    const b = getTodayBudget(mockProfile);
    expect(b.date).toBe("2024-06-15");
    expect(b.usedKg).toBe(2.0);
    expect(b.entries).toHaveLength(1);
  });

  it("subtracts isReduction entries from usedKg", () => {
    addEntry({ ...mockEntry, id: "a", date: "2024-06-15", co2Kg: 4.0, isReduction: false });
    addEntry({ ...mockEntry, id: "b", date: "2024-06-15", co2Kg: 1.5, isReduction: true });
    const b = getTodayBudget(mockProfile);
    expect(b.usedKg).toBeCloseTo(2.5, 5);
  });

  it("clamps net-negative usage to 0", () => {
    addEntry({ ...mockEntry, id: "a", date: "2024-06-15", co2Kg: 1.0, isReduction: false });
    addEntry({ ...mockEntry, id: "b", date: "2024-06-15", co2Kg: 5.0, isReduction: true });
    const b = getTodayBudget(mockProfile);
    expect(b.usedKg).toBe(0);
  });

  it("budgetKg matches calculateDailyBudget(profile.lifestyle)", () => {
    const b = getTodayBudget(mockProfile);
    expect(b.budgetKg).toBe(calculateDailyBudget(mockProfile.lifestyle));
  });
});

describe("updateGarden", () => {
  const TODAY = "2024-06-15";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function profileWith(garden: Partial<UserProfile["garden"]> = {}): UserProfile {
    return {
      ...mockProfile,
      garden: {
        trees: 0,
        flowers: 0,
        health: 50,
        level: 1,
        lastWatered: "2024-06-14",
        ...garden,
      },
    };
  }

  it("under-budget (ratio between 0.7 and 1.0) grows health by 5 and adds 1 flower", () => {
    const profile = profileWith();
    const budget = calculateDailyBudget(profile.lifestyle);
    // ratio ~ 0.8 -> falls in (0.7, 1.0]
    addEntry({ ...mockEntry, id: "u1", date: TODAY, co2Kg: budget * 0.8 });
    const g = updateGarden(profile);
    expect(g.health).toBe(55);
    expect(g.flowers).toBe(1);
    expect(g.lastWatered).toBe(TODAY);
  });

  it("ratio <= 0.7 awards 2 flowers", () => {
    const profile = profileWith();
    const budget = calculateDailyBudget(profile.lifestyle);
    addEntry({ ...mockEntry, id: "u2", date: TODAY, co2Kg: budget * 0.5 });
    const g = updateGarden(profile);
    expect(g.flowers).toBe(2);
  });

  it("over-budget reduces health by 3 and does not add flowers", () => {
    const profile = profileWith({ health: 50, flowers: 4 });
    const budget = calculateDailyBudget(profile.lifestyle);
    addEntry({ ...mockEntry, id: "u3", date: TODAY, co2Kg: budget * 1.5 });
    const g = updateGarden(profile);
    expect(g.health).toBe(47);
    expect(g.flowers).toBe(4);
  });

  it("flowers >= 10 promotes to a tree, decrements flowers by 10, and increments level", () => {
    const profile = profileWith({ flowers: 9, trees: 0, level: 1 });
    const budget = calculateDailyBudget(profile.lifestyle);
    // ratio <= 0.7 -> +2 flowers -> 11 -> tree
    addEntry({ ...mockEntry, id: "u4", date: TODAY, co2Kg: budget * 0.5 });
    const g = updateGarden(profile);
    expect(g.trees).toBe(1);
    expect(g.flowers).toBe(1);
    expect(g.level).toBe(2);
  });

  it("is a no-op when called twice on the same day", () => {
    const profile = profileWith();
    const budget = calculateDailyBudget(profile.lifestyle);
    addEntry({ ...mockEntry, id: "u5", date: TODAY, co2Kg: budget * 0.5 });
    const first = updateGarden(profile);
    const second = updateGarden({ ...profile, garden: first });
    expect(second).toEqual(first);
  });

  it("clamps health at 100 when under budget", () => {
    const profile = profileWith({ health: 98 });
    const budget = calculateDailyBudget(profile.lifestyle);
    addEntry({ ...mockEntry, id: "u6", date: TODAY, co2Kg: budget * 0.5 });
    const g = updateGarden(profile);
    expect(g.health).toBe(100);
  });

  it("clamps health at 0 when far over budget", () => {
    const profile = profileWith({ health: 2 });
    const budget = calculateDailyBudget(profile.lifestyle);
    addEntry({ ...mockEntry, id: "u7", date: TODAY, co2Kg: budget * 5 });
    const g = updateGarden(profile);
    expect(g.health).toBe(0);
  });
});
