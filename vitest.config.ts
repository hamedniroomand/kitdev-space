import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~~': path.resolve(import.meta.dirname),
      '@@': path.resolve(import.meta.dirname),
      '~': path.resolve(import.meta.dirname, 'app'),
      '@': path.resolve(import.meta.dirname, 'app'),
      '#shared': path.resolve(import.meta.dirname, 'shared'),
      '#server': path.resolve(import.meta.dirname, 'server'),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    setupFiles: ['./tests/unit/setup.ts'],
  },
})
