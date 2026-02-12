// src/app/settings/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile page by default
    router.replace('/settings/profile');
  }, [router]);

  return null;
}
