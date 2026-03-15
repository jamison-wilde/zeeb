import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
  assetsInclude: ['**/*.png', '**/*.svg'],
  plugins: [
    {
      name: 'mock-assets',
      transform(_code, id) {
        if (/\.(png|svg|jpg|jpeg|gif|webp|ico)$/.test(id)) {
          return { code: 'export default "test-asset-url"' };
        }
      },
    },
  ],
});
