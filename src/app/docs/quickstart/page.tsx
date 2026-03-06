'use client';

import Link from 'next/link';

export default function QuickStartPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Quick Start</h2>
        <p className="text-sm text-slate-400">
          Get up and running with QOP in 3 steps
        </p>
      </div>

      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30">
            1
          </span>
          <h3 className="text-base font-semibold text-slate-200">Create a Project</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed ml-11">
          Go to{' '}
          <Link href="/projects" className="text-emerald-400 hover:underline">
            Projects
          </Link>{' '}
          and create a new project. Each project groups related test applications
          and has its own API keys.
        </p>
      </div>

      {/* Step 2 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30">
            2
          </span>
          <h3 className="text-base font-semibold text-slate-200">Generate an API Key</h3>
        </div>
        <div className="ml-11 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Go to{' '}
            <Link href="/settings/api-keys" className="text-emerald-400 hover:underline">
              Settings &gt; API Keys
            </Link>
            , select your project, and click &quot;Create API Key&quot;. Copy it immediately &mdash; it&apos;s shown only once.
          </p>
          <pre className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-emerald-300 overflow-x-auto">
{`QOP_API_KEY=qop_live_abc123...`}
          </pre>
          <p className="text-xs text-slate-500">
            Add this to your <code className="text-emerald-300">.env</code> file or CI/CD secrets.
          </p>
        </div>
      </div>

      {/* Step 3 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold border border-emerald-500/30">
            3
          </span>
          <h3 className="text-base font-semibold text-slate-200">Install Your Reporter</h3>
        </div>
        <div className="ml-11 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            Install the QOP reporter for your test framework. See the full{' '}
            <Link href="/docs/reporters" className="text-emerald-400 hover:underline">
              Reporter Setup
            </Link>{' '}
            guide for detailed instructions.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Playwright</div>
              <code className="text-xs text-emerald-300 font-mono">npm i -D @qa-observability-platform/playwright</code>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Puppeteer</div>
              <code className="text-xs text-emerald-300 font-mono">npm i -D @qa-observability-platform/puppeteer</code>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Pytest</div>
              <code className="text-xs text-emerald-300 font-mono">pip install qop-pytest</code>
            </div>
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">Selenium</div>
              <code className="text-xs text-emerald-300 font-mono">Maven dependency (see docs)</code>
            </div>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <p className="text-sm text-emerald-300">
          <strong>That&apos;s it!</strong> Run your tests and they&apos;ll appear in the{' '}
          <Link href="/dashboard" className="underline">Dashboard</Link> and{' '}
          <Link href="/live-execution" className="underline">Live Execution</Link> view
          automatically. The reporter connects to QOP, streams results in real-time, and
          uploads screenshots on failure.
        </p>
      </div>
    </div>
  );
}
