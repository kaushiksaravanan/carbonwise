'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProfile,
  getChatHistory,
  saveChatHistory,
  generateId,
  getEntries,
} from '@/lib/storage';
import { CarbonEntry, ChatMessage, UserProfile } from '@/types';
import ChatBubble from '@/components/ChatBubble';
import LottieAnimation from '@/components/LottieAnimation';
import Navigation from '@/components/Navigation';

// ---------------------------------------------------------------------------
// Garden persona — gives the coach a memorable identity tied to the user's
// Carbon Twin instead of a generic ChatGPT-wrapper voice. The coach speaks
// in first-person AS the garden ("my leaves are thirsty"). Mood is derived
// from recent budget data; species is derived from lifestyle.
// ---------------------------------------------------------------------------

type GardenMood = 'parched' | 'wilting' | 'content' | 'thriving';

interface CoachPersona {
  name: string;
  species: string;
  mood: GardenMood;
  emoji: string;
  color: string;
  greeting: string;
}

function pickCoachIdentity(profile: UserProfile): { name: string; species: string } {
  // Stable per-profile pick — name/species shouldn't change between visits.
  const seed = profile.id?.length ?? profile.name.length;
  const lifestyle = profile.lifestyle;

  // Species reflects the dominant lifestyle dimension
  const speciesByDiet: Record<string, string> = {
    vegan: 'Verdant Fern',
    vegetarian: 'Mossy Oak',
    balanced: 'Ferrum Magnolia',
    'meat-heavy': 'Smoky Pine',
  };
  const speciesByTransport: Record<string, string> = {
    bike: 'Wind Willow',
    walk: 'Wanderer Birch',
    public: 'Civic Cedar',
    car: 'Asphalt Aspen',
    mixed: 'Twilight Maple',
  };

  // Pick from diet first; fall back to transport
  const species =
    speciesByDiet[lifestyle.diet] ||
    speciesByTransport[lifestyle.transport] ||
    'Ferrum Magnolia';

  const names = ['Sage', 'Thistle', 'Rowan', 'Linden', 'Fern', 'Aspen', 'Juno', 'Bryn'];
  const name = names[seed % names.length];

  return { name, species };
}

function moodFromBudget(used: number, baseline: number): GardenMood {
  if (baseline <= 0) return 'content';
  const ratio = used / baseline;
  if (ratio >= 1.25) return 'wilting';
  if (ratio >= 1.0) return 'parched';
  if (ratio >= 0.6) return 'content';
  return 'thriving';
}

const MOOD_VISUALS: Record<GardenMood, { emoji: string; color: string; line: string }> = {
  parched: {
    emoji: '🥀',
    color: 'bg-amber-50 border-amber-300',
    line: 'My leaves are a little thirsty today.',
  },
  wilting: {
    emoji: '🍂',
    color: 'bg-red-50 border-red-300',
    line: 'I felt a heavy day on my roots.',
  },
  content: {
    emoji: '🌿',
    color: 'bg-green-50 border-green-300',
    line: 'I am settled and listening.',
  },
  thriving: {
    emoji: '🌳',
    color: 'bg-emerald-50 border-emerald-400',
    line: 'I feel the sun — your choices are nourishing me.',
  },
};

function buildPersona(profile: UserProfile, recentEntries: CarbonEntry[]): CoachPersona {
  const { name, species } = pickCoachIdentity(profile);
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = recentEntries
    .filter((e) => e.date === today && !e.isReduction)
    .reduce((sum, e) => sum + e.co2Kg, 0);
  // Crude baseline: 10kg/day if we have nothing better. The API computes the real one;
  // this is just for the avatar mood display.
  const baseline = 10;
  const mood = moodFromBudget(usedToday, baseline);
  const visuals = MOOD_VISUALS[mood];

  return {
    name,
    species,
    mood,
    emoji: visuals.emoji,
    color: visuals.color,
    greeting: visuals.line,
  };
}

export default function ChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<CarbonEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace('/');
      return;
    }
    setProfile(p);
    setEntries(getEntries());

    const history = getChatHistory();
    if (history.length > 0) {
      // Preserve original timestamps when present so they round-trip across reloads.
      const chatMessages: ChatMessage[] = history.map((msg, i) => ({
        id: `history-${i}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp ?? new Date(0).toISOString(),
      }));
      setMessages(chatMessages);
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const persona = useMemo(
    () => (profile ? buildPersona(profile, entries) : null),
    [profile, entries]
  );

  // Last 3 logged actions, used for grounding the coach in real behavior.
  const recentActions = useMemo(
    () =>
      entries
        .slice(-3)
        .map((e) => ({
          date: e.date,
          activity: e.activity,
          category: e.category,
          co2Kg: e.co2Kg,
          isReduction: e.isReduction,
        })),
    [entries]
  );

  async function handleSend() {
    if (!input.trim() || !profile || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Build the API history once: take everything except the just-added
      // message, then keep only the last 9 turns of context.
      const history = updatedMessages.slice(-11, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          profile,
          history,
          entries: recentActions,
          // Persona context — coach speaks AS the garden, grounded in real entries.
          persona: persona
            ? {
                name: persona.name,
                species: persona.species,
                mood: persona.mood,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      const allMessages = [...updatedMessages, assistantMessage];
      setMessages(allMessages);

      // Persist with timestamps so they round-trip across reloads.
      saveChatHistory(
        allMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      );
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content:
          error instanceof Error
            ? `Sorry, I couldn't respond: ${error.message}`
            : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
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
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-green-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <span className="text-2xl" aria-hidden="true">{persona?.emoji ?? '🌱'}</span>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-green-900">
              {persona ? `${persona.name}, your ${persona.species}` : 'CarbonWise Coach'}
            </h1>
            {persona && (
              <p className="text-xs text-green-700/80" aria-label={`Mood: ${persona.mood}`}>
                {persona.greeting}
              </p>
            )}
          </div>
        </div>
      </header>

      {/*
        Messages — role="log" gives an implicit polite live region with
        chronological semantics, which is more appropriate than role="list"
        for a chat transcript. New assistant messages will be announced to
        screen readers.
      */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-36 pt-4"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        aria-label="Chat messages"
      >
        <div className="mx-auto max-w-lg">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-4 text-5xl" aria-hidden="true">{persona?.emoji ?? '🌿'}</span>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                {persona
                  ? `I'm ${persona.name} — your ${persona.species}.`
                  : `Hi, ${profile.name}!`}
              </h2>
              <p className="text-sm text-gray-600">
                {persona
                  ? `Hi ${profile.name}. I grow with every choice you make. Tell me what you did today, or ask me what I'm feeling.`
                  : 'Ask me anything about reducing your carbon footprint, understanding your impact, or getting personalized eco tips.'}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/*
            Loading indicator wrapped in role="status" so "Thinking..." is
            announced to screen readers as a polite live region update.
          */}
          {isLoading && (
            <div
              className="flex justify-start mb-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-green-100 px-4 py-3">
                <LottieAnimation
                  src="/animations/leaf-loading.json"
                  loop
                  autoplay
                  className="h-6 w-6"
                  ariaLabel="Loading response"
                />
                <span className="text-sm text-green-700">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
        {persona && (
          <div
            className={`mx-auto flex max-w-lg items-center gap-2 border-l-4 px-4 py-1 text-xs ${persona.color}`}
            aria-hidden="true"
          >
            <span className="text-base">{persona.emoji}</span>
            <span className="text-gray-700">
              {persona.name} feels {persona.mood}.
            </span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              persona
                ? `Talk to ${persona.name}...`
                : 'Ask about your carbon footprint...'
            }
            disabled={isLoading}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:opacity-50"
            aria-label="Type your message"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
            aria-label="Send message"
          >
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>

      <Navigation />
    </main>
  );
}
