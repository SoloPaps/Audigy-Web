import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'scripts/**/*.test.ts',
      'apps/web/src/i18n/**/*.test.ts',
      'packages/**/*.test.ts',
    ],
  },
});
