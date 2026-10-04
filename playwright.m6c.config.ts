import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'm6c.spec.ts',
  outputDir: '../.tmp/m6c-browser',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:5178', channel: 'chrome', viewport: { width: 1440, height: 960 } },
  webServer: { command: 'npx vite preview --host 127.0.0.1 --port 5178', url: 'http://127.0.0.1:5178', reuseExistingServer: false },
})
