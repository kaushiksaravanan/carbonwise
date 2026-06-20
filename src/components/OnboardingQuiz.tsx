'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { LifestyleData } from '@/types';

interface OnboardingQuizProps {
  onComplete: (lifestyle: LifestyleData) => void;
}

type QuestionKey = keyof LifestyleData;

interface Question {
  key: QuestionKey;
  label: string;
  options: { value: string; label: string }[];
}

export interface CarbonTwin {
  species: string;
  flavor: string;
  seed: number;
}

const questions: Question[] = [
  {
    key: 'transport',
    label: 'How do you usually get around?',
    options: [
      { value: 'car', label: 'Car' },
      { value: 'public', label: 'Public Transit' },
      { value: 'bike', label: 'Bike' },
      { value: 'walk', label: 'Walk' },
      { value: 'mixed', label: 'Mixed' },
    ],
  },
  {
    key: 'diet',
    label: "What's your diet like?",
    options: [
      { value: 'meat-heavy', label: 'Meat Heavy' },
      { value: 'balanced', label: 'Balanced' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
    ],
  },
  {
    key: 'homeEnergy',
    label: 'Home energy usage?',
    options: [
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping habits?',
    options: [
      { value: 'frequent', label: 'Frequent' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'minimal', label: 'Minimal' },
    ],
  },
  {
    key: 'homeSize',
    label: 'Home size?',
    options: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'small-house', label: 'Small House' },
      { value: 'large-house', label: 'Large House' },
    ],
  },
];

// Deterministic 32-bit hash of a string. Used to derive a stable seed for the
// Carbon Twin's signature tree shape (so every subsequent tree is a variation).
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Force unsigned 32-bit
  return hash >>> 0;
}

// Local fallback Carbon Twin generator — runs synchronously when the LLM call
// fails, when CipherStack is unreachable, or when no key is available. The
// goal is that the reveal moment ALWAYS works, even offline.
function fallbackCarbonTwin(lifestyle: LifestyleData): CarbonTwin {
  // Pick a genus that resonates with the dominant lifestyle dimensions.
  const genusByTransport: Record<string, string> = {
    car: 'Ferrum',
    public: 'Civica',
    bike: 'Veloxia',
    walk: 'Ambula',
    mixed: 'Pluvia',
  };
  const speciesByDiet: Record<string, string> = {
    'meat-heavy': 'Magnolia',
    balanced: 'Quercus',
    vegetarian: 'Salvia',
    vegan: 'Verbena',
  };

  const genus = genusByTransport[lifestyle.transport] ?? 'Pluvia';
  const species = speciesByDiet[lifestyle.diet] ?? 'Quercus';
  const fullName = `${genus} ${species}`;

  const flavorBits: string[] = [];
  if (lifestyle.homeSize === 'large-house') flavorBits.push('with sprawling roots');
  else if (lifestyle.homeSize === 'apartment') flavorBits.push('thriving in small spaces');
  else flavorBits.push('with steady, modest growth');

  if (lifestyle.homeEnergy === 'low') flavorBits.push('powered by sunlight alone');
  else if (lifestyle.homeEnergy === 'high') flavorBits.push('that dreams of cooler nights');

  if (lifestyle.shopping === 'minimal') flavorBits.push('content with what it has');

  const flavor = `A ${fullName.toLowerCase()} ${flavorBits.join(', ')}.`;

  return {
    species: fullName,
    flavor,
    seed: hashString(JSON.stringify(lifestyle)),
  };
}

// Try to generate a personalized Carbon Twin via Gemini (vended through
// CipherStack). Falls back to the local generator on any failure so the
// reveal moment is never blocked by a network hiccup.
async function generateCarbonTwin(
  lifestyle: LifestyleData,
  signal?: AbortSignal,
): Promise<CarbonTwin> {
  try {
    const res = await fetch('/api/twin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifestyle }),
      signal,
    });
    if (!res.ok) throw new Error(`twin api ${res.status}`);
    const json = (await res.json()) as Partial<CarbonTwin>;
    if (
      typeof json.species === 'string' &&
      typeof json.flavor === 'string' &&
      typeof json.seed === 'number' &&
      Number.isFinite(json.seed)
    ) {
      return json as CarbonTwin;
    }
    throw new Error('twin api returned invalid shape');
  } catch {
    return fallbackCarbonTwin(lifestyle);
  }
}

export default function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<LifestyleData>>({});
  const [twin, setTwin] = useState<CarbonTwin | null>(null);
  const [generating, setGenerating] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const firstOptionRef = useRef<HTMLButtonElement | null>(null);
  const revealHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const initialMountRef = useRef(true);

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;
  const currentValue = answers[current.key];

  const handleSelect = useCallback(
    (value: string) => {
      setAnswers((prev) => ({ ...prev, [current.key]: value }));
    },
    [current.key],
  );

  const handleNext = useCallback(async () => {
    if (!currentValue) return;
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    // Final step: generate the Carbon Twin reveal before completing.
    const finalAnswers = { ...answers } as LifestyleData;
    setGenerating(true);
    setAnnouncement('Generating your Carbon Twin');
    const result = await generateCarbonTwin(finalAnswers);
    setTwin(result);
    setGenerating(false);
    setAnnouncement(
      `Your Carbon Twin is ${result.species}. ${result.flavor}`,
    );
    // Persist the twin alongside the profile so other surfaces (Garden,
    // OG-image generator) can render the same species deterministically.
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'carbonwise.carbonTwin',
          JSON.stringify(result),
        );
      }
    } catch {
      // Non-fatal — storage may be disabled in some browsers.
    }
  }, [answers, currentValue, step]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleRevealContinue = useCallback(() => {
    if (!twin) return;
    onComplete(answers as LifestyleData);
  }, [answers, onComplete, twin]);

  // Move focus to the first option whenever the question changes (but not on
  // initial mount — that would steal focus from the page heading). Also push a
  // live-region announcement so screen readers know which question is active.
  useEffect(() => {
    if (twin) return; // reveal screen handles its own focus
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    setAnnouncement(
      `Question ${step + 1} of ${questions.length}: ${current.label}`,
    );
    firstOptionRef.current?.focus();
  }, [step, current.label, twin]);

  // Move focus to the reveal heading when the Carbon Twin appears.
  useEffect(() => {
    if (twin) {
      revealHeadingRef.current?.focus();
    }
  }, [twin]);

  // ------------------------- Carbon Twin reveal -------------------------
  if (twin) {
    return (
      <div className="mx-auto max-w-md">
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
        <div
          className="animate-fade-in rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 p-8 text-center shadow-lg"
          data-testid="carbon-twin-reveal"
        >
          <span className="mb-3 block text-5xl" aria-hidden="true">
            🌱
          </span>
          <p className="mb-1 text-sm uppercase tracking-wide text-green-700">
            Meet your Carbon Twin
          </p>
          <h2
            ref={revealHeadingRef}
            tabIndex={-1}
            className="mb-3 text-2xl font-bold text-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            {twin.species}
          </h2>
          <p className="mb-6 text-base italic text-green-800">{twin.flavor}</p>
          <button
            type="button"
            onClick={handleRevealContinue}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            Plant my first tree
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md" role="form" aria-label="Lifestyle quiz">
      {/* Polite live region so screen readers hear progress between questions
          and the Carbon Twin generation status. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={`Question ${step + 1} of ${questions.length}`}
      >
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="animate-fade-in rounded-2xl bg-white p-6 shadow-lg motion-reduce:animate-none">
        <p className="mb-1 text-sm text-gray-500">
          {step + 1} of {questions.length}
        </p>
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          {current.label}
        </h2>

        <div
          className="flex flex-col gap-3"
          role="radiogroup"
          aria-label={current.label}
        >
          {current.options.map((option, idx) => {
            const selected = answers[current.key] === option.value;
            return (
              <button
                key={option.value}
                ref={idx === 0 ? firstOptionRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(option.value);
                  }
                }}
                className={`rounded-xl border-2 px-4 py-3 text-left font-medium transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Nav row — Back is visible at all times for predictability, Next is
            an explicit button so screen-reader users can confirm a selection
            before the page state changes. */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!currentValue || generating}
            aria-busy={generating}
            className="rounded-xl bg-green-600 px-5 py-2 font-semibold text-white shadow-sm transition-colors motion-reduce:transition-none hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            {generating
              ? 'Generating…'
              : step === questions.length - 1
                ? 'Reveal my Carbon Twin'
                : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
