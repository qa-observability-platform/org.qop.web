// src/components/UserMenu.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/auth/login"
        className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium text-center transition-colors"
      >
        Sign In
      </Link>
    );
  }

  const primaryRole = user.roles?.[0];
  const orgRole = user.roles?.find(r => r.scope === 'ORGANIZATION');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-semibold">
            {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {primaryRole?.role || 'User'}
            </div>
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-slate-700">
              <div className="text-sm font-medium">{user.email}</div>
              {orgRole && (
                <div className="text-xs text-slate-400 mt-1">
                  {orgRole.role} • Organization Member
                </div>
              )}
              {!user.isEmailVerified && (
                <div className="text-xs text-amber-400 mt-2">
                  ⚠️ Email not verified
                </div>
              )}
            </div>

            <div className="py-1">
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm hover:bg-slate-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                ⚙️ Settings
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors text-rose-400"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}