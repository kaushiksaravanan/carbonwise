'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/simulator', label: 'Simulator', icon: '🔬' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span
                  className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span
                  className={
                    isActive
                      ? 'border-b-2 border-green-500 pb-0.5'
                      : 'pb-0.5'
                  }
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
