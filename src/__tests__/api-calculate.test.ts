import { describe, it, expect } from "vitest";
import {
  calculateDailyBaseline,
  calculateDailyBudget,
  calculateActivityEmission,
  calculateWhatIf,
} from "@/lib/carbon-calculator";
import { LifestyleData } from "@/types";

const testLifestyle: LifestyleData = {
  transport: "car",
  diet: "meat-heavy",
  homeEnergy: "high",
  shopping: "frequent",
  homeSize: "large-house",
};

describe("baseline calculation", () => {
  it("returns a positive number", () => {
    const result = calculateDailyBaseline(testLifestyle);
    expect(result).toBeGreaterThan(0);
  });

  it("returns a finite number", () => {
    const result = calculateDailyBaseline(testLifestyle);
    expect(Number.isFinite(result)).toBe(true);
  });

  it("budget is less than baseline", () => {
    const baseline = calculateDailyBaseline(testLifestyle);
    const budget = calculateDailyBudget(testLifestyle);
    expect(budget).toBeLessThan(baseline);
    expect(budget).toBeGreaterThan(0);
  });

  it("returns correct structure for API response shape", () => {
    const baseline = calculateDailyBaseline(testLifestyle);
    const budget = calculateDailyBudget(testLifestyle);
    const response = { baseline, budget, lifestyle: testLifestyle };
    expect(response).toHaveProperty("baseline");
    expect(response).toHaveProperty("budget");
    expect(response).toHaveProperty("lifestyle");
    expect(typeof response.baseline).toBe("number");
    expect(typeof response.budget).toBe("number");
  });
});

describe("activity calculation", () => {
  it("drive-car at 10km returns 2.1", () => {
    const emission = calculateActivityEmission("transport", "drive-car", 10);
    expect(emission).toBe(2.1);
  });

  it("take-bus at 20km returns correct value", () => {
    const emission = calculateActivityEmission("transport", "take-bus", 20);
    expect(emission).toBe(1.78);
  });

  it("meal-vegan returns 0.7 per meal", () => {
    const emission = calculateActivityEmission("food", "meal-vegan", 1);
    expect(emission).toBe(0.7);
  });

  it("returns correct structure for API response shape", () => {
    const emission = calculateActivityEmission("transport", "drive-car", 10);
    const response = {
      category: "transport",
      activity: "drive-car",
      quantity: 10,
      co2Kg: emission,
    };
    expect(response).toHaveProperty("category");
    expect(response).toHaveProperty("activity");
    expect(response).toHaveProperty("quantity");
    expect(response).toHaveProperty("co2Kg");
    expect(response.co2Kg).toBe(2.1);
  });
});

describe("whatif calculation", () => {
  it("shows improvement when switching from car to bike", () => {
    const result = calculateWhatIf(testLifestyle, { transport: "bike" });
    expect(result.savingsPercent).toBeGreaterThan(0);
    expect(result.projectedDaily).toBeLessThan(result.currentDaily);
  });

  it("shows improvement when switching to vegan diet", () => {
    const result = calculateWhatIf(testLifestyle, { diet: "vegan" });
    expect(result.savingsPercent).toBeGreaterThan(0);
  });

  it("returns correct structure for API response shape", () => {
    const result = calculateWhatIf(testLifestyle, { transport: "public" });
    expect(result).toHaveProperty("currentDaily");
    expect(result).toHaveProperty("projectedDaily");
    expect(result).toHaveProperty("savingsPercent");
    expect(typeof result.currentDaily).toBe("number");
    expect(typeof result.projectedDaily).toBe("number");
    expect(typeof result.savingsPercent).toBe("number");
  });

  it("multiple changes compound savings", () => {
    const singleChange = calculateWhatIf(testLifestyle, { transport: "bike" });
    const multiChange = calculateWhatIf(testLifestyle, {
      transport: "bike",
      diet: "vegan",
    });
    expect(multiChange.savingsPercent).toBeGreaterThan(singleChange.savingsPercent);
  });
});
