'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface Screenshot {
  id: string;
  test_case_execution_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  screenshot_type: string;
  storage_type: string;
  created_at: string;
}

interface ScreenshotGalleryProps {
  executionId: string;
}

export default function ScreenshotGallery({ executionId }: ScreenshotGalleryProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);

  useEffect(() => {
    loadScreenshots();
  }, [executionId]);

  const loadScreenshots = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/screenshots/execution/${executionId}`);
      if (res.ok) {
        const json = await res.json();
        setScreenshots(json.screenshots || []);
      }
    } catch (err) {
      console.error('Failed to load screenshots:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScreenshotUrl = (screenshotId: string) => {
    return `${API_BASE}/api/screenshots/${screenshotId}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (screenshots.length === 0) {
    return null; // Don't show anything if there are no screenshots
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-gray-200 mb-3">
        Screenshots ({screenshots.length})
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {screenshots.map((screenshot) => (
          <div
            key={screenshot.id}
            className="relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500 transition"
            onClick={() => setSelectedScreenshot(screenshot)}
          >
            <img
              src={getScreenshotUrl(screenshot.id)}
              alt={screenshot.file_name}
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition"
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
            <div className="p-2 bg-gray-750">
              <p className="text-xs text-gray-400 truncate">{screenshot.file_name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(screenshot.file_size)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for viewing full screenshot */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div
            className="relative max-w-6xl max-h-[90vh] bg-gray-800 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedScreenshot.file_name}</h3>
                <p className="text-sm text-gray-400">
                  {formatFileSize(selectedScreenshot.file_size)} • {new Date(selectedScreenshot.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <img
                src={getScreenshotUrl(selectedScreenshot.id)}
                alt={selectedScreenshot.file_name}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
