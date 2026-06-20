'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProfile,
  saveProfile,
  getEntries,
  addEntry,
  getTodayBudget,
  updateGarden,
  generateId,
} from '@/lib/storage';
import { calculateActivityEmission, getCategoryIcon } from '@/lib/carbon-calculator';
import { UserProfile, CarbonEntry, DailyBudget, CarbonCategory } from '@/types';
import CarbonBudget from '@/components/CarbonBudget';
import Garden from '@/components/Garden';
import Navigation from '@/components/Navigation';

const CATEGORY_OPTIONS: { value: CarbonCategory; label: string }[] = [
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'energy', label: 'Energy' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
];

const activityOptions: Record<CarbonCategory, { value: string; label: string }[]> = {
  transport: [
    { value: 'drive-car', label: 'Drive (km)' },
    { value: 'take-bus', label: 'Bus (km)' },
    { value: 'take-train', label: 'Train (km)' },
    { value: 'ride-bike', label: 'Bike (km)' },
    { value: 'fly-domestic', label: 'Domestic flight (km)' },
  ],
  food: [
    { value: 'meal-beef', label: 'Beef meal' },
    { value: 'meal-chicken', label: 'Chicken meal' },
    { value: 'meal-vegetarian', label: 'Vegetarian meal' },
    { value: 'meal-vegan', label: 'Vegan meal' },
  ],
  energy: [
    { value: 'heating', label: 'Heating (hours)' },
    { value: 'cooling', label: 'Cooling (hours)' },
    { value: 'electronics', label: 'Electronics (hours)' },
    { value: 'laundry', label: 'Laundry loads' },
  ],
  shopping: [
    { value: 'clothing-new', label: 'New clothing (items)' },
    { value: 'clothing-secondhand', label: 'Secondhand (items)' },
    { value: 'electronics-new', label: 'New electronics' },
    { value: 'groceries', label: 'Groceries (items)' },
  ],
  other: [
    { value: 'other', label: 'Other activity' },
  ],
};

// Map activity -> placeholder hint with units, based on the activity label.
function getQuantityPlaceholder(category: CarbonCategory, activity: string): string {
  const opt = activityOptions[category].find((a) => a.value === activity);
  if (!opt) return 'e.g., 1';
  const label = opt.label.toLowerCase();
  if (label.includes('km')) return 'e.g., 10 km';
  if (label.includes('hours')) return 'e.g., 2 hours';
  if (label.includes('items')) return 'e.g., 1 item';
  if (label.includes('loads')) return 'e.g., 1 load';
  if (label.includes('meal')) return 'e.g., 1 meal';
  return 'e.g., 1';
}

// Quick-log presets seeded by the user's lifestyle. Tap once to log a typical day's action.
function getQuickPresets(
  profile: UserProfile,
): { id: string; label: string; icon: string; category: CarbonCategory; activity: string; quantity: number }[] {
  const presets: {
    id: string;
    label: string;
    icon: string;
    category: CarbonCategory;
    activity: string;
    quantity: number;
  }[] = [];

  // Transport preset based on commute style
  if (profile.lifestyle.transport === 'car' || profile.lifestyle.transport === 'mixed') {
    presets.push({
      id: 'commute-car',
      label: 'Drove to work',
      icon: '🚗',
      category: 'transport',
      activity: 'drive-car',
      quantity: 15,
    });
  }
  if (
    profile.lifestyle.transport === 'public' ||
    profile.lifestyle.transport === 'mixed'
  ) {
    presets.push({
      id: 'commute-bus',
      label: 'Took the bus',
      icon: '🚌',
      category: 'transport',
      activity: 'take-bus',
      quantity: 15,
    });
  }

  // Diet preset
  const dietPreset =
    profile.lifestyle.diet === 'meat-heavy'
      ? { activity: 'meal-beef', label: 'Beef meal', icon: '🥩' }
      : profile.lifestyle.diet === 'balanced'
      ? { activity: 'meal-chicken', label: 'Chicken meal', icon: '🍗' }
      : profile.lifestyle.diet === 'vegetarian'
      ? { activity: 'meal-vegetarian', label: 'Veggie meal', icon: '🥗' }
      : { activity: 'meal-vegan', label: 'Vegan meal', icon: '🌱' };
  presets.push({
    id: `meal-${dietPreset.activity}`,
    label: dietPreset.label,
    icon: dietPreset.icon,
    category: 'food',
    activity: dietPreset.activity,
    quantity: 1,
  });

  return presets.slice(0, 3);
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budget, setBudget] = useState<DailyBudget | null>(null);
  const [recentEntries, setRecentEntries] = useState<CarbonEntry[]>([]);
  const [allEntries, setAllEntries] = useState<CarbonEntry[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [category, setCategory] = useState<CarbonCategory>('transport');
  const [activity, setActivity] = useState('drive-car');
  const [quantity, setQuantity] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Refs for focus management
  const logActivityButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);

  // Refresh budget, entries, and garden state. Used on mount AND after every action
  // so the garden visually reacts to the entry the user just logged.
  const refreshDashboard = useCallback((p: UserProfile) => {
    const todayBudget = getTodayBudget(p);
    setBudget(todayBudget);

    const entries = getEntries();
    setAllEntries(entries);
    setRecentEntries(entries.slice(-5).reverse());

    const updatedGarden = updateGarden(p);
    // Direct field-level comparison — order-stable, no JSON.stringify cost.
    const changed =
      updatedGarden.health !== p.garden.health ||
      updatedGarden.flowers !== p.garden.flowers ||
      updatedGarden.trees !== p.garden.trees ||
      updatedGarden.level !== p.garden.level ||
      updatedGarden.lastWatered !== p.garden.lastWatered;

    if (changed) {
      const updatedProfile = { ...p, garden: updatedGarden };
      saveProfile(updatedProfile);
      setProfile(updatedProfile);
      return updatedProfile;
    }
    return p;
  }, []);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace('/');
      return;
    }
    setProfile(p);
    refreshDashboard(p);
  }, [router, refreshDashboard]);

  // Modal: trap focus, restore focus on close, listen for Escape.
  useEffect(() => {
    if (!showModal) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    // Move focus into the modal on open.
    requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowModal(false);
        return;
      }
      if (e.key !== 'Tab') return;

      const root = modalRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the trigger (or the previously focused element).
      const target =
        previouslyFocusedRef.current ?? logActivityButtonRef.current;
      target?.focus?.();
    };
  }, [showModal]);

  function openModal(initial?: { category: CarbonCategory; activity: string; quantity: number }) {
    if (initial) {
      setCategory(initial.category);
      setActivity(initial.activity);
      setQuantity(String(initial.quantity));
    }
    setFormError(null);
    setShowModal(true);
  }

  function logActivityCore(
    p: UserProfile,
    cat: CarbonCategory,
    act: string,
    qty: number,
  ) {
    const co2Kg = calculateActivityEmission(cat, act, qty);
    const entry: CarbonEntry = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      category: cat,
      activity: act,
      co2Kg,
      isReduction: false,
    };
    addEntry(entry);
    refreshDashboard(p);
  }

  function handleLogActivity() {
    if (!profile) return;
    const parsed = parseFloat(quantity);
    if (!quantity || Number.isNaN(parsed) || parsed <= 0) {
      setFormError('Please enter a positive number.');
      return;
    }
    setFormError(null);
    logActivityCore(profile, category, activity, parsed);
    setShowModal(false);
    setQuantity('');
  }

  // Quick-log: one tap from the dashboard, no modal.
  function handleQuickLog(preset: {
    category: CarbonCategory;
    activity: string;
    quantity: number;
  }) {
    if (!profile) return;
    logActivityCore(profile, preset.category, preset.activity, preset.quantity);
  }

  // Repeat: one tap to re-log the same activity from Recent Activity.
  function handleRepeat(entry: CarbonEntry) {
    if (!profile) return;
    // Re-derive quantity from co2Kg / factor when possible. Fall back to 1.
    const refKg = calculateActivityEmission(entry.category, entry.activity, 1);
    const qty = refKg > 0 ? Math.round((entry.co2Kg / refKg) * 100) / 100 : 1;
    logActivityCore(profile, entry.category, entry.activity, qty);
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Insight: top emission category for the last 7 days, week-over-week delta, and a tip.
  const insight = useMemo(() => {
    if (!profile || allEntries.length === 0) return null;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * day;
    const twoWeeksAgo = now - 14 * day;

    const inLastWeek = allEntries.filter(
      (e) => new Date(e.date).getTime() >= weekAgo,
    );
    const inPriorWeek = allEntries.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    });

    if (inLastWeek.length === 0) return null;

    const totalsByCategory: Record<string, number> = {};
    let weekTotal = 0;
    for (const e of inLastWeek) {
      const v = e.isReduction ? -e.co2Kg : e.co2Kg;
      totalsByCategory[e.category] = (totalsByCategory[e.category] ?? 0) + v;
      weekTotal += v;
    }
    const priorTotal = inPriorWeek.reduce(
      (s, e) => s + (e.isReduction ? -e.co2Kg : e.co2Kg),
      0,
    );

    const top = Object.entries(totalsByCategory).sort(
      (a, b) => b[1] - a[1],
    )[0] as [CarbonCategory, number] | undefined;
    if (!top) return null;
    const [topCategory, topKg] = top;
    const sharePct =
      weekTotal > 0 ? Math.round((topKg / weekTotal) * 100) : 0;
    const delta =
      priorTotal > 0
        ? Math.round(((weekTotal - priorTotal) / priorTotal) * 100)
        : null;

    const tip =
      topCategory === 'transport'
        ? 'Try replacing one car commute with bus or bike this week.'
        : topCategory === 'food'
        ? 'Swap one meat meal for a vegetarian one to cut ~5 kg CO2.'
        : topCategory === 'energy'
        ? 'Lower heating/cooling by 2°C — saves ~2.5 kg CO2/day.'
        : topCategory === 'shopping'
        ? 'Choose secondhand for your next purchase to save ~7 kg CO2.'
        : 'Look for the next small swap — every kg counts.';

    return { topCategory, sharePct, weekTotal, delta, tip };
  }, [profile, allEntries]);

  if (!profile || !budget) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  const presets = getQuickPresets(profile);
  const focusVisible =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2';

  return (
    <main
      className="min-h-screen pb-20 pt-6"
      // Hide background from assistive tech while modal is open.
      aria-hidden={showModal ? true : undefined}
    >
      <div className="mx-auto max-w-lg px-4">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-900">
            Welcome back, {profile.name}!
          </h1>
          <p className="text-sm text-green-700">{today}</p>
        </div>

        {/* Carbon Budget Ring */}
        <div className="glass relative mb-6 flex flex-col items-center p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Today&apos;s Carbon Budget
          </h2>
          <CarbonBudget budgetKg={budget.budgetKg} usedKg={budget.usedKg} />
          <p className="mt-3 text-sm text-gray-600">
            {budget.usedKg.toFixed(1)} / {budget.budgetKg.toFixed(1)} kg CO2 used
          </p>
        </div>

        {/* Garden */}
        <div className="mb-6">
          <Garden garden={profile.garden} />
        </div>

        {/* Streak */}
        <div className="glass mb-6 flex items-center gap-3 p-4">
          <span className="text-3xl" aria-hidden="true">
            🔥
          </span>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {profile.streak} day{profile.streak !== 1 ? 's' : ''} streak
            </p>
            <p className="text-sm text-gray-600">Keep it up!</p>
          </div>
        </div>

        {/* Insights */}
        {insight && (
          <div className="glass mb-6 p-5">
            <h2 className="mb-2 text-lg font-semibold text-gray-800">
              This Week&apos;s Insight
            </h2>
            <p className="text-sm text-gray-700">
              <span aria-hidden="true">{getCategoryIcon(insight.topCategory)} </span>
              <strong className="capitalize">{insight.topCategory}</strong> is your
              biggest source — {insight.sharePct}% of the last 7 days
              {insight.delta !== null && (
                <>
                  {' '}({insight.delta >= 0 ? '+' : ''}
                  {insight.delta}% vs. prior week)
                </>
              )}
              .
            </p>
            <p className="mt-2 text-sm text-green-800">{insight.tip}</p>
          </div>
        )}

        {/* Quick-log presets — one-tap logging seeded from lifestyle */}
        {presets.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Quick log
            </h2>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickLog(p)}
                  className={`flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-green-50 ${focusVisible}`}
                >
                  <span aria-hidden="true">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <button
            ref={logActivityButtonRef}
            type="button"
            onClick={() => openModal()}
            className={`flex flex-col items-center gap-2 rounded-xl bg-green-100 p-4 text-center transition-all hover:bg-green-200 ${focusVisible}`}
          >
            <span className="text-2xl" aria-hidden="true">📝</span>
            <span className="text-xs font-medium text-green-800">Log Activity</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/chat')}
            className={`flex flex-col items-center gap-2 rounded-xl bg-blue-100 p-4 text-center transition-all hover:bg-blue-200 ${focusVisible}`}
          >
            <span className="text-2xl" aria-hidden="true">🤖</span>
            <span className="text-xs font-medium text-blue-800">Get AI Tip</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/simulator')}
            className={`flex flex-col items-center gap-2 rounded-xl bg-purple-100 p-4 text-center transition-all hover:bg-purple-200 ${focusVisible}`}
          >
            <span className="text-2xl" aria-hidden="true">🔬</span>
            <span className="text-xs font-medium text-purple-800">What If...</span>
          </button>
        </div>

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div className="glass p-5">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Recent Activity
            </h2>
            <ul className="space-y-2" aria-label="Recent carbon entries">
              {recentEntries.map((entry) => {
                const sharePct =
                  budget.budgetKg > 0
                    ? Math.round((entry.co2Kg / budget.budgetKg) * 100)
                    : 0;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">
                        {getCategoryIcon(entry.category)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-700">{entry.activity}</span>
                        <span className="text-xs text-gray-500">
                          {sharePct}% of today&apos;s budget
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.co2Kg.toFixed(1)} kg
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRepeat(entry)}
                        aria-label={`Repeat ${entry.activity}`}
                        className={`rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-green-50 ${focusVisible}`}
                      >
                        Repeat
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          ref={modalRef}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 id="modal-title" className="mb-4 text-xl font-bold text-gray-900">
              Log Activity
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="category"
                  ref={firstFieldRef}
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as CarbonCategory;
                    setCategory(cat);
                    setActivity(activityOptions[cat][0].value);
                  }}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 ${focusVisible}`}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {getCategoryIcon(c.value)} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="activity" className="mb-1 block text-sm font-medium text-gray-700">
                  Activity
                </label>
                <select
                  id="activity"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 ${focusVisible}`}
                >
                  {activityOptions[category].map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder={getQuantityPlaceholder(category, activity)}
                  aria-required="true"
                  aria-describedby="quantity-help quantity-error"
                  aria-invalid={formError ? true : undefined}
                  className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 ${focusVisible}`}
                />
                <p id="quantity-help" className="mt-1 text-xs text-gray-500">
                  Enter a positive number.
                </p>
                <p
                  id="quantity-error"
                  role="alert"
                  aria-live="polite"
                  className="mt-1 min-h-[1rem] text-xs text-red-600"
                >
                  {formError ?? ''}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 ${focusVisible}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogActivity}
                  className={`flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 ${focusVisible}`}
                >
                  Log Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </main>
  );
}
