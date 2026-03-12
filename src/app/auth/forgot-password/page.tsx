// src/app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return setError('Email is required.');
    if (!emailRegex.test(email)) return setError('Enter a valid email address.');

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold mb-2">
            <span className="text-emerald-400">Q</span>
            <span className="text-slate-100">OP</span>
          </div>
          <p className="text-slate-400 text-sm">QA Observability Platform</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-8 shadow-2xl">
          {submitted ? (
            <div className="text-center">
              {/* Success icon */}
              <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm mb-6">
                If an account exists for <span className="text-slate-200">{email}</span>, a password reset link has been sent.
              </p>
              <Link
                href="/auth/login"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold mb-2">Forgot Password</h1>
              <p className="text-sm text-slate-400 mb-6">
                Enter your email address and we'll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-center text-sm text-slate-400">
                  Remembered your password?{' '}
                  <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          © 2024 QOP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
