import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'off',
  },
  webServer: {
    command: 'pnpm exec astro dev --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/dev/composants',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ASTRO_TELEMETRY_DISABLED: '1',
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'test-anon-key-not-a-secret',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
