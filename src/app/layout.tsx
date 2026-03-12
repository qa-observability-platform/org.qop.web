// src/app/layout.tsx  (server component — reads runtime env vars)
import ClientLayout from './client-layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read at runtime from environment — works without rebuilding the image.
  // For local dev these come from .env.local; for Docker they come from docker-compose env.
  const apiUrl = process.env.QOP_API_URL || 'http://localhost:4000';
  const wsUrl  = process.env.QOP_WS_URL  || 'ws://localhost:4000';

  return (
    <html lang="en" className="h-full">
      <head>
        <title>QOP – QA Observability Platform</title>
        {/* Inject runtime config before any JS — client code reads window.__QOP_CONFIG__ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__QOP_CONFIG__=${JSON.stringify({ apiUrl, wsUrl })}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
