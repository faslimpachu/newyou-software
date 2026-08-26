import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['tests/api/**', 'app/api/**/*.test.ts', 'node_modules/**', '.next/**'],
    sequence: { concurrent: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
