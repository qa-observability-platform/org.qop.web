// src/contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStorage, type AuthUser } from '@/lib/api';
import { setupTokenRefresh } from '@/lib/tokenRefresh';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  getCurrentOrgId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user on mount and setup token refresh
  useEffect(() => {
    loadUser();

    // Setup automatic token refresh (checks every minute)
    const cleanup = setupTokenRefresh();

    // Cleanup on unmount
    return cleanup;
  }, []);

  const loadUser = async () => {
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const currentUser = await api.auth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      tokenStorage.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login({ email, password });
      
      tokenStorage.setTokens(response.tokens);
      setUser(response.user);
      
      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    organizationName: string;
  }) => {
    try {
      await api.auth.register(data);
      router.push('/auth/login?registered=true');
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        await api.auth.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
      router.push('/auth/login');
    }
  };

  const getCurrentOrgId = (): string | null => {
    if (!user) return null;

    // Find the user's organization role (ORG_OWNER, ORG_ADMIN, etc.)
    const orgRole = user.roles.find(
      (role) => role.scope === 'ORGANIZATION' && role.scopeId
    );

    return orgRole?.scopeId || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        getCurrentOrgId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}