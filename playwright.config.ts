import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'blog.spec.ts',
  globalSetup: './tests/blog-fixtures.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3137',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  timeout: 45_000,
});
