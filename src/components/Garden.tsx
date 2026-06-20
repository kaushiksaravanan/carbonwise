'use client';

import { GardenState } from '@/types';
import LottieAnimation from './LottieAnimation';

interface GardenProps {
  garden: GardenState;
}

export default function Garden({ garden }: GardenProps) {
  const healthColor =
    garden.health > 70
      ? 'bg-green-500'
      : garden.health > 40
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-100 via-emerald-50 to-green-200 p-6 shadow-lg">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <LottieAnimation
          src="/animations/tree-grow.json"
          loop
          autoplay
          className="h-full w-full"
          ariaLabel="Tree growing animation"
        />
      </div>

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-green-900">
            Level {garden.level}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-800">
              Health: {garden.health}%
            </span>
          </div>
        </div>

        <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-green-200">
          <div
            className={`h-full rounded-full transition-all duration-700 ${healthColor}`}
            style={{ width: `${garden.health}%` }}
            role="progressbar"
            aria-valuenow={garden.health}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Garden health ${garden.health}%`}
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: garden.trees }).map((_, i) => (
            <span
              key={`tree-${i}`}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-200/60 text-2xl"
              aria-hidden="true"
            >
              🌳
            </span>
          ))}
          {Array.from({ length: garden.flowers }).map((_, i) => (
            <span
              key={`flower-${i}`}
              className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-100/60 text-2xl"
              aria-hidden="true"
            >
              🌸
            </span>
          ))}
        </div>

        <p className="mt-4 text-sm text-green-700" aria-live="polite">
          {garden.trees} trees, {garden.flowers} flowers
        </p>
      </div>
    </div>
  );
}
