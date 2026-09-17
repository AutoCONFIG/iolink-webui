import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      '/admin': 'http://localhost:8080',
      '/api': 'http://localhost:8080',
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/api/adapters.ts'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
