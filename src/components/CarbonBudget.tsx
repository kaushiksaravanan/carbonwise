'use client';

import { useEffect, useState } from 'react';

interface CarbonBudgetProps {
  budgetKg: number;
  usedKg: number;
}

export default function CarbonBudget({ budgetKg, usedKg }: CarbonBudgetProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  // Guard against budgetKg=0 (would yield NaN/Infinity). Treat any usage as 100% in that case.
  const rawPercent =
    budgetKg > 0 ? (usedKg / budgetKg) * 100 : usedKg > 0 ? 100 : 0;
  const percent = Math.min(rawPercent, 100);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedPercent(percent), 50);
    return () => clearTimeout(timeout);
  }, [percent]);

  const color =
    percent < 60
      ? 'stroke-green-500'
      : percent < 90
        ? 'stroke-yellow-500'
        : 'stroke-red-500';

  // Use -700 shades to meet WCAG AA contrast (>= 4.5:1) on white backgrounds.
  const textColor =
    percent < 60
      ? 'text-green-700'
      : percent < 90
        ? 'text-yellow-700'
        : 'text-red-700';

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPercent / 100) * circumference;
  const displayPercent = Math.round(percent);

  return (
    <div
      className="flex flex-col items-center"
      role="meter"
      aria-valuenow={usedKg}
      aria-valuemin={0}
      aria-valuemax={budgetKg}
      aria-valuetext={`${displayPercent}% of daily budget used`}
      aria-label={`Carbon budget: ${usedKg.toFixed(1)} of ${budgetKg.toFixed(1)} kg used`}
      data-testid="carbon-budget"
      data-percent={displayPercent}
      data-state={percent < 60 ? 'good' : percent < 90 ? 'warning' : 'over'}
    >
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        className="drop-shadow-sm"
      >
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-gray-200"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${textColor}`}>
          {usedKg.toFixed(1)} / {budgetKg.toFixed(1)}
        </span>
        <span className="text-xs text-gray-700">kg CO2</span>
      </div>
    </div>
  );
}
