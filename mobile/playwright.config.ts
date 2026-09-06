import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8081',
    actionTimeout: 30_000,
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.WORDSHIFT_CHROMIUM,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512'],
    },
  },
  webServer: {
    command: 'npx expo start --web --port 8081 --max-workers 1',
    env: { NODE_OPTIONS: '--max-old-space-size=900', EXPO_NO_TELEMETRY: '1', SENTRY_DISABLE_AUTO_UPLOAD: 'true' },
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
