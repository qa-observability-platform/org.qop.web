// src/app/settings/profile/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.auth.updateProfile(profileData);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      // Reload user data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await api.auth.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setSuccess('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Profile Settings</h2>
        <p className="text-sm text-slate-400">
          Manage your personal information and account security
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

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Email Address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={user.email}
                disabled
                className="flex-1 px-3 py-2 rounded bg-slate-800/50 border border-slate-700 text-slate-400 cursor-not-allowed"
              />
              {!user.isEmailVerified && (
                <button className="px-4 py-2 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm hover:bg-amber-500/30 transition-colors">
                  Verify Email
                </button>
              )}
              {user.isEmailVerified && (
                <span className="px-3 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, firstName: e.target.value })
                  }
                  disabled={!isEditing}
                  className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, lastName: e.target.value })
                  }
                  disabled={!isEditing}
                  className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="flex gap-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                      });
                    }}
                    disabled={loading}
                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="pt-6 border-t border-slate-800">
        <h3 className="text-lg font-medium mb-4">Change Password</h3>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              required
              minLength={8}
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimum 8 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
