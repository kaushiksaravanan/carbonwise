import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CarbonBudget from "@/components/CarbonBudget";

describe("CarbonBudget", () => {
  it("renders 0% and a 'good' visual state when usedKg=0", () => {
    render(<CarbonBudget budgetKg={10} usedKg={0} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("data-percent", "0");
    expect(meter).toHaveAttribute("data-state", "good");
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      "0% of daily budget used",
    );
    expect(screen.getByText("0.0 / 10.0")).toBeInTheDocument();
  });

  it("renders ~50% when usedKg is half the budget", () => {
    render(<CarbonBudget budgetKg={10} usedKg={5} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("data-percent", "50");
    expect(meter).toHaveAttribute("data-state", "good");
    expect(screen.getByText("5.0 / 10.0")).toBeInTheDocument();
  });

  it("renders a 'warning' visual state between 60% and 90%", () => {
    render(<CarbonBudget budgetKg={10} usedKg={7.5} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("data-percent", "75");
    expect(meter).toHaveAttribute("data-state", "warning");
  });

  it("renders an 'over' visual state and clamps to 100% when usedKg exceeds budget", () => {
    render(<CarbonBudget budgetKg={10} usedKg={12} />);
    const meter = screen.getByRole("meter");
    // Display percent is clamped to 100 for the visual ring
    expect(meter).toHaveAttribute("data-percent", "100");
    expect(meter).toHaveAttribute("data-state", "over");
    expect(screen.getByText("12.0 / 10.0")).toBeInTheDocument();
  });

  it("does not produce NaN/Infinity when budgetKg is 0", () => {
    const { container } = render(<CarbonBudget budgetKg={0} usedKg={5} />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/NaN/);
    expect(html).not.toMatch(/Infinity/);

    const meter = screen.getByRole("meter");
    const percentAttr = meter.getAttribute("data-percent") ?? "";
    expect(Number.isFinite(Number(percentAttr))).toBe(true);
    // With no budget defined, any usage is treated as 100% (over)
    expect(meter).toHaveAttribute("data-state", "over");
  });

  it("does not produce NaN/Infinity when both budgetKg and usedKg are 0", () => {
    const { container } = render(<CarbonBudget budgetKg={0} usedKg={0} />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/NaN/);
    expect(html).not.toMatch(/Infinity/);

    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("data-percent", "0");
    expect(meter).toHaveAttribute("data-state", "good");
  });

  it("keeps the rendered percent label consistent with the underlying value (no drift)", () => {
    // Catches drift between the percent label/state and the progress ring's value.
    render(<CarbonBudget budgetKg={20} usedKg={9} />);
    const meter = screen.getByRole("meter");
    const dataPercent = Number(meter.getAttribute("data-percent"));
    const valueText = meter.getAttribute("aria-valuetext") ?? "";

    // Both render paths should agree on the same percent.
    expect(valueText).toContain(`${dataPercent}%`);
    expect(dataPercent).toBe(45);
  });

  it("uses WCAG AA-compliant text color shades (-700) for status text", () => {
    // good
    const { rerender, container } = render(
      <CarbonBudget budgetKg={10} usedKg={1} />,
    );
    expect(container.querySelector(".text-green-700")).not.toBeNull();
    expect(container.querySelector(".text-green-600")).toBeNull();

    // warning
    rerender(<CarbonBudget budgetKg={10} usedKg={7} />);
    expect(container.querySelector(".text-yellow-700")).not.toBeNull();
    expect(container.querySelector(".text-yellow-600")).toBeNull();

    // over
    rerender(<CarbonBudget budgetKg={10} usedKg={11} />);
    expect(container.querySelector(".text-red-700")).not.toBeNull();
    expect(container.querySelector(".text-red-600")).toBeNull();
  });
});
