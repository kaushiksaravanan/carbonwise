import { describe, it, expect, beforeEach } from "vitest";
import {
  getProfile,
  saveProfile,
  getEntries,
  addEntry,
  generateId,
  clearAllData,
} from "@/lib/storage";
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
