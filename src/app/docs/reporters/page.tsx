'use client';

import { useState } from 'react';

type Framework = 'playwright' | 'puppeteer' | 'pytest' | 'selenium';

const frameworkData: Record<Framework, { install: string; configure: string; run: string }> = {
  playwright: {
    install: `npm install --save-dev @qa-observability-platform/playwright`,
    configure: `// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@qa-observability-platform/playwright'],
  ],
});

// .env
QOP_API_KEY=your_api_key_here`,
    run: `npx playwright test`,
  },
  puppeteer: {
    install: `npm install --save-dev @qa-observability-platform/puppeteer`,
    configure: `// jest.config.js
module.exports = {
  reporters: [
    'default',
    '@qa-observability-platform/puppeteer',
  ],
};

// .env
QOP_API_KEY=your_api_key_here`,
    run: `npx jest`,
  },
  pytest: {
    install: `pip install qop-pytest`,
    configure: `# pytest.ini or pyproject.toml
[pytest]
addopts = -p qop_pytest.reporter

# .env or shell
export QOP_API_KEY=your_api_key_here`,
    run: `pytest`,
  },
  selenium: {
    install: `<!-- pom.xml -->
<dependency>
  <groupId>com.qop</groupId>
  <artifactId>qop-selenium-reporter</artifactId>
  <version>1.0.0</version>
</dependency>`,
    configure: `<!-- testng.xml -->
<suite name="My Tests">
  <listeners>
    <listener class-name="com.qop.selenium.reporter.QopWebSocketReporter"/>
  </listeners>
  <test name="Tests">
    <classes>
      <class name="com.example.MyTest"/>
    </classes>
  </test>
</suite>

# Environment variable
export QOP_API_KEY=your_api_key_here`,
    run: `mvn test`,
  },
};

const tabs: { key: Framework; label: string }[] = [
  { key: 'playwright', label: 'Playwright' },
  { key: 'puppeteer', label: 'Puppeteer' },
  { key: 'pytest', label: 'Pytest' },
  { key: 'selenium', label: 'Selenium' },
];

function CodeBlock({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      {label && (
        <div className="text-xs text-slate-500 mb-1">{label}</div>
      )}
      <pre className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre">
        {children}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function ReportersDocsPage() {
  const [active, setActive] = useState<Framework>('playwright');
  const data = frameworkData[active];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Reporter Setup</h2>
        <p className="text-sm text-slate-400">
          Install the QOP reporter for your test framework and start streaming results
        </p>
      </div>

      {/* Framework Tabs */}
      <div>
        <div className="flex gap-1 border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                active === tab.key
                  ? 'text-emerald-400 border-b-2 border-emerald-500 -mb-px'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6 mt-6">
          {/* Install */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-200">1. Install</h3>
            <CodeBlock>{data.install}</CodeBlock>
          </div>

          {/* Configure */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-200">2. Configure</h3>
            <CodeBlock>{data.configure}</CodeBlock>
          </div>

          {/* Run */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-200">3. Run</h3>
            <CodeBlock>{data.run}</CodeBlock>
          </div>
        </div>
      </div>

      {/* Console output */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-200">What you&apos;ll see</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          When tests run, the reporter logs its status to the console:
        </p>
        <pre className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre">
{`[QOP] Validating API key...
[QOP] ✓ API key validated (project: my-project)
[QOP] ✓ Connected. Streaming test results...
[QOP] WS connection closed`}
        </pre>
        <p className="text-xs text-slate-500">
          If authentication fails, your tests still run normally &mdash; QOP reporting is non-blocking.
        </p>
      </div>

      {/* Optional config */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <p className="text-sm text-amber-300">
          <strong>Optional:</strong> Set <code className="text-amber-200">QOP_APP_KEY</code> to
          group test runs under a specific application within your project. If omitted,
          runs appear under the default application. See{' '}
          <a href="/docs/environment-variables" className="underline">
            Environment Variables
          </a>{' '}
          for all options.
        </p>
      </div>
    </div>
  );
}
