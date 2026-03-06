'use client';

const envVars = [
  {
    name: 'QOP_API_KEY',
    required: true,
    description:
      'API key from Settings > API Keys. Authenticates your test reporter with the QOP server. The reporter calls POST /auth/validate-key with this key to get connection details.',
    defaultValue: null,
    example: 'qop_live_a1b2c3d4e5f6...',
  },
  {
    name: 'QOP_API_BASE_URL',
    required: false,
    description:
      'Base URL of the QOP Node.js API server. Change this if your QOP instance runs on a different port or remote host.',
    defaultValue: 'http://localhost:4000',
    example: 'https://qop.mycompany.com',
  },
  {
    name: 'QOP_APP_KEY',
    required: false,
    description:
      'Application key to group test runs under a specific application within your project. If omitted, the reporter uses "default-app". Useful when one project has multiple test suites (e.g. "web-e2e", "api-tests").',
    defaultValue: 'default-app',
    example: 'web-e2e',
  },
  {
    name: 'QOP_RUN_ID',
    required: false,
    description:
      'Override the automatically generated run ID. Useful for correlating test runs across multiple reporters or CI pipeline stages.',
    defaultValue: 'Auto-generated (run-<uuid>)',
    example: 'run-build-1234',
  },
  {
    name: 'QOP_WS_URL',
    required: false,
    description:
      'Explicit WebSocket URL for legacy mode. When set, the reporter skips API key validation and connects directly. Only needed for advanced setups or backward compatibility.',
    defaultValue: null,
    example: 'ws://localhost:4000/ws/ingest',
  },
];

export default function EnvironmentVariablesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Environment Variables</h2>
        <p className="text-sm text-slate-400">
          All QOP reporters read configuration from environment variables
        </p>
      </div>

      <div className="space-y-4">
        {envVars.map((v) => (
          <div
            key={v.name}
            className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2"
          >
            <div className="flex items-center gap-3">
              <code className="text-emerald-300 font-mono text-sm font-semibold">{v.name}</code>
              {v.required ? (
                <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Required
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs bg-slate-500/20 text-slate-400 border border-slate-700">
                  Optional
                </span>
              )}
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{v.description}</p>

            {v.defaultValue && (
              <div className="text-xs text-slate-500">
                Default: <code className="text-slate-400">{v.defaultValue}</code>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Example: <code className="text-slate-400">{v.example}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Usage example */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Minimal .env file</h3>
        <pre className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre">
{`# Only QOP_API_KEY is required
QOP_API_KEY=qop_live_your_key_here

# Optional overrides
# QOP_APP_KEY=web-e2e
# QOP_API_BASE_URL=https://qop.mycompany.com`}
        </pre>
      </div>
    </div>
  );
}
