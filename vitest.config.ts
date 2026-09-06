import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~~': path.resolve(import.meta.dirname),
      '@@': path.resolve(import.meta.dirname),
      '~': path.resolve(import.meta.dirname, 'app'),
      '@': path.resolve(import.meta.dirname, 'app')
    }
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true
  }
})
