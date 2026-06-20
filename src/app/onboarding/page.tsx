'use client';

import { useRouter } from 'next/navigation';
import OnboardingQuiz from '@/components/OnboardingQuiz';
import { generateId, saveProfile } from '@/lib/storage';
import { LifestyleData, UserProfile, GardenState } from '@/types';

export default function OnboardingPage() {
  const router = useRouter();

  function handleComplete(lifestyle: LifestyleData) {
    const initialGarden: GardenState = {
      trees: 0,
      flowers: 1,
      health: 80,
      level: 1,
      lastWatered: new Date().toISOString().split('T')[0],
    };

    const profile: UserProfile = {
      id: generateId(),
      name: 'EcoWarrior',
      createdAt: new Date().toISOString(),
      lifestyle,
      garden: initialGarden,
      streak: 0,
      totalCO2Saved: 0,
    };

    saveProfile(profile);
    router.push('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <span className="mb-2 block text-4xl" aria-hidden="true">
            🌍
          </span>
          <h1 className="text-2xl font-bold text-green-900">
            Let&apos;s learn about you
          </h1>
          <p className="mt-1 text-sm text-green-700">
            Quick questions to personalize your carbon journey
          </p>
        </div>

        <OnboardingQuiz onComplete={handleComplete} />
      </div>
    </main>
  );
}
