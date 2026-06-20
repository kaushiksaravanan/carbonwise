'use client';

import { ChatMessage } from '@/types';

interface ChatBubbleProps {
  message: ChatMessage;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      role="listitem"
      aria-label={`${isUser ? 'You' : 'Assistant'} at ${time}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'rounded-br-sm bg-blue-500 text-white'
            : 'rounded-bl-sm bg-green-100 text-green-900'
        }`}
      >
        {!isUser && (
          <span className="mb-1 block text-sm" aria-hidden="true">
            🍃
          </span>
        )}
        <p className="text-sm leading-relaxed">{message.content}</p>
        <time
          dateTime={message.timestamp}
          className={`mt-1 block text-xs ${
            isUser ? 'text-blue-100' : 'text-green-600'
          }`}
        >
          {time}
        </time>
      </div>
    </div>
  );
}
