// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/tests/**',
        '**/*.d.ts',
        'prisma/**',
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
