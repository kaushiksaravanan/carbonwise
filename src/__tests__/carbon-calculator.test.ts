import { describe, it, expect } from "vitest";
import {
  calculateDailyBaseline,
  calculateDailyBudget,
  calculateActivityEmission,
  getReductionSuggestions,
  calculateWhatIf,
  formatCO2,
  getCategoryColor,
  getCategoryIcon,
} from "@/lib/carbon-calculator";
import { LifestyleData } from "@/types";

const highLifestyle: LifestyleData = {
  transport: "car",
  diet: "meat-heavy",
  homeEnergy: "high",
  shopping: "frequent",
  homeSize: "large-house",
};

const lowLifestyle: LifestyleData = {
  transport: "walk",
  diet: "vegan",
  homeEnergy: "low",
  shopping: "minimal",
  homeSize: "apartment",
};

const midLifestyle: LifestyleData = {
  transport: "public",
  diet: "balanced",
  homeEnergy: "medium",
  shopping: "moderate",
  homeSize: "small-house",
};

describe("calculateDailyBaseline", () => {
  it("returns highest baseline for car/meat-heavy/high/frequent", () => {
    const high = calculateDailyBaseline(highLifestyle);
    const low = calculateDailyBaseline(lowLifestyle);
    expect(high).toBeGreaterThan(low);
  });

  it("returns lowest baseline for walk/vegan/low/minimal", () => {
    const low = calculateDailyBaseline(lowLifestyle);
    const mid = calculateDailyBaseline(midLifestyle);
    expect(low).toBeLessThan(mid);
  });

  it("returns a positive number", () => {
    expect(calculateDailyBaseline(midLifestyle)).toBeGreaterThan(0);
  });

  it("computes expected value for high lifestyle", () => {
    const transport = 0.21 * 15;
    const food = 7.2;
    const energy = 18.0;
    const shopping = 8.5;
    const expected = Math.round((transport + food + energy + shopping) * 100) / 100;
    expect(calculateDailyBaseline(highLifestyle)).toBe(expected);
  });
});

describe("calculateDailyBudget", () => {
  it("returns 80% of baseline", () => {
    const baseline = calculateDailyBaseline(midLifestyle);
    const budget = calculateDailyBudget(midLifestyle);
    expect(budget).toBe(Math.round(baseline * 0.8 * 100) / 100);
  });

  it("budget is less than baseline", () => {
    const baseline = calculateDailyBaseline(highLifestyle);
    const budget = calculateDailyBudget(highLifestyle);
    expect(budget).toBeLessThan(baseline);
  });
});

describe("calculateActivityEmission", () => {
  it("drive-car at 10km returns 2.1kg", () => {
    const result = calculateActivityEmission("transport", "drive-car", 10);
    expect(result).toBe(2.1);
  });

  it("walk returns zero emissions correctly", () => {
    const result = calculateActivityEmission("transport", "walk", 50);
    expect(result).toBe(0);
  });

  it("meal-beef at 1 meal returns 6.6kg", () => {
    const result = calculateActivityEmission("food", "meal-beef", 1);
    expect(result).toBe(6.6);
  });

  it("returns quantity * 1.0 for unknown activities", () => {
    const result = calculateActivityEmission("other", "unknown-activity", 5);
    expect(result).toBe(5.0);
  });

  it("returns quantity * 1.0 for completely made-up activity", () => {
    const result = calculateActivityEmission("transport", "teleportation", 3);
    expect(result).toBe(3.0);
  });
});

describe("getReductionSuggestions", () => {
  it("returns transport suggestions for car users", () => {
    const suggestions = getReductionSuggestions(highLifestyle);
    const hasTransport = suggestions.some(
      (s) => s.includes("car") || s.includes("cycling")
    );
    expect(hasTransport).toBe(true);
  });

  it("returns food suggestions for meat-heavy eaters", () => {
    const suggestions = getReductionSuggestions(highLifestyle);
    const hasFood = suggestions.some(
      (s) => s.includes("meat-free") || s.includes("beef")
    );
    expect(hasFood).toBe(true);
  });

  it("returns no transport suggestions for walkers", () => {
    const suggestions = getReductionSuggestions(lowLifestyle);
    const hasTransport = suggestions.some(
      (s) => s.includes("car") || s.includes("cycling")
    );
    expect(hasTransport).toBe(false);
  });

  it("returns energy suggestions for high energy users", () => {
    const suggestions = getReductionSuggestions(highLifestyle);
    const hasEnergy = suggestions.some(
      (s) => s.includes("heating") || s.includes("LED")
    );
    expect(hasEnergy).toBe(true);
  });

  it("returns shopping suggestions for frequent shoppers", () => {
    const suggestions = getReductionSuggestions(highLifestyle);
    const hasShopping = suggestions.some(
      (s) => s.includes("no-buy") || s.includes("secondhand")
    );
    expect(hasShopping).toBe(true);
  });
});

describe("calculateWhatIf", () => {
  it("shows savings when improving transport", () => {
    const result = calculateWhatIf(highLifestyle, { transport: "bike" });
    expect(result.savingsPercent).toBeGreaterThan(0);
    expect(result.projectedDaily).toBeLessThan(result.currentDaily);
  });

  it("shows savings when improving diet", () => {
    const result = calculateWhatIf(highLifestyle, { diet: "vegan" });
    expect(result.savingsPercent).toBeGreaterThan(0);
  });

  it("shows zero savings when no change", () => {
    const result = calculateWhatIf(highLifestyle, {});
    expect(result.savingsPercent).toBe(0);
    expect(result.currentDaily).toBe(result.projectedDaily);
  });

  it("returns correct structure", () => {
    const result = calculateWhatIf(midLifestyle, { diet: "vegan" });
    expect(result).toHaveProperty("currentDaily");
    expect(result).toHaveProperty("projectedDaily");
    expect(result).toHaveProperty("savingsPercent");
  });
});

describe("formatCO2", () => {
  it("formats grams for values under 1kg", () => {
    expect(formatCO2(0.5)).toBe("500g");
    expect(formatCO2(0.123)).toBe("123g");
  });

  it("formats kg for values between 1 and 999", () => {
    expect(formatCO2(5)).toBe("5.0kg");
    expect(formatCO2(12.34)).toBe("12.3kg");
  });

  it("formats tonnes for values 1000+", () => {
    expect(formatCO2(1000)).toBe("1.0t");
    expect(formatCO2(2500)).toBe("2.5t");
  });
});

describe("getCategoryColor", () => {
  it("returns valid hex color for transport", () => {
    expect(getCategoryColor("transport")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns valid hex color for food", () => {
    expect(getCategoryColor("food")).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns valid hex color for all categories", () => {
    const categories = ["transport", "food", "energy", "shopping", "other"] as const;
    categories.forEach((cat) => {
      expect(getCategoryColor(cat)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

describe("getCategoryIcon", () => {
  it("returns emoji for transport", () => {
    expect(getCategoryIcon("transport")).toBeTruthy();
    expect(getCategoryIcon("transport").length).toBeGreaterThan(0);
  });

  it("returns emoji for all categories", () => {
    const categories = ["transport", "food", "energy", "shopping", "other"] as const;
    categories.forEach((cat) => {
      expect(getCategoryIcon(cat)).toBeTruthy();
    });
  });

  it("returns different icons for different categories", () => {
    expect(getCategoryIcon("transport")).not.toBe(getCategoryIcon("food"));
    expect(getCategoryIcon("energy")).not.toBe(getCategoryIcon("shopping"));
  });
});
