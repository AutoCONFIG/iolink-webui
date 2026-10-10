import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'tenant-permissions.spec.ts',
  outputDir: 'test-results/tenant-permissions',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5188', channel: 'chrome', viewport: { width: 1440, height: 960 } },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5188 --strictPort',
    env: { VITE_DEMO_MODE: 'false' },
    url: 'http://127.0.0.1:5188',
    reuseExistingServer: false,
  },
})
