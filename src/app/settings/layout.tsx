// src/app/settings/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePermission } from '@/components/PermissionGuard';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const canViewOrg = usePermission('ORG_VIEW');
  const canManageTeam = usePermission('ORG_MANAGE_MEMBERS');

  const navItems = [
    { href: '/settings/profile', label: 'Profile', icon: '👤', show: true },
    { href: '/settings/organization', label: 'Organization', icon: '🏢', show: canViewOrg },
    { href: '/settings/team', label: 'Team', icon: '👥', show: canManageTeam },
    { href: '/settings/api-keys', label: 'API Keys', icon: '🔑', show: true },
    { href: '/settings/preferences', label: 'Preferences', icon: '⚙️', show: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-400">
          Manage your account, organization, and preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-56 flex-shrink-0">
          <nav className="sticky top-6 space-y-1">
            {navItems.filter(item => item.show).map((item) => {
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

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
