import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { blogMetadata } from '../app/(root)/blog/metadata';
import { expect, test, type Page } from '@playwright/test';
import {
  blogFixtures,
  fixtureOrigin,
  fixtureProjectPath,
  restartFixtureServer,
  type FixturePost,
} from './blog-fixtures';

const publishedFixture = blogFixtures.find((post) => post.slug === 'fixture-newest')!;
const draftFixture = blogFixtures.find((post) => post.status === 'draft')!;
const otherPosts = blogFixtures.filter((post) => post.slug !== publishedFixture.slug && post.status === 'published');

test.describe.configure({ mode: 'serial' });

test('home navigation opens the published index with a stable, sorted list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Blog' }).click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Blog$/ })).toBeVisible();

  const cardTitles = await page.locator('.blog-post-card h2').allTextContents();
  expect(cardTitles).toEqual([
    'Fixture Future',
    publishedFixture.title,
    'Fixture Tie Alpha',
    'Fixture Tie Beta',
  ]);
  await expect(page.locator('.blog-post-card').first()).toContainText('An explicitly published future-dated fixture.');
  await expect(page.locator('.blog-post-card').last()).toContainText('2026');
  await expect(page.getByText(draftFixture.title, { exact: false })).toHaveCount(0);
  await expect(page.getByText('No published writing yet', { exact: false })).toHaveCount(0);
});

test('published article renders owner content and navigates back to its index', async ({ page }) => {
  const response = await page.goto('/blog/fixture-newest');
  expect(response?.status()).toBe(200);

  const article = page.locator('.blog-article');
  await expect(article.getByRole('heading', { level: 1, name: publishedFixture.title })).toBeVisible();
  await expect(article.locator('time')).toHaveAttribute('datetime', publishedFixture.publishedAt);
  await expect(article.getByText(publishedFixture.summary)).toBeVisible();
  await expect(article.locator('.article-body')).toContainText('A paragraph with bold text');
  await expect(article.locator('.article-body strong')).toHaveText('bold text');
  await expect(article.locator('.article-body a[href="https://example.test/guide"]')).toBeVisible();
  for (const link of await article.locator('.article-body a').all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(article.getByRole('link', { name: 'Back to blog' })).not.toHaveAttribute('target', '_blank');

  await expect(article.locator('.article-body ul li')).toHaveCount(2);
  await expect(article.locator('.article-body ol li')).toHaveCount(2);
  await expect(article.locator('.article-body img[alt="Fixture illustration"]')).toBeVisible();
  await expect(article.locator('.article-body code').last()).toContainText('keep these spaces');
  await expect(article.getByText('Portfolio', { exact: true })).toBeVisible();
  await expect(article.getByText('Learning', { exact: true })).toBeVisible();
  await expect(article.getByRole('link', { name: 'Back to blog' })).toHaveAttribute('href', '/blog');
});

test('article section navigation follows headings and adapts to the viewport', async ({ browser, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/blog/${publishedFixture.slug}`);

  const article = page.locator('.blog-article');
  const headingIds = await article.locator('.article-body :is(h2, h3, h4, h5, h6)[id]').evaluateAll(
    (headings) => headings.map((heading) => heading.id),
  );
  expect(headingIds).toEqual(['section-overview']);

  const sidebar = article.locator('.article-contents-sidebar');
  await expect(sidebar.getByText('On this page')).toBeVisible();
  await expect(sidebar).toHaveCSS('position', 'sticky');
  const sidebarLinks = sidebar.getByRole('link');
  await expect(sidebarLinks).toHaveCount(headingIds.length);
  for (const [index, link] of Array.from((await sidebarLinks.all()).entries())) {
    const href = await link.getAttribute('href');
    expect(href).toBe(`#${headingIds[index]}`);
    const matchingHeadings = article.locator(`.article-body [id="${headingIds[index]}"]`);
    await expect(matchingHeadings).toHaveCount(1);
  }

  const heroWidth = await article.locator('.blog-article-header').evaluate((element) => element.getBoundingClientRect().width);
  const readingWidth = await article.locator('.article-reading-layout').evaluate((element) => element.getBoundingClientRect().width);
  expect(Math.abs(heroWidth - readingWidth)).toBeLessThanOrEqual(1);

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/blog/${publishedFixture.slug}`);
    if (width >= 1024) await expect(page.locator('.article-contents-sidebar')).toBeVisible();
    else await expect(page.locator('.article-contents-sidebar')).toBeHidden();
    const compact = page.locator('.article-contents-compact');
    if (width < 1024) await expect(compact).toBeVisible();
    else await expect(compact).toBeHidden();
    await assertNoPageOverflow(page);

    const activeLink = (width >= 1024
      ? page.locator('.article-contents-sidebar a')
      : compact.locator('a')).first();
    if (width < 1024) {
      await compact.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(compact).toHaveAttribute('open', '');
      await page.keyboard.press('Tab');
    } else {
      await activeLink.focus();
    }
    await expect(activeLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#section-overview$/);
    await expect(page.locator('#section-overview')).toBeInViewport();
    await expect(page.locator('#section-overview')).toBeFocused();
  }

  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.goto(`/blog/${publishedFixture.slug}`);
  const compact = noScriptPage.locator('.article-contents-compact');
  await compact.locator('summary').click();
  await compact.getByRole('link', { name: 'Overview' }).click();
  await expect(noScriptPage).toHaveURL(/#section-overview$/);
  await expect(noScriptPage.locator('#section-overview')).toBeInViewport();
  await noScript.close();
});

test('drafts and unknown slugs return generic 404 pages with public navigation', async ({ page, request }) => {
  for (const slug of [draftFixture.slug, 'unknown-fixture-slug']) {
    const response = await request.get(`/blog/${slug}`);
    expect(response.status(), `${slug} status`).toBe(404);
    const body = await response.text();
    expect(body).not.toContain(draftFixture.title);
    expect(body).not.toContain(draftFixture.summary);
    expect(body).not.toContain(draftFixture.body);
  }

  const encoded = await request.get(`/blog/${encodeURIComponent(draftFixture.slug)}`);
  expect(encoded.status()).toBe(404);

  await page.goto(`/blog/${draftFixture.slug}`);
  await expect(page.getByRole('link', { name: /back to blog/i })).toHaveAttribute('href', '/blog');
  await expect(page.getByRole('link', { name: /back to portfolio/i })).toHaveAttribute('href', '/');
  await expect(page.getByText(draftFixture.title)).toHaveCount(0);
});

test('article metadata uses the intended site origin and article-specific fields', async ({ page }) => {
  await page.goto('/blog/fixture-newest');
  await expect(page).toHaveTitle(/Fixture Newest/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', publishedFixture.summary);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `${fixtureOrigin}/blog/${publishedFixture.slug}`,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', publishedFixture.title);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', publishedFixture.summary);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', publishedFixture.title);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', publishedFixture.summary);
});

async function assertNoPageOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
}

/**
 * A press of the header toggle selects the opposite of the theme shown (and that is Auto when it matches the time
 * of day), so whichever theme the visitor starts in, at most one press shows the other. Press only when the page
 * is not already in the wanted theme, then check the class; the choice is stored for later pages.
 */
async function selectTheme(page: Page, theme: 'dark' | 'light'): Promise<void> {
  const toggle = page.getByRole('button', { name: /^Theme: / });
  await expect(toggle).toBeEnabled();
  const shown = (await page.locator('html').getAttribute('class'))?.split(/\s+/) ?? [];
  if (!shown.includes(theme)) await toggle.click();
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

test('index and article stay readable at mobile, tablet and desktop widths in both themes', async ({ page }, testInfo) => {
  const viewports = [375, 768, 1440];
  for (const theme of ['dark', 'light'] as const) {
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/blog');
      await selectTheme(page, theme);
      await assertNoPageOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`blog-index-${theme}-${width}.png`),
        fullPage: true,
      });

      await page.goto(`/blog/${publishedFixture.slug}`);
      await assertNoPageOverflow(page);
      const code = page.locator('.article-body pre');
      const codeMetrics = await code.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
        whiteSpace: getComputedStyle(element).whiteSpace,
      }));
      expect(codeMetrics.whiteSpace).toMatch(/pre/);
      expect(codeMetrics.scroll).toBeGreaterThan(codeMetrics.client);
      await expect(page.locator('.article-body img')).toHaveJSProperty('complete', true);
      expect(await page.locator('.article-body img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await page.screenshot({
        path: testInfo.outputPath(`blog-article-${theme}-${width}.png`),
        fullPage: true,
      });
    }
  }

  await page.goto(`/blog/${publishedFixture.slug}`);
  await selectTheme(page, 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: /^Theme: (Dark|Auto \(currently dark\))$/ })).toBeEnabled();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.blog-article')).toBeVisible();
});

test('keyboard and no-script visitors can navigate and read the whole article', async ({ browser, page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.goto('/blog');
  const focusLink = page.getByRole('link', { name: publishedFixture.title });
  await focusLink.focus();
  const focusStyle = await focusLink.evaluate((element) => ({ width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle }));
  expect(focusStyle.style).not.toBe('none');
  expect(parseFloat(focusStyle.width)).toBeGreaterThan(0);

  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScript.newPage();
  await noScriptPage.goto('/');
  await noScriptPage.getByRole('link', { name: 'Blog' }).click();
  await noScriptPage.getByRole('link', { name: publishedFixture.title }).click();
  await expect(noScriptPage.getByRole('heading', { level: 1, name: publishedFixture.title })).toBeVisible();
  await expect(noScriptPage.locator('.article-body')).toContainText('A paragraph with bold text');
  await expect(noScriptPage.locator('.article-body ul li')).toHaveCount(2);
  await expect(noScriptPage.locator('.article-body ol li')).toHaveCount(2);
  await expect(noScriptPage.locator('.article-body pre')).toContainText('preserves spaces:    keep these spaces.');
  await expect(noScriptPage.getByRole('img', { name: 'Fixture illustration' })).toBeVisible();
  await noScriptPage.getByRole('link', { name: 'Back to blog' }).click();
  await expect(noScriptPage).toHaveURL(/\/blog\/?$/);
  await noScriptPage.getByRole('link', { name: /portfolio|home/i }).first().click();
  await expect(noScriptPage).toHaveURL(/\/$/);
  await noScript.close();
});

test('draft sentinels stay off public HTML, RSC, bundles and raw content addresses', async ({ page, request }) => {
  const routes = ['/', '/blog', `/blog/${publishedFixture.slug}`];
  for (const route of routes) {
    const response = await request.get(route);
    const body = await response.text();
    expect(body).not.toContain(draftFixture.title);
    expect(body).not.toContain(draftFixture.summary);
    expect(body).not.toContain(draftFixture.body);
  }

  const rsc = await request.get('/blog', {
    headers: { RSC: '1', Accept: 'text/x-component' },
  });
  expect(rsc.headers()['content-type']).toContain('text/x-component');
  const rscBody = await rsc.text();
  expect(rscBody).not.toContain(draftFixture.title);
  expect(rscBody).not.toContain(draftFixture.summary);
  expect(rscBody).not.toContain(draftFixture.body);

  const projectRoot = await fixtureProjectPath();
  async function publicFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const groups = await Promise.all(entries.map((entry) => entry.isDirectory()
      ? publicFiles(path.join(directory, entry.name)) : Promise.resolve([path.join(directory, entry.name)])));
    return groups.flat();
  }
  const assets = [...await publicFiles(path.join(projectRoot, '.next/static')),
    ...await publicFiles(path.join(projectRoot, 'public'))];
  for (const asset of assets) {
    const bundle = await readFile(asset, 'utf8');
    for (const sentinel of [draftFixture.title, draftFixture.summary, 'Draft Sentinel Body 7f4d2',
      'Blog content validation failed:', 'frontmatter opening line must be exactly ---json']) {
      expect(bundle, path.relative(projectRoot, asset)).not.toContain(sentinel);
    }
  }

  for (const sourcePath of [
    '/app/data/blog/draft-sentinel-7f4d2.md',
    '/data/blog/draft-sentinel-7f4d2.md',
  ]) {
    const response = await request.get(sourcePath);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain(draftFixture.body);
  }

  const hostile = await request.get('/blog/%2e%2e/app/data/blog/draft-sentinel-7f4d2.md');
  expect(hostile.status()).not.toBe(200);
});

test('published title and body revisions retain the same slug, withdrawal removes it, and empty launches stay honest', async ({ page, request }, testInfo) => {
  test.setTimeout(300_000);
  const startedAt = Date.now();
  const revisedPost: FixturePost = {
    ...publishedFixture,
    title: 'A revised fixture article',
    summary: 'Revised summary for the same permanent address.',
    body: '## Revised\n\nRevised body at the same identifier.',
  };
  const newlyPublished = { ...draftFixture, status: 'published' as const };
  const revisionSet = [...otherPosts, revisedPost, newlyPublished];
  await restartFixtureServer(revisionSet);

  const revisedResponse = await request.get(`/blog/${publishedFixture.slug}`);
  expect(revisedResponse.status()).toBe(200);
  const revisedBody = await revisedResponse.text();
  expect(revisedBody).toContain(revisedPost.title);
  expect(revisedBody).not.toContain(publishedFixture.title);
  await page.goto(`/blog/${publishedFixture.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(revisedPost.title);
  await expect(page.locator('.article-body')).toContainText('Revised body at the same identifier.');

  const newlyPublishedResponse = await request.get(`/blog/${newlyPublished.slug}`);
  expect(newlyPublishedResponse.status()).toBe(200);
  await page.goto(`/blog/${newlyPublished.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(newlyPublished.title);
  await expect(page.locator('.article-body')).toContainText('Draft Sentinel Body 7f4d2.');

  const withdrawnPost: FixturePost = { ...revisedPost, status: 'draft' };
  await restartFixtureServer([...otherPosts, withdrawnPost]);
  expect((await request.get(`/blog/${publishedFixture.slug}`)).status()).toBe(404);
  await page.goto(`/blog/${publishedFixture.slug}`);
  await expect(page.getByRole('link', { name: /back to blog/i })).toHaveAttribute('href', '/blog');
  await expect(page.getByText(withdrawnPost.title)).toHaveCount(0);

  await restartFixtureServer([]);
  const emptyIndex = await request.get('/blog');
  expect(emptyIndex.status()).toBe(200);
  await page.goto('/blog');
  await expect(page.getByRole('heading', { name: /^Blog$/ })).toBeVisible();
  await expect(page.getByText(/no published (entries|posts|writing)|start.*writing|empty/i)).toBeVisible();
  await expect(page.locator('.blog-post-card')).toHaveCount(0);
  const elapsedMs = Date.now() - startedAt;
  expect(elapsedMs).toBeLessThan(600_000);
  await testInfo.attach('automated-local-authoring-publication-revision-timing', { body: JSON.stringify({ elapsedMs, stages: ['draft-publication', 'revision', 'withdrawal', 'empty'] }), contentType: 'application/json' });
});


test('metadata origin precedence is deterministic', () => {
  const previousSite = process.env.NEXT_PUBLIC_SITE_URL;
  const previousVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  try {
    for (const [site, vercel, expected] of [
      ['https://configured.example.test', 'production.example.test', 'https://configured.example.test'],
      ['', 'production.example.test', 'https://production.example.test'],
      ['', '', 'http://localhost:3000'],
    ]) {
      process.env.NEXT_PUBLIC_SITE_URL = site;
      process.env.VERCEL_PROJECT_PRODUCTION_URL = vercel;
      const metadata = blogMetadata({ title: 'Article', description: 'Description', path: '/blog/article', publishedAt: '2026-11-07' });
      expect(metadata.alternates?.canonical).toBe(`${expected}/blog/article`);
    }
  } finally {
    if (previousSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSite;
    if (previousVercel === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else process.env.VERCEL_PROJECT_PRODUCTION_URL = previousVercel;
  }
});
