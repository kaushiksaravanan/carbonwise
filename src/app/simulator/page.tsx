'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/storage';
import { calculateWhatIf } from '@/lib/carbon-calculator';
import { UserProfile, WhatIfScenario, LifestyleData } from '@/types';
import WhatIfCard from '@/components/WhatIfCard';
import Navigation from '@/components/Navigation';

interface PresetScenario {
  id: string;
  description: string;
  icon: string;
  change: Partial<LifestyleData>;
  timeframe: WhatIfScenario['timeframe'];
}

const presetScenarios: PresetScenario[] = [
  {
    id: 'bike-commute',
    description: 'I bike to work 3 days/week',
    icon: '🚲',
    change: { transport: 'bike' },
    timeframe: 'weekly',
  },
  {
    id: 'vegetarian-weekdays',
    description: 'I go vegetarian on weekdays',
    icon: '🥗',
    change: { diet: 'vegetarian' },
    timeframe: 'weekly',
  },
  {
    id: 'reduce-heating',
    description: 'I reduce heating by 2 degrees C',
    icon: '🌡️',
    change: { homeEnergy: 'medium' },
    timeframe: 'monthly',
  },
  {
    id: 'secondhand-clothes',
    description: 'I buy secondhand clothes',
    icon: '👕',
    change: { shopping: 'minimal' },
    timeframe: 'monthly',
  },
];

export default function SimulatorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<WhatIfScenario[]>([]);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace('/');
      return;
    }
    setProfile(p);
  }, [router]);

  function handleScenarioClick(scenario: PresetScenario) {
    if (!profile) return;

    const result = calculateWhatIf(profile.lifestyle, scenario.change);
    const multiplier = scenario.timeframe === 'weekly' ? 7 : scenario.timeframe === 'monthly' ? 30 : 365;

    const whatIfResult: WhatIfScenario = {
      id: scenario.id,
      description: scenario.description,
      currentCO2Kg: result.currentDaily * multiplier,
      projectedCO2Kg: result.projectedDaily * multiplier,
      savingsKg: (result.currentDaily - result.projectedDaily) * multiplier,
      savingsPercent: result.savingsPercent,
      timeframe: scenario.timeframe,
    };

    // Add or replace existing result for this scenario
    setResults((prev) => {
      const existing = prev.findIndex((r) => r.id === scenario.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = whatIfResult;
        return updated;
      }
      return [whatIfResult, ...prev];
    });
  }

  function handleCustomScenario() {
    if (!profile || !customInput.trim()) return;

    // Simple heuristic: map common keywords to lifestyle changes
    const lower = customInput.toLowerCase();
    let change: Partial<LifestyleData> = {};
    let timeframe: "weekly" | "monthly" | "yearly" = 'monthly';

    if (lower.includes('bike') || lower.includes('cycle')) {
      change = { transport: 'bike' };
      timeframe = 'weekly';
    } else if (lower.includes('bus') || lower.includes('train') || lower.includes('public')) {
      change = { transport: 'public' };
      timeframe = 'weekly';
    } else if (lower.includes('vegan')) {
      change = { diet: 'vegan' };
      timeframe = 'monthly';
    } else if (lower.includes('vegetarian') || lower.includes('no meat')) {
      change = { diet: 'vegetarian' };
      timeframe = 'monthly';
    } else if (lower.includes('energy') || lower.includes('heating') || lower.includes('cooling')) {
      change = { homeEnergy: 'low' };
      timeframe = 'yearly';
    } else if (lower.includes('shop') || lower.includes('buy less') || lower.includes('secondhand')) {
      change = { shopping: 'minimal' };
      timeframe = 'monthly';
    } else {
      change = { homeEnergy: 'low' };
      timeframe = 'monthly';
    }

    const result = calculateWhatIf(profile.lifestyle, change);
    const multiplier = timeframe === 'weekly' ? 7 : timeframe === 'monthly' ? 30 : 365;

    const whatIfResult: WhatIfScenario = {
      id: `custom-${Date.now()}`,
      description: customInput.trim(),
      currentCO2Kg: result.currentDaily * multiplier,
      projectedCO2Kg: result.projectedDaily * multiplier,
      savingsKg: (result.currentDaily - result.projectedDaily) * multiplier,
      savingsPercent: result.savingsPercent,
      timeframe,
    };

    setResults((prev) => [whatIfResult, ...prev]);
    setCustomInput('');
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20 pt-6">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-900">
            What If...? <span aria-hidden="true">🔬</span>
          </h1>
          <p className="mt-1 text-sm text-green-700">
            Explore how lifestyle changes could reduce your carbon footprint
          </p>
        </div>

        {/* Preset Scenarios */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Try a scenario
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {presetScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioClick(scenario)}
                className="glass flex flex-col items-center gap-2 p-4 text-center transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              >
                <span className="text-3xl" aria-hidden="true">
                  {scenario.icon}
                </span>
                <span className="text-xs font-medium text-gray-700">
                  {scenario.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Scenario */}
        <div className="glass mb-6 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">
            Or describe your own change
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomScenario();
              }}
              placeholder="e.g., I walk to the store instead of driving"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              aria-label="Custom scenario description"
            />
            <button
              onClick={handleCustomScenario}
              disabled={!customInput.trim()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            >
              Go
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Results
            </h2>
            <div className="space-y-4">
              {results.map((scenario) => (
                <WhatIfCard key={scenario.id} scenario={scenario} />
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-3 text-4xl" aria-hidden="true">🌍</span>
            <p className="text-sm text-gray-600">
              Tap a scenario above to see how it would affect your carbon footprint
            </p>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
