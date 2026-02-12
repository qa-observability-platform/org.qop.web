// src/app/layout.tsx
'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider } from '@/contexts/AuthContext';
import UserMenu from '@/components/UserMenu';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show navigation on auth pages
  const isAuthPage = pathname?.startsWith('/auth');

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  return (
    <html lang="en" className="h-full">
      <head>
        <title>QOP – QA Observability Platform</title>
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AuthProvider>
          {isAuthPage ? (
            // Auth pages - no sidebar
            <main className="min-h-screen">{children}</main>
          ) : (
            // Main app - with sidebar (protected)
            <ProtectedRoute>
              <div className="flex min-h-screen">
                <aside className="w-64 border-r border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-4">
                  <div className="text-xl font-semibold tracking-tight">
                    <span className="text-emerald-400">Q</span>
                    <span className="text-slate-100">OP</span>
                    <div className="text-xs text-slate-400">qa-observability-platform</div>
                  </div>

                  <nav className="flex flex-col gap-2 text-sm">
                    <Link
                      href="/dashboard"
                      className={`px-3 py-2 rounded-md transition-colors ${isActive('/dashboard') && !isActive('/dashboard-clean') && !isActive('/dashboard-legacy')
                          ? 'bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                      📊 Dashboard
                    </Link>

                    <Link
                      href="/dashboard-legacy"
                      className={`px-3 py-2 rounded-md transition-colors ${isActive('/dashboard-legacy')
                          ? 'bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                      📅 Day-wise Execution Summary
                    </Link>

                    <Link
                      href="/live-execution"
                      className={`px-3 py-2 rounded-md transition-colors flex items-center justify-between ${isActive('/live-execution')
                          ? 'bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                      <span>⚡ Live Execution</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </Link>

                    <div className="border-t border-slate-800 my-2"></div>

                    <Link
                      href="/organizations"
                      className={`px-3 py-2 rounded-md transition-colors ${isActive('/organizations')
                          ? 'bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                      🏢 Organizations
                    </Link>

                    <Link
                      href="/projects"
                      className={`px-3 py-2 rounded-md transition-colors ${isActive('/projects')
                          ? 'bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                      📦 Projects
                    </Link>
                  </nav>

                  <div className="mt-auto space-y-2">
                    <Link
                      href="/settings"
                      className={`px-3 py-2 rounded-md transition-colors flex items-center gap-2 text-sm ${isActive('/settings')
                          ? 'bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/50 text-slate-400'
                        }`}
                    >
                      ⚙️ Settings
                    </Link>
                    <UserMenu />
                  </div>

                  <div className="text-xs text-slate-500">
                    v2.0.0 - Auth Ready
                  </div>
                </aside>

                <main className="flex-1 p-6 overflow-auto">{children}</main>
              </div>
            </ProtectedRoute>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}