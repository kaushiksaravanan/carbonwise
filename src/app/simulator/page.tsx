'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/storage';
import { calculateWhatIf } from '@/lib/carbon-calculator';
import { UserProfile, WhatIfScenario, LifestyleData } from '@/types';
import WhatIfCard from '@/components/WhatIfCard';
import TimeMachine from '@/components/TimeMachine';
import Navigation from '@/components/Navigation';

interface PresetScenario {
  id: string;
  description: string;
  icon: string;
  change: Partial<LifestyleData>;
  timeframe: WhatIfScenario['timeframe'];
}

interface ScheduledFuture {
  id: string;
  description: string;
  scheduledAt: string; // ISO date
  savingsKg: number;
  timeframe: WhatIfScenario['timeframe'];
}

const SCHEDULED_FUTURES_KEY = 'carbonwise.scheduledFutures';

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

interface ParseScenarioResponse {
  change?: Partial<LifestyleData>;
  timeframe?: WhatIfScenario['timeframe'];
  confidence?: number;
  rationale?: string;
  error?: string;
}

/**
 * Keyword-fallback used only when the structured-output LLM call fails or
 * returns low confidence. Kept here as a graceful degradation layer; the
 * primary path is the /api/parse-scenario endpoint which actually understands
 * compound intents like "I switch to an EV and install solar".
 */
function fallbackKeywordParse(input: string): {
  change: Partial<LifestyleData>;
  timeframe: WhatIfScenario['timeframe'];
} {
  const lower = input.toLowerCase();
  const change: Partial<LifestyleData> = {};
  let timeframe: WhatIfScenario['timeframe'] = 'monthly';

  // Multi-aspect: collect all matches instead of first-match-wins.
  if (/\b(bike|cycle|cycling)\b/.test(lower)) {
    change.transport = 'bike';
    timeframe = 'weekly';
  } else if (/\b(bus|train|public|transit|metro|subway)\b/.test(lower)) {
    change.transport = 'public';
    timeframe = 'weekly';
  } else if (/\b(walk|walking)\b/.test(lower)) {
    change.transport = 'walk';
    timeframe = 'weekly';
  } else if (/\b(ev|electric car|tesla)\b/.test(lower)) {
    change.transport = 'public';
    timeframe = 'yearly';
  }

  if (/\bvegan\b/.test(lower)) change.diet = 'vegan';
  else if (/\b(vegetarian|no meat|plant.based)\b/.test(lower))
    change.diet = 'vegetarian';

  if (/\b(solar|heat pump|insulation|less heat|reduce heat|cooling|energy)\b/.test(lower)) {
    change.homeEnergy = 'low';
    timeframe = 'yearly';
  }

  if (/\b(thrift|secondhand|second.hand|buy less|minimalism|fewer clothes|shop less)\b/.test(lower)) {
    change.shopping = 'minimal';
  }

  // Final fallback if nothing matched at all.
  if (Object.keys(change).length === 0) {
    change.homeEnergy = 'low';
  }

  return { change, timeframe };
}

export default function SimulatorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [results, setResults] = useState<WhatIfScenario[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseRationale, setParseRationale] = useState<string | null>(null);
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace('/');
      return;
    }
    setProfile(p);

    // Load any previously scheduled futures so the "Apply" button reflects state.
    try {
      const raw = localStorage.getItem(SCHEDULED_FUTURES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScheduledFuture[];
        setScheduledIds(new Set(parsed.map((s) => s.id)));
      }
    } catch {
      // localStorage may be unavailable / corrupted — ignore.
    }
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

  async function parseIntent(description: string): Promise<{
    change: Partial<LifestyleData>;
    timeframe: WhatIfScenario['timeframe'];
    confidence: number;
    rationale: string;
    fromLLM: boolean;
  }> {
    try {
      const res = await fetch('/api/parse-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        const data = (await res.json()) as ParseScenarioResponse;
        const change = data.change ?? {};
        const confidence = typeof data.confidence === 'number' ? data.confidence : 0;
        // If the model returned at least one mapped key with reasonable
        // confidence, trust it. Otherwise fall through to keyword fallback.
        if (Object.keys(change).length > 0 && confidence >= 0.35) {
          return {
            change,
            timeframe: data.timeframe ?? 'monthly',
            confidence,
            rationale: data.rationale ?? '',
            fromLLM: true,
          };
        }
      }
    } catch (e) {
      console.warn('[simulator] parse-scenario fetch failed:', e);
    }
    const fallback = fallbackKeywordParse(description);
    return {
      change: fallback.change,
      timeframe: fallback.timeframe,
      confidence: 0.4,
      rationale: '',
      fromLLM: false,
    };
  }

  async function handleCustomScenario() {
    if (!profile || !customInput.trim() || parsing) return;

    const description = customInput.trim();
    setParsing(true);
    setParseRationale(null);

    const { change, timeframe, rationale } = await parseIntent(description);

    const result = calculateWhatIf(profile.lifestyle, change);
    const multiplier = timeframe === 'weekly' ? 7 : timeframe === 'monthly' ? 30 : 365;

    const whatIfResult: WhatIfScenario = {
      id: `custom-${Date.now()}`,
      description,
      currentCO2Kg: result.currentDaily * multiplier,
      projectedCO2Kg: result.projectedDaily * multiplier,
      savingsKg: (result.currentDaily - result.projectedDaily) * multiplier,
      savingsPercent: result.savingsPercent,
      timeframe,
    };

    setResults((prev) => [whatIfResult, ...prev]);
    setCustomInput('');
    if (rationale) setParseRationale(rationale);
    setParsing(false);
  }

  function handleApplyFuture(scenario: WhatIfScenario) {
    // Persist the commitment locally. The coach reads this in future turns
    // (via storage) and turns it into a daily nudge.
    try {
      const raw = localStorage.getItem(SCHEDULED_FUTURES_KEY);
      const list: ScheduledFuture[] = raw ? JSON.parse(raw) : [];
      // Replace existing schedule with same id, otherwise prepend.
      const filtered = list.filter((s) => s.id !== scenario.id);
      const next: ScheduledFuture = {
        id: scenario.id,
        description: scenario.description,
        scheduledAt: new Date().toISOString(),
        savingsKg: scenario.savingsKg,
        timeframe: scenario.timeframe,
      };
      localStorage.setItem(
        SCHEDULED_FUTURES_KEY,
        JSON.stringify([next, ...filtered].slice(0, 20))
      );
      setScheduledIds((prev) => {
        const updated = new Set(prev);
        updated.add(scenario.id);
        return updated;
      });
    } catch (e) {
      console.warn('[simulator] could not persist scheduled future:', e);
    }
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
            What If...? <span aria-hidden="true">🔮</span>
          </h1>
          <p className="mt-1 text-sm text-green-700">
            Step into your future self — drag the timeline to see how a
            lifestyle change plays out over a year.
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
              placeholder='e.g., "I switch to an EV and install solar"'
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
              aria-label="Custom scenario description"
              disabled={parsing}
            />
            <button
              onClick={handleCustomScenario}
              disabled={!customInput.trim() || parsing}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            >
              {parsing ? '...' : 'Go'}
            </button>
          </div>
          {parsing && (
            <p className="mt-2 text-xs text-gray-500">
              Reading your intent...
            </p>
          )}
          {parseRationale && !parsing && (
            <p className="mt-2 text-xs italic text-green-700">
              {parseRationale}
            </p>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Your futures
            </h2>
            <div className="space-y-4">
              {results.map((scenario) => (
                <div key={scenario.id} className="space-y-3">
                  <TimeMachine
                    scenario={scenario}
                    onApplyFuture={handleApplyFuture}
                    alreadyApplied={scheduledIds.has(scenario.id)}
                  />
                  <details className="glass px-4 py-2 text-sm text-gray-700">
                    <summary className="cursor-pointer font-medium">
                      See the numbers
                    </summary>
                    <div className="mt-3">
                      <WhatIfCard scenario={scenario} />
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="mb-3 text-4xl" aria-hidden="true">🌍</span>
            <p className="text-sm text-gray-600">
              Tap a scenario above to step into a future where you made the change
            </p>
          </div>
        )}
      </div>

      <Navigation />
    </main>
  );
}
