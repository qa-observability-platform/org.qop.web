'use client';

import { useEffect, useRef, useState } from 'react';

type LiveBrowserViewerProps = {
  runId: string;
  testCaseExecutionId?: string;
};

type StreamMetadata = {
  width: number;
  height: number;
  deviceWidth: number;
  deviceHeight: number;
  format?: string;
  isBrowserWithUrlBar?: boolean;
  pageTitle?: string;
};

export default function LiveBrowserViewer({ runId, testCaseExecutionId }: LiveBrowserViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(Date.now());
  const fpsCounterRef = useRef<number[]>([]);

  useEffect(() => {
    console.log('[LiveBrowserViewer] Starting connection for runId:', runId);

    // Build WebSocket URL - always use ws://localhost:4000
    const streamUrl = `ws://localhost:4000/ws/browser-stream?runId=${runId}${testCaseExecutionId ? `&testCaseExecutionId=${testCaseExecutionId}` : ''}`;
    console.log('[LiveBrowserViewer] Connecting to:', streamUrl);

    const ws = new WebSocket(streamUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[LiveBrowserViewer] Connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[LiveBrowserViewer] Received message type:', message.type);

        if (message.type === 'stream_connected') {
          console.log('[LiveBrowserViewer] ✅ Stream connected');
        } else if (message.type === 'stream_started') {
          console.log('[LiveBrowserViewer] 🎬 Stream started');
          setIsStreaming(true);
        } else if (message.type === 'screencast_frame') {
          console.log('[LiveBrowserViewer] 🖼️ Frame received, size:', message.frameData?.length);
          // If we receive a frame, stream must be active - set streaming true
          setIsStreaming(true);
          handleFrame(message.frameData, message.metadata);
        } else if (message.type === 'stream_stopped') {
          console.log('[LiveBrowserViewer] ⏹️ Stream stopped');
          setIsStreaming(false);
        }
      } catch (err) {
        console.error('[LiveBrowserViewer] Error parsing message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[LiveBrowserViewer] WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('[LiveBrowserViewer] Disconnected');
      setIsConnected(false);
      setIsStreaming(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [runId, testCaseExecutionId]);

  const handleFrame = (frameData: string, metadata?: StreamMetadata) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Get the container dimensions
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth - 32; // Account for padding
      const containerHeight = container.clientHeight - 32;

      // Use image's natural dimensions
      const imageWidth = img.naturalWidth;
      const imageHeight = img.naturalHeight;

      // Calculate scale to fit container while maintaining aspect ratio
      const scale = Math.min(
        containerWidth / imageWidth,
        containerHeight / imageHeight
      );

      // Set canvas to scaled dimensions
      canvas.width = imageWidth * scale;
      canvas.height = imageHeight * scale;

      // Draw the scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Update frame count and FPS
      setFrameCount((prev) => prev + 1);
      updateFPS();
    };

    const format = metadata?.format || 'png';
    img.src = `data:image/${format};base64,${frameData}`;
  };

  const updateFPS = () => {
    const now = Date.now();
    fpsCounterRef.current.push(now);

    // Keep only last 30 frames for FPS calculation
    if (fpsCounterRef.current.length > 30) {
      fpsCounterRef.current.shift();
    }

    // Calculate FPS based on last 30 frames
    if (fpsCounterRef.current.length >= 2) {
      const timeSpan = (now - fpsCounterRef.current[0]) / 1000; // seconds
      const calculatedFps = Math.round(fpsCounterRef.current.length / timeSpan);
      setFps(calculatedFps);
    }

    setLastFrameTime(now);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Live Browser View</h2>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Streaming Status */}
          {isConnected && (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <span className="text-xs text-gray-400">
                {isStreaming ? 'Streaming' : 'Waiting for stream...'}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Frames: {frameCount}</span>
          <span>FPS: {fps}</span>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto bg-gray-950 flex items-center justify-center p-4">
        {!isStreaming && (
          <div className="text-center">
            <div className="text-gray-500 mb-2">
              {isConnected ? (
                <>
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Waiting for test execution to start streaming...</p>
                  <p className="text-xs mt-1 text-gray-600">
                    Make sure QOP_ENABLE_LIVE_VIEW=true is set in your test environment
                  </p>
                </>
              ) : (
                <>
                  <svg className="w-16 h-16 mx-auto mb-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">Disconnected from stream server</p>
                  <p className="text-xs mt-1 text-gray-600">Check that the Node API server is running</p>
                </>
              )}
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`border border-gray-700 rounded shadow-2xl ${!isStreaming ? 'hidden' : ''}`}
          style={{
            imageRendering: 'auto',
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Run ID: {runId}</span>
          {testCaseExecutionId && <span>Test ID: {testCaseExecutionId}</span>}
        </div>
      </div>
    </div>
  );
}
