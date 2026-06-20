'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, getChatHistory, saveChatHistory, generateId } from '@/lib/storage';
import { ChatMessage, UserProfile } from '@/types';
import ChatBubble from '@/components/ChatBubble';
import LottieAnimation from '@/components/LottieAnimation';
import Navigation from '@/components/Navigation';

export default function ChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

    const history = getChatHistory();
    if (history.length > 0) {
      const chatMessages: ChatMessage[] = history.map((msg, i) => ({
        id: `history-${i}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date().toISOString(),
      }));
      setMessages(chatMessages);
    }
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const history = updatedMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          profile,
          history: history.slice(0, -1), // exclude the current message (sent as `message`)
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

      // Save to localStorage
      saveChatHistory(
        allMessages.map((m) => ({ role: m.role, content: m.content }))
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
          <span className="text-2xl" aria-hidden="true">🌱</span>
          <h1 className="text-lg font-bold text-green-900">CarbonWise Coach</h1>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-36 pt-4"
        role="list"
        aria-label="Chat messages"
      >
        <div className="mx-auto max-w-lg">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-4 text-5xl" aria-hidden="true">🌿</span>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                Hi, {profile.name}!
              </h2>
              <p className="text-sm text-gray-600">
                Ask me anything about reducing your carbon footprint, understanding your
                impact, or getting personalized eco tips.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-3">
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
            placeholder="Ask about your carbon footprint..."
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
