// src/app/invitations/accept/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Step = 'loading' | 'new-user' | 'existing-user' | 'success' | 'error';

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form fields for new users
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token provided.');
      setStep('error');
      return;
    }

    // Try accepting without a password — if the user already exists, it will succeed.
    // If they need to create an account, the server will return 400 asking for a password.
    api.invitations
      .accept(token)
      .then(() => setStep('success'))
      .catch((err: any) => {
        const msg: string = err.message || '';
        if (msg.includes('Password is required for new users')) {
          setStep('new-user');
        } else if (msg.includes('already exists')) {
          // Existing user who isn't logged in — just tell them to log in
          setStep('existing-user');
        } else {
          setErrorMsg(msg || 'Invalid or expired invitation link.');
          setStep('error');
        }
      });
  }, [token]);

  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      await api.invitations.accept(token!, { password, firstName, lastName });
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold mb-1">
            <span className="text-emerald-400">QOP</span>
          </div>
          <p className="text-slate-400 text-sm">QA Observability Platform</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Verifying invitation...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
              <Link
                href="/auth/login"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}

          {step === 'existing-user' && (
            <div className="text-center">
              <div className="text-4xl mb-4">🔐</div>
              <h2 className="text-xl font-semibold mb-2">Account Already Exists</h2>
              <p className="text-slate-400 text-sm mb-6">
                Please log in with your existing account to accept this invitation.
              </p>
              <Link
                href={`/auth/login?redirect=/invitations/accept?token=${token}`}
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                Log In
              </Link>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-semibold mb-2">Invitation Accepted!</h2>
              <p className="text-slate-400 text-sm mb-6">
                You now have access. Log in to get started.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                Log In
              </Link>
            </div>
          )}

          {step === 'new-user' && (
            <>
              <h2 className="text-xl font-semibold mb-1">Create Your Account</h2>
              <p className="text-slate-400 text-sm mb-6">
                Complete your profile to accept the invitation.
              </p>

              <form onSubmit={handleNewUserSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-sm"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-sm"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-sm"
                    placeholder="Repeat password"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating account...' : 'Create Account & Accept'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AcceptInvitationForm />
    </Suspense>
  );
}
