'use client';

import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">How It Works</h2>
        <p className="text-sm text-slate-400">
          Architecture overview and data flow
        </p>
      </div>

      {/* Connection flow */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Connection Flow</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          When your tests start, the QOP reporter follows this sequence:
        </p>
        <pre className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre">
{`Your Test Suite
     │
     │ 1. POST /auth/validate-key
     │    { apiKey: "qop_live_..." }
     │
     ▼
QOP Node.js API (port 4000)
     │
     │ 2. Returns: { wsUrl, sessionToken, projectKey }
     │
     ▼
Your Test Suite
     │
     │ 3. WebSocket connect (ws://.../ws/ingest?sessionToken=...)
     │
     ▼
QOP Node.js API
     │
     ├──► PostgreSQL (stores test results)
     │
     └──► WebSocket broadcast (ws://.../ws/live)
              │
              ▼
         QOP Dashboard (real-time updates)`}
        </pre>
      </div>

      {/* Authentication */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Authentication</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          The reporter sends your API key to <code className="text-emerald-300">POST /auth/validate-key</code>.
          The server validates the key against its SHA-256 hash, then returns:
        </p>
        <ul className="text-sm text-slate-300 space-y-1 ml-4 list-disc">
          <li><strong>wsUrl</strong> &mdash; WebSocket endpoint to connect to</li>
          <li><strong>sessionToken</strong> &mdash; Short-lived JWT (1 hour) for the WebSocket connection</li>
          <li><strong>projectKey</strong> &mdash; Your project identifier</li>
          <li><strong>applicationId</strong> &mdash; Auto-created if the app key doesn&apos;t exist yet</li>
        </ul>
        <p className="text-sm text-slate-300 leading-relaxed mt-2">
          The session token means the WebSocket connection is pre-authenticated &mdash; no database
          lookup needed on every connection. If validation fails, the reporter logs a warning and
          your tests run normally without QOP reporting.
        </p>
      </div>

      {/* What data is sent */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">What Data Is Sent</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          The reporter streams test execution events over WebSocket. These events include:
        </p>
        <div className="space-y-2">
          {[
            { event: 'run_started', desc: 'Suite name, total test count, CI metadata (branch, commit SHA, build number)' },
            { event: 'test_started', desc: 'Test ID, title, file path' },
            { event: 'test_finished', desc: 'Test ID, status (passed/failed/skipped), duration, error message and stack trace (on failure)' },
            { event: 'run_finished', desc: 'Signals the end of the test run' },
          ].map((item) => (
            <div key={item.event} className="flex gap-3 text-sm">
              <code className="text-emerald-300 font-mono shrink-0 w-32">{item.event}</code>
              <span className="text-slate-400">{item.desc}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mt-3">
          <p className="text-sm text-emerald-300">
            <strong>No source code is sent.</strong> QOP only receives test names, file paths,
            statuses, durations, and error messages. Your test implementation code stays on your machine.
          </p>
        </div>
      </div>

      {/* Screenshots */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Screenshots</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          When a test fails, reporters that support screenshots (Playwright, Puppeteer, Selenium)
          automatically capture and upload a screenshot via <code className="text-emerald-300">POST /api/screenshots/upload</code>.
          Screenshots are stored in PostgreSQL and viewable from the test run details page.
        </p>
      </div>

      {/* Flaky detection */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Flaky Test Detection</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          QOP tracks pass/fail history for every test. After enough executions, it computes a
          stability score from 0 (stable) to 100 (highly flaky). The system detects patterns
          like alternating pass/fail (PFPFPF) and correlates failures with specific environments
          or branches.
        </p>
        <ul className="text-sm text-slate-300 space-y-1 ml-4 list-disc">
          <li>Score &gt; 80 &rarr; auto-quarantined (flagged as unreliable)</li>
          <li>Score &lt; 20 &rarr; auto-released (marked stable again)</li>
        </ul>
        <p className="text-sm text-slate-300 leading-relaxed mt-2">
          View flaky test scores from any application&apos;s{' '}
          <strong>Flaky Tests</strong> tab in the dashboard.
        </p>
      </div>

      {/* Dual WebSocket */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Real-Time Architecture</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          QOP uses two WebSocket channels:
        </p>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 flex gap-4 items-start">
            <code className="text-emerald-300 font-mono text-xs shrink-0">/ws/ingest</code>
            <span className="text-sm text-slate-400">
              Reporters send test events here. One connection per test run.
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 flex gap-4 items-start">
            <code className="text-emerald-300 font-mono text-xs shrink-0">/ws/live</code>
            <span className="text-sm text-slate-400">
              The{' '}
              <Link href="/live-execution" className="text-emerald-400 hover:underline">
                Live Execution
              </Link>{' '}
              dashboard subscribes here to receive real-time updates.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
