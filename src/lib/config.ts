// src/lib/config.ts
// Runtime configuration — reads from window.__QOP_CONFIG__ injected by the server layout.
// Falls back to NEXT_PUBLIC_ env vars (baked at build time) for local dev.

declare global {
  interface Window {
    __QOP_CONFIG__?: { apiUrl: string; wsUrl: string };
  }
}

export function getApiBase(): string {
  if (typeof window !== 'undefined' && window.__QOP_CONFIG__?.apiUrl) {
    return window.__QOP_CONFIG__.apiUrl;
  }
  return process.env.NEXT_PUBLIC_QOP_API_URL || 'http://localhost:4000';
}

export function getWsBase(): string {
  if (typeof window !== 'undefined' && window.__QOP_CONFIG__?.wsUrl) {
    return window.__QOP_CONFIG__.wsUrl;
  }
  return process.env.NEXT_PUBLIC_QOP_WS_URL || 'ws://localhost:4000';
}
