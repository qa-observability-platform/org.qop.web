// src/app/auth/register/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!formData.organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        organizationName: formData.organizationName,
      });
      // Auto-redirects to dashboard after successful registration
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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

        {/* Register Card */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-8 shadow-2xl">
          <h1 className="text-2xl font-semibold mb-2">Create Account</h1>
          <p className="text-sm text-slate-400 mb-6">
            Sign up to start monitoring your test automation
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Name */}
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium mb-2">
                Organization Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                placeholder="Acme Corp"
              />
              <p className="text-xs text-slate-500 mt-1">
                You'll be the owner of this organization
              </p>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password <span className="text-rose-400">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                placeholder="••••••••"
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                href="/auth/login"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          © 2024 QOP. All rights reserved.
        </p>
      </div>
    </div>
  );
}