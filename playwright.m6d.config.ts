import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'm6d-live.spec.ts',
  outputDir: '../docs/evidence/M6d/2026-10-07/browser',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: process.env['IOLINK_M6D_URL'], channel: 'chrome', viewport: { width: 1440, height: 960 } },
})
