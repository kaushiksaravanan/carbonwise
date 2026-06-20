'use client';

import { WhatIfScenario } from '@/types';

interface WhatIfCardProps {
  scenario: WhatIfScenario;
}

const timeframeLabels: Record<WhatIfScenario['timeframe'], string> = {
  weekly: 'Per Week',
  monthly: 'Per Month',
  yearly: 'Per Year',
};

export default function WhatIfCard({ scenario }: WhatIfCardProps) {
  const maxValue = Math.max(scenario.currentCO2Kg, scenario.projectedCO2Kg);

  return (
    <div
      className="rounded-2xl border border-green-100 bg-white p-5 shadow-md"
      aria-label={`What-if scenario: ${scenario.description}`}
    >
      <div className="mb-4 flex items-start justify-between">
        <p className="text-sm font-medium text-gray-800">
          {scenario.description}
        </p>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {timeframeLabels[scenario.timeframe]}
        </span>
      </div>

      <div className="mb-4 space-y-2">
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Current</span>
            <span>{scenario.currentCO2Kg.toFixed(1)} kg</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-400 transition-all duration-700"
              style={{
                width: `${(scenario.currentCO2Kg / maxValue) * 100}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>Projected</span>
            <span>{scenario.projectedCO2Kg.toFixed(1)} kg</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-700"
              style={{
                width: `${(scenario.projectedCO2Kg / maxValue) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-2">
        <span className="text-lg text-green-600" aria-hidden="true">
          ↓
        </span>
        <div>
          <p className="text-sm font-semibold text-green-800">
            Save {scenario.savingsKg.toFixed(1)} kg ({scenario.savingsPercent}%)
          </p>
        </div>
      </div>
    </div>
  );
}
