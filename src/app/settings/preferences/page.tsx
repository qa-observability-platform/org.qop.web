// src/app/settings/preferences/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  defaultTimeRange: '7d' | '30d' | '90d';
  timezone: string;
}

export default function PreferencesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    defaultTimeRange: '7d',
    timezone: 'America/New_York',
  });

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.users.updatePreferences(preferences);
      setSuccess('Preferences saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Preferences</h2>
        <p className="text-sm text-slate-400">
          Customize your experience
        </p>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Display Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Display Settings</h3>

        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={preferences.theme}
            onChange={(e) =>
              setPreferences({ ...preferences, theme: e.target.value as any })
            }
            className="w-full max-w-md px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Default Time Range</label>
          <select
            value={preferences.defaultTimeRange}
            onChange={(e) =>
              setPreferences({ ...preferences, defaultTimeRange: e.target.value as any })
            }
            className="w-full max-w-md px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Default time range for dashboard charts and reports
          </p>
        </div>
      </div>

      {/* Date & Time Settings */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <h3 className="text-lg font-medium">Date & Time</h3>

        <div>
          <label className="block text-sm font-medium mb-2">Date Format</label>
          <select
            value={preferences.dateFormat}
            onChange={(e) =>
              setPreferences({ ...preferences, dateFormat: e.target.value as any })
            }
            className="w-full max-w-md px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY (12/14/2025)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (14/12/2025)</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-14)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Time Format</label>
          <select
            value={preferences.timeFormat}
            onChange={(e) =>
              setPreferences({ ...preferences, timeFormat: e.target.value as any })
            }
            className="w-full max-w-md px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="12h">12-hour (2:30 PM)</option>
            <option value="24h">24-hour (14:30)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Timezone</label>
          <select
            value={preferences.timezone}
            onChange={(e) =>
              setPreferences({ ...preferences, timezone: e.target.value })
            }
            className="w-full max-w-md px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Shanghai">Shanghai (CST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-6 border-t border-slate-800">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
