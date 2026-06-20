'use client';

import { useEffect, useState } from 'react';
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
import { calculateActivityEmission } from '@/lib/carbon-calculator';
import { UserProfile, CarbonEntry, DailyBudget, CarbonCategory } from '@/types';
import CarbonBudget from '@/components/CarbonBudget';
import Garden from '@/components/Garden';
import Navigation from '@/components/Navigation';

const categories: { value: CarbonCategory; label: string; icon: string }[] = [
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'energy', label: 'Energy', icon: '⚡' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '📦' },
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

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [budget, setBudget] = useState<DailyBudget | null>(null);
  const [recentEntries, setRecentEntries] = useState<CarbonEntry[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [category, setCategory] = useState<CarbonCategory>('transport');
  const [activity, setActivity] = useState('drive-car');
  const [quantity, setQuantity] = useState('');

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace('/');
      return;
    }
    setProfile(p);

    const todayBudget = getTodayBudget(p);
    setBudget(todayBudget);

    const entries = getEntries();
    setRecentEntries(entries.slice(-5).reverse());

    // Update garden
    const updatedGarden = updateGarden(p);
    if (JSON.stringify(updatedGarden) !== JSON.stringify(p.garden)) {
      const updatedProfile = { ...p, garden: updatedGarden };
      saveProfile(updatedProfile);
      setProfile(updatedProfile);
    }
  }, [router]);

  function handleLogActivity() {
    if (!profile || !quantity) return;

    const co2Kg = calculateActivityEmission(category, activity, parseFloat(quantity));
    const entry: CarbonEntry = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      category,
      activity,
      co2Kg,
      isReduction: false,
    };

    addEntry(entry);

    // Refresh
    const todayBudget = getTodayBudget(profile);
    setBudget(todayBudget);
    const entries = getEntries();
    setRecentEntries(entries.slice(-5).reverse());

    setShowModal(false);
    setQuantity('');
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (!profile || !budget) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20 pt-6">
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

        {/* Quick Actions */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center gap-2 rounded-xl bg-green-100 p-4 text-center transition-all hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          >
            <span className="text-2xl" aria-hidden="true">📝</span>
            <span className="text-xs font-medium text-green-800">Log Activity</span>
          </button>
          <button
            onClick={() => router.push('/chat')}
            className="flex flex-col items-center gap-2 rounded-xl bg-blue-100 p-4 text-center transition-all hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <span className="text-2xl" aria-hidden="true">🤖</span>
            <span className="text-xs font-medium text-blue-800">Get AI Tip</span>
          </button>
          <button
            onClick={() => router.push('/simulator')}
            className="flex flex-col items-center gap-2 rounded-xl bg-purple-100 p-4 text-center transition-all hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
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
              {recentEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">
                      {categories.find((c) => c.value === entry.category)?.icon}
                    </span>
                    <span className="text-sm text-gray-700">{entry.activity}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {entry.co2Kg.toFixed(1)} kg
                  </span>
                </li>
              ))}
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
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as CarbonCategory;
                    setCategory(cat);
                    setActivity(activityOptions[cat][0].value);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
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
                  min="0"
                  step="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g., 10"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogActivity}
                  disabled={!quantity || parseFloat(quantity) <= 0}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
