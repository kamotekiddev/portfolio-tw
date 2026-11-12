import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
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
  // blog.spec.ts finishes by restarting the shared fixture server with no posts, so the season and theme
  // suites run first (project order is run order with one worker); both also restore the original fixtures
  // themselves if they ever find them missing.
  projects: [
    { name: 'season', testMatch: 'season.spec.ts' },
    { name: 'theme', testMatch: 'theme.spec.ts' },
    { name: 'nav', testMatch: 'nav.spec.ts' },
    { name: 'blog', testMatch: 'blog.spec.ts' },
  ],
});
