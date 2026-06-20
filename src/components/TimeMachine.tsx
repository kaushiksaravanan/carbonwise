'use client';

/**
 * TimeMachine — a 12-month "future self" timeline for a what-if scenario.
 *
 * Drag the scrub bar to fast-forward through a year of the projected change:
 * the garden morphs (more trees, more flowers, sky clearing), and the
 * cumulative kg saved counter ticks up. Reframes the simulator from a static
 * calculator into a "try on your future self" demo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { WhatIfScenario } from '@/types';

interface TimeMachineProps {
  scenario: WhatIfScenario;
  /** Called when the user commits to this future as a recurring nudge. */
  onApplyFuture?: (scenario: WhatIfScenario) => void;
  /** Whether this future has already been scheduled. */
  alreadyApplied?: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function dailySavings(scenario: WhatIfScenario): number {
  // savingsKg is over the timeframe; normalize to per-day so a 0..12 month
  // scrub gives a smooth cumulative.
  const days =
    scenario.timeframe === 'weekly'
      ? 7
      : scenario.timeframe === 'monthly'
        ? 30
        : 365;
  return scenario.savingsKg / days;
}

export default function TimeMachine({
  scenario,
  onApplyFuture,
  alreadyApplied,
}: TimeMachineProps) {
  // Months elapsed in the projected future, 0..12. Drag to scrub.
  const [month, setMonth] = useState(0);
  const [autoplaying, setAutoplaying] = useState(false);
  const rafRef = useRef<number | null>(null);

  const perDay = useMemo(() => dailySavings(scenario), [scenario]);
  const cumulativeKg = perDay * 30 * month;

  // Garden state interpolated from month 0 -> 12.
  // 0 trees + 0 flowers at month 0; up to a generous bloom by month 12.
  const trees = Math.floor(month * 0.75); // 0..9
  const flowers = Math.floor(month * 2.5); // 0..30
  const skyClarity = Math.min(1, month / 12); // 0 hazy -> 1 clear
  const gardenHealth = Math.min(100, 30 + month * 6); // 30..102 clamp
  const treeOpacity = 0.3 + skyClarity * 0.7;

  // Autoplay: animate from month 0 to 12 once on first render so users see
  // the metaphor before they touch the slider.
  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const duration = 2400; // 2.4s sweep
    setAutoplaying(true);
    setMonth(0);

    function frame(now: number) {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setMonth(eased * 12);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setAutoplaying(false);
      }
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // Re-run when scenario id changes — each new "future" replays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  function handleScrub(value: number) {
    // User interacted: stop autoplay if it's still going.
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setAutoplaying(false);
    setMonth(value);
  }

  const monthIndex = Math.min(11, Math.floor(month));
  const monthLabel = month >= 12 ? '1 year from now' : `${MONTHS[monthIndex]} (month ${Math.min(12, Math.round(month))})`;

  return (
    <div
      className="rounded-2xl border border-green-100 bg-white p-5 shadow-md"
      aria-label={`Time machine for: ${scenario.description}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-green-600">
            Time machine
          </p>
          <p className="text-sm font-medium text-gray-800">
            {scenario.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {monthLabel}
        </span>
      </div>

      {/* Future garden — morphs as you scrub */}
      <div
        className="relative mb-4 h-40 overflow-hidden rounded-xl"
        style={{
          background: `linear-gradient(to bottom,
            rgba(${Math.round(180 - skyClarity * 50)}, ${Math.round(190 + skyClarity * 30)}, ${Math.round(200 + skyClarity * 50)}, 1) 0%,
            rgba(${Math.round(170 - skyClarity * 30)}, ${Math.round(220 + skyClarity * 20)}, ${Math.round(180 + skyClarity * 30)}, 1) 100%)`,
        }}
        aria-hidden="true"
      >
        {/* Sun — brightens as the sky clears */}
        <div
          className="absolute right-4 top-3 h-10 w-10 rounded-full transition-all duration-500"
          style={{
            background: `radial-gradient(circle, rgba(255, 230, 120, ${0.5 + skyClarity * 0.5}) 0%, rgba(255, 200, 80, ${0.2 + skyClarity * 0.4}) 60%, transparent 100%)`,
            transform: `scale(${0.8 + skyClarity * 0.4})`,
          }}
        />
        {/* Smog haze — fades out as future improves */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background:
              'linear-gradient(to bottom, rgba(120, 110, 100, 0.55) 0%, transparent 60%)',
            opacity: Math.max(0, 1 - skyClarity),
          }}
        />
        {/* Ground */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12"
          style={{
            background: `linear-gradient(to bottom, rgba(120, ${Math.round(150 + skyClarity * 50)}, 80, 1), rgba(80, ${Math.round(110 + skyClarity * 40)}, 60, 1))`,
          }}
        />
        {/* Trees — appear over time */}
        {Array.from({ length: 9 }).map((_, i) => {
          const visible = i < trees;
          const xPct = 8 + i * 10;
          const size = 28 + (i % 3) * 6;
          return (
            <div
              key={`tree-${i}`}
              className="absolute bottom-9 transition-all duration-500"
              style={{
                left: `${xPct}%`,
                opacity: visible ? treeOpacity : 0,
                transform: `translateY(${visible ? 0 : 12}px) scale(${visible ? 1 : 0.6})`,
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: `radial-gradient(circle at 35% 35%, #4ade80, #16a34a)`,
                }}
              />
              <div
                className="mx-auto"
                style={{
                  width: 6,
                  height: 14,
                  background: '#7c4a18',
                  marginTop: -2,
                }}
              />
            </div>
          );
        })}
        {/* Flowers — accumulate on the ground */}
        {Array.from({ length: 30 }).map((_, i) => {
          const visible = i < flowers;
          const xPct = 4 + ((i * 13) % 92);
          const yOffset = 2 + (i % 3) * 3;
          const colors = ['#ec4899', '#fbbf24', '#a78bfa', '#f87171'];
          const color = colors[i % colors.length];
          return (
            <div
              key={`flower-${i}`}
              className="absolute transition-all duration-300"
              style={{
                left: `${xPct}%`,
                bottom: yOffset,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                opacity: visible ? 0.9 : 0,
                transform: `scale(${visible ? 1 : 0.2})`,
              }}
            />
          );
        })}
      </div>

      {/* Cumulative counter — ticks up as you scrub */}
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            CO2 saved by this future-you
          </p>
          <p className="text-2xl font-bold text-green-700 tabular-nums">
            {cumulativeKg.toFixed(1)}{' '}
            <span className="text-sm font-medium text-green-600">kg</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Garden health
          </p>
          <p className="text-lg font-semibold text-green-700 tabular-nums">
            {Math.round(gardenHealth)}/100
          </p>
        </div>
      </div>

      {/* Scrub bar */}
      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={12}
          step={0.1}
          value={month}
          onChange={(e) => handleScrub(parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-gray-300 via-green-300 to-green-500"
          aria-label="Scrub through the next 12 months"
          disabled={autoplaying}
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>Today</span>
          <span>6 mo</span>
          <span>1 year</span>
        </div>
      </div>

      {/* Apply this future */}
      {onApplyFuture && (
        <button
          type="button"
          onClick={() => onApplyFuture(scenario)}
          disabled={alreadyApplied}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
        >
          {alreadyApplied
            ? 'Scheduled — your coach will nudge you daily'
            : 'Apply this future — get a daily nudge'}
        </button>
      )}
    </div>
  );
}
