'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/docs/quickstart', label: 'Quick Start', icon: '🚀' },
  { href: '/docs/api-keys', label: 'API Keys', icon: '🔑' },
  { href: '/docs/reporters', label: 'Reporter Setup', icon: '📡' },
  { href: '/docs/environment-variables', label: 'Environment Variables', icon: '🔧' },
  { href: '/docs/how-it-works', label: 'How It Works', icon: '⚙️' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Documentation</h1>
        <p className="text-sm text-slate-400">
          Setup guides and reference for QOP reporters and API integration
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-56 flex-shrink-0">
          <nav className="sticky top-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
