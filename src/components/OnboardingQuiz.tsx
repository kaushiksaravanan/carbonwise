'use client';

import { useState, useCallback } from 'react';
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

export default function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<LifestyleData>>({});

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const handleSelect = useCallback(
    (value: string) => {
      const updated = { ...answers, [current.key]: value };
      setAnswers(updated);

      if (step < questions.length - 1) {
        setTimeout(() => setStep(step + 1), 200);
      } else {
        onComplete(updated as LifestyleData);
      }
    },
    [answers, current.key, step, onComplete],
  );

  return (
    <div className="mx-auto max-w-md" role="form" aria-label="Lifestyle quiz">
      <div
        className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-label={`Question ${step + 1} of ${questions.length}`}
      >
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="animate-fade-in rounded-2xl bg-white p-6 shadow-lg">
        <p className="mb-1 text-sm text-gray-500">
          {step + 1} of {questions.length}
        </p>
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          {current.label}
        </h2>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label={current.label}>
          {current.options.map((option) => {
            const selected = answers[current.key] === option.value;
            return (
              <button
                key={option.value}
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
                className={`rounded-xl border-2 px-4 py-3 text-left font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
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

        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
