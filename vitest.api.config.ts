import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
    globals: true,
    include: ['tests/api/**/*.test.ts'],
    sequence: { concurrent: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
