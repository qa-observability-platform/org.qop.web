'use client';

import Link from 'next/link';

export default function ApiKeysDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">API Keys</h2>
        <p className="text-sm text-slate-400">
          API keys authenticate your test reporters with the QOP server
        </p>
      </div>

      {/* What are API keys */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">What are API keys?</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Each API key is scoped to a single project. When your test reporter runs, it uses the
          API key to authenticate with the QOP server, which then validates the key and returns
          the connection details needed to stream test results. No manual WebSocket URLs or
          project keys are needed.
        </p>
      </div>

      {/* Creating an API key */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-200">Creating an API Key</h3>

        <ol className="space-y-3 ml-1">
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="text-emerald-400 font-semibold shrink-0">1.</span>
            <span>
              Navigate to{' '}
              <Link href="/settings/api-keys" className="text-emerald-400 hover:underline">
                Settings &gt; API Keys
              </Link>
            </span>
          </li>
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="text-emerald-400 font-semibold shrink-0">2.</span>
            <span>Select the project you want to create a key for</span>
          </li>
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="text-emerald-400 font-semibold shrink-0">3.</span>
            <span>Click <strong>&quot;+ Create API Key&quot;</strong></span>
          </li>
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="text-emerald-400 font-semibold shrink-0">4.</span>
            <span>
              Give it a descriptive label (e.g. &quot;GitHub Actions&quot;, &quot;Local Dev&quot;, &quot;Jenkins CI&quot;)
            </span>
          </li>
          <li className="flex gap-3 text-sm text-slate-300">
            <span className="text-emerald-400 font-semibold shrink-0">5.</span>
            <span>
              Copy the key immediately. It is displayed only once and cannot be retrieved later.
            </span>
          </li>
        </ol>
      </div>

      {/* Key format */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Key format</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          API keys follow this format:
        </p>
        <pre className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-emerald-300 overflow-x-auto">
{`qop_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`}
        </pre>
        <p className="text-xs text-slate-500">
          64-character hex string prefixed with <code className="text-slate-400">qop_</code>.
          The key is hashed (SHA-256) before storage — QOP never stores the plain key.
        </p>

        <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
          <p className="text-xs font-medium text-slate-300">Two ways to generate a key:</p>
          <div className="space-y-2 text-xs text-slate-400">
            <div>
              <span className="text-emerald-400 font-medium">Via Dashboard (recommended):</span>
              <span className="ml-2">Settings → API Keys → + Create API Key</span>
            </div>
            <div>
              <span className="text-emerald-400 font-medium">Via CLI:</span>
              <pre className="mt-1 p-2 rounded bg-slate-900 text-slate-300 font-mono overflow-x-auto">
{`docker compose exec nodeapi npm run create:apikey -- <application_id> [label]`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Security notes */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Security</h3>
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
          <p className="text-sm text-amber-300">
            <strong>Best practices:</strong>
          </p>
          <ul className="text-sm text-amber-300/90 space-y-1 ml-4 list-disc">
            <li>Use one key per project per environment (dev, staging, CI)</li>
            <li>Never commit keys to version control &mdash; use <code className="text-amber-200">.env</code> files or secrets managers</li>
            <li>Revoke keys immediately if compromised (Settings &gt; API Keys &gt; Revoke)</li>
            <li>Keys can be revoked at any time without affecting other keys</li>
          </ul>
        </div>
      </div>

      {/* Next step */}
      <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
        <p className="text-sm text-slate-300">
          Ready to use your key?{' '}
          <Link href="/docs/reporters" className="text-emerald-400 hover:underline">
            Configure your test reporter &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
