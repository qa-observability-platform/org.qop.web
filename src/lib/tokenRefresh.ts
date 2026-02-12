// src/lib/tokenRefresh.ts
// Proactive token refresh utility

import { tokenStorage, api } from './api';

// JWT token payload interface
interface JWTPayload {
  userId: string;
  email: string;
  iat: number; // Issued at (seconds)
  exp: number; // Expires at (seconds)
}

/**
 * Decode JWT token to get payload (without verification - client-side only)
 */
function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[TokenRefresh] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if token will expire soon (within the next 5 minutes)
 */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Assume expired if can't decode
  }

  const expiresAt = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  return expiresAt - now < fiveMinutes;
}

/**
 * Check if token is already expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const expiresAt = payload.exp * 1000;
  const now = Date.now();

  return now >= expiresAt;
}

/**
 * Setup automatic token refresh
 * - Checks token every minute
 * - Refreshes if token will expire within 5 minutes
 * - Returns cleanup function to stop the interval
 */
export function setupTokenRefresh(): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let isRefreshing = false;

  const checkAndRefreshToken = async () => {
    // Skip if already refreshing
    if (isRefreshing) {
      return;
    }

    // Skip if running on server
    if (typeof window === 'undefined') {
      return;
    }

    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    // No tokens, nothing to refresh
    if (!accessToken || !refreshToken) {
      return;
    }

    // Check if access token is expired or expiring soon
    if (isTokenExpired(accessToken) || isTokenExpiringSoon(accessToken)) {
      isRefreshing = true;

      try {
        console.log('[TokenRefresh] Access token expiring soon, refreshing...');

        const newTokens = await api.auth.refreshToken(refreshToken);
        tokenStorage.setTokens(newTokens);

        console.log('[TokenRefresh] Token refreshed successfully');
      } catch (error) {
        console.error('[TokenRefresh] Failed to refresh token:', error);

        // If refresh token is also expired/invalid, clear tokens
        tokenStorage.clearTokens();

        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      } finally {
        isRefreshing = false;
      }
    }
  };

  // Check immediately on setup
  checkAndRefreshToken();

  // Then check every minute
  intervalId = setInterval(checkAndRefreshToken, 60 * 1000);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTokenExpiryTime(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  const expiresAt = payload.exp * 1000;
  const now = Date.now();

  return expiresAt - now;
}

/**
 * Format time until expiry as human-readable string
 */
export function formatTimeUntilExpiry(token: string): string {
  const timeUntilExpiry = getTokenExpiryTime(token);

  if (timeUntilExpiry === null || timeUntilExpiry <= 0) {
    return 'Expired';
  }

  const seconds = Math.floor(timeUntilExpiry / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
