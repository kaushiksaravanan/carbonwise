'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProfile } from '@/lib/storage';
import LottieAnimation from '@/components/LottieAnimation';

const features = [
  {
    title: 'AI Carbon Coach',
    description: 'Get personalized advice powered by AI that understands your lifestyle.',
    icon: '🤖',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    title: 'Daily Budget',
    description: 'A smart carbon budget that adapts to your habits and goals.',
    icon: '📊',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    title: 'Digital Garden',
    description: 'Watch your garden grow as you reduce your carbon footprint.',
    icon: '🌱',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    title: 'What-If Simulator',
    description: 'Explore how lifestyle changes impact your carbon emissions.',
    icon: '🔬',
    gradient: 'from-purple-400 to-violet-500',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      router.replace('/dashboard');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-green-200/30 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-[300px] w-[300px] rounded-full bg-emerald-200/20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="mx-auto mb-8 w-48 h-48 sm:w-64 sm:h-64">
            <LottieAnimation
              src="/animations/tree-grow.json"
              loop
              autoplay
              className="h-full w-full"
              ariaLabel="Growing tree animation representing carbon reduction"
            />
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-green-900 sm:text-5xl md:text-6xl">
            Your Carbon Footprint,{' '}
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Reimagined
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg text-green-800/80 sm:text-xl">
            Track your impact. Grow your garden. Save the planet — one action at a time.
          </p>

          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-green-500/30 focus:outline-none focus:ring-4 focus:ring-green-300"
          >
            Get Started
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold text-green-900 sm:text-3xl">
            Everything you need to go greener
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass p-6 transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-2xl shadow-md`}
                >
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
