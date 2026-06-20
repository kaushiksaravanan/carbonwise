import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import OnboardingQuiz from "@/components/OnboardingQuiz";
import {
  TRANSPORT_OPTIONS,
  DIET_OPTIONS,
  HOME_ENERGY_OPTIONS,
  SHOPPING_OPTIONS,
  HOME_SIZE_OPTIONS,
} from "@/types";

// The VALID_* arrays the calculate route validates against. Using the same
// constants here means this test breaks the moment the quiz produces a value
// outside the validated set.
const VALID = {
  transport: TRANSPORT_OPTIONS as readonly string[],
  diet: DIET_OPTIONS as readonly string[],
  homeEnergy: HOME_ENERGY_OPTIONS as readonly string[],
  shopping: SHOPPING_OPTIONS as readonly string[],
  homeSize: HOME_SIZE_OPTIONS as readonly string[],
};

const REQUIRED_KEYS = [
  "transport",
  "diet",
  "homeEnergy",
  "shopping",
  "homeSize",
] as const;

// Five questions × first option each — chosen so we end up with answers we can
// check against the same VALID_* arrays the API uses.
const expectedFirstAnswers = {
  transport: "car",
  diet: "meat-heavy",
  homeEnergy: "high",
  shopping: "frequent",
  homeSize: "apartment",
} as const;

function clickNext() {
  const next = screen.getByRole("button", { name: /next|reveal my carbon twin/i });
  fireEvent.click(next);
}

function clickBack() {
  fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
}

describe("OnboardingQuiz", () => {
  beforeEach(() => {
    // Stub fetch so the Carbon Twin generator returns a deterministic response
    // and never hits the network during tests.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            species: "Test Species",
            flavor: "A test twin.",
            seed: 42,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("requires a selection before Next is enabled and produces a valid LifestyleData", async () => {
    const onComplete = vi.fn();
    render(<OnboardingQuiz onComplete={onComplete} />);

    // Initially Next is disabled — user must select an option first.
    const next = screen.getByRole("button", { name: /next/i });
    expect(next).toBeDisabled();

    // Click through each question selecting the first option.
    for (let i = 0; i < REQUIRED_KEYS.length; i++) {
      // The first option is whatever the quiz renders first for this question.
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);
      // After selecting, Next becomes enabled.
      const action = screen.getByRole("button", {
        name: /next|reveal my carbon twin/i,
      });
      expect(action).not.toBeDisabled();
      await act(async () => {
        fireEvent.click(action);
      });
    }

    // Carbon Twin reveal should appear; click "Plant my first tree" to finish.
    const finish = await screen.findByRole("button", {
      name: /plant my first tree/i,
    });
    fireEvent.click(finish);

    expect(onComplete).toHaveBeenCalledTimes(1);
    const arg = onComplete.mock.calls[0][0];

    // Keys are exactly the five LifestyleData keys.
    expect(Object.keys(arg).sort()).toEqual([...REQUIRED_KEYS].sort());

    // Each value is a member of the same VALID_* array the calculate route
    // checks against, AND matches the first option we clicked.
    for (const key of REQUIRED_KEYS) {
      expect(VALID[key]).toContain(arg[key]);
      expect(arg[key]).toBe(expectedFirstAnswers[key]);
    }
  });

  it("does not auto-advance after a selection (screen readers and motion-sensitive users)", async () => {
    const onComplete = vi.fn();
    render(<OnboardingQuiz onComplete={onComplete} />);

    // Select an answer for question 1 then wait — we should still be on Q1.
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]);

    // Give any stray timers a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Still on the first question (5 transport options visible).
    expect(screen.getByText(/1 of 5/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(
      VALID.transport.length,
    );
  });

  it("preserves answers when navigating Back and Forward", async () => {
    const onComplete = vi.fn();
    render(<OnboardingQuiz onComplete={onComplete} />);

    // Q1: pick the second transport option ("public") then advance.
    const q1Radios = screen.getAllByRole("radio");
    fireEvent.click(q1Radios[1]);
    expect(q1Radios[1]).toHaveAttribute("aria-checked", "true");
    await act(async () => clickNext());

    // Q2: now on diet question — pick first option then go Back.
    const q2Radios = screen.getAllByRole("radio");
    expect(q2Radios).toHaveLength(VALID.diet.length);
    fireEvent.click(q2Radios[0]);
    await act(async () => clickBack());

    // Back on Q1 — the second option should still be marked checked.
    const q1Again = screen.getAllByRole("radio");
    expect(q1Again).toHaveLength(VALID.transport.length);
    expect(q1Again[1]).toHaveAttribute("aria-checked", "true");

    // Forward again — Q2's previous selection should also be preserved.
    await act(async () => clickNext());
    const q2Again = screen.getAllByRole("radio");
    expect(q2Again[0]).toHaveAttribute("aria-checked", "true");
  });

  it("Back is visible (and disabled) on the first question for predictable navigation", () => {
    render(<OnboardingQuiz onComplete={vi.fn()} />);
    const back = screen.getByRole("button", { name: /^back$/i });
    expect(back).toBeInTheDocument();
    expect(back).toBeDisabled();
  });

  it("announces the active question via a polite live region", async () => {
    render(<OnboardingQuiz onComplete={vi.fn()} />);
    // The live region is rendered up-front; once we advance, it should contain
    // the new question's label.
    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]);
    await act(async () => clickNext());

    await waitFor(() => {
      const status = document.querySelector('[role="status"]');
      expect(status?.textContent ?? "").toMatch(/Question 2 of 5/);
    });
  });

  it("falls back to a local Carbon Twin when the twin API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );

    const onComplete = vi.fn();
    render(<OnboardingQuiz onComplete={onComplete} />);

    for (let i = 0; i < REQUIRED_KEYS.length; i++) {
      const radios = screen.getAllByRole("radio");
      fireEvent.click(radios[0]);
      await act(async () => clickNext());
    }

    // Reveal still appears even though the API call failed.
    const reveal = await screen.findByTestId("carbon-twin-reveal");
    expect(reveal).toBeInTheDocument();

    // And the twin was cached in localStorage so other surfaces can render it.
    const cached = window.localStorage.getItem("carbonwise.carbonTwin");
    expect(cached).toBeTruthy();
    const parsed = JSON.parse(cached as string);
    expect(typeof parsed.species).toBe("string");
    expect(typeof parsed.flavor).toBe("string");
    expect(Number.isFinite(parsed.seed)).toBe(true);
  });
});
