'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface Screenshot {
  id: string;
  file_name: string;
}

interface ScreenshotThumbnailProps {
  executionId: string;
  onClick?: () => void;
}

export default function ScreenshotThumbnail({ executionId, onClick }: ScreenshotThumbnailProps) {
  const [screenshot, setScreenshot] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScreenshot();
  }, [executionId]);

  const loadScreenshot = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/screenshots/execution/${executionId}`);
      if (res.ok) {
        const json = await res.json();
        // Get the first screenshot
        if (json.screenshots && json.screenshots.length > 0) {
          setScreenshot(json.screenshots[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load screenshot:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScreenshotUrl = (screenshotId: string) => {
    return `${API_BASE}/api/screenshots/${screenshotId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-16 h-16">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!screenshot) {
    return (
      <span className="text-xs text-gray-500">-</span>
    );
  }

  return (
    <div
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      <img
        src={getScreenshotUrl(screenshot.id)}
        alt={screenshot.file_name}
        className="w-16 h-16 object-cover rounded border border-gray-600 hover:border-blue-500 transition"
        title="Click to view all screenshots"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition rounded flex items-center justify-center">
        <svg
          className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
      </div>
    </div>
  );
}
