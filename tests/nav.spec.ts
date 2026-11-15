import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { blogFixtures, restartFixtureServer } from './blog-fixtures';

/*
 * Browser regression coverage for specs/006-active-nav-highlight (spec.md FR-001-FR-007, SC-001-SC-003).
 * Written from the spec as an independent oracle: nothing is imported from app/components/MainNav.tsx. A link is
 * "current" when it carries aria-current ("page" on blog routes, "location" for a home-page section).
 *
 * Scroll positions are set with an instant scroll (the site uses scroll-behavior: smooth) so that a section's top
 * edge sits just under the sticky header: that section then crosses any activation line below the header, and the
 * previous section has left the viewport's top band. Exact placement of the line (about 30% of the viewport height in
 * plan.md) is therefore not baked into the expectations.
 */

const ARTICLE = '/blog/fixture-newest';
const SECTIONS = ['work', 'experience', 'about', 'contact'] as const;
type SectionId = (typeof SECTIONS)[number];
const LINKS = ['Work', 'Experience', 'About', 'Contact', 'Blog'] as const;
type LinkName = (typeof LINKS)[number];
const LABEL_OF: Record<SectionId, LinkName> = { work: 'Work', experience: 'Experience', about: 'About', contact: 'Contact' };

const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter', 'wet', 'dry'] as const;
type SeasonId = (typeof SEASON_IDS)[number];
type Theme = 'light' | 'dark';

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;

const NOW = '2026-01-15T12:00:00Z';

type VisitOptions = {
  theme?: Theme;
  season?: SeasonId;
  viewport?: { width: number; height: number };
  reducedMotion?: 'reduce' | 'no-preference';
  javaScriptEnabled?: boolean;
};

const test = base.extend<{ visit: (options?: VisitOptions) => Promise<Page> }>({
  visit: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    await use(async (options = {}) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        timezoneId: 'Europe/Berlin',
        viewport: options.viewport ?? { width: 1440, height: 900 },
        colorScheme: 'light',
        reducedMotion: options.reducedMotion ?? 'no-preference',
        javaScriptEnabled: options.javaScriptEnabled ?? true,
      });
      contexts.push(context);
      await context.clock.setFixedTime(Date.parse(NOW));
      const seeds: Record<string, string> = {};
      if (options.theme) seeds['theme-mode'] = options.theme;
      if (options.season) seeds.season = options.season;
      if (Object.keys(seeds).length) {
        await context.addInitScript((entries) => {
          try {
            for (const [key, value] of Object.entries(entries)) {
              if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
            }
          } catch {
            /* storage unavailable */
          }
        }, seeds);
      }
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeAll(async ({}, testInfo) => {
  // blog.spec.ts ends by restarting the shared fixture server with no posts; put the fixtures back when run after it.
  const origin = String(testInfo.project.use.baseURL);
  const response = await fetch(`${origin}${ARTICLE}`).catch(() => undefined);
  if (response?.status === 200) return;
  testInfo.setTimeout(300_000);
  await restartFixtureServer(blogFixtures);
});

// ---------------------------------------------------------------------------------------------------------------
// Helpers

const toggle = (page: Page) => page.getByRole('button', { name: /^Theme: / });
const navLink = (page: Page, name: LinkName) => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true });

/** The state of the five links: the aria-current value of each, null when absent. */
type NavState = Record<LinkName, string | null>;
const NONE: NavState = { Work: null, Experience: null, About: null, Contact: null, Blog: null };
const only = (name: LinkName, value: 'page' | 'location'): NavState => ({ ...NONE, [name]: value });

async function navState(page: Page): Promise<NavState> {
  return page.evaluate(() => {
    const state: Record<string, string | null> = {};
    document.querySelectorAll('nav[aria-label="Main navigation"] a').forEach((link) => {
      state[(link.textContent ?? '').trim()] = link.getAttribute('aria-current');
    });
    return state;
  }) as Promise<NavState>;
}

/** Elements anywhere in the header (including the logo) that claim to be current. */
const headerCurrentCount = (page: Page) => page.evaluate(() => document.querySelectorAll('.site-header [aria-current]').length);

async function expectState(page: Page, expected: NavState, message?: string) {
  await expect.poll(() => navState(page), { message, timeout: 5_000 }).toEqual(expected);
  expect(await headerCurrentCount(page), 'no other element in the header is current').toBe(Object.values(expected).filter(Boolean).length);
}

/**
 * After history navigation the browser (not the page) decides the scroll position, so the oracle is the geometry.
 * A section whose top is above the header's bottom edge (+20 px) is definitely under any activation line; the last such
 * one may be current, and so may the next section when its top is already within 45% of the viewport (the exact line
 * is an implementation choice). Nothing may be current only when no section has passed the header, and nothing but
 * Contact once the page is at the bottom. Never more than one.
 */
async function expectMatchesGeometry(page: Page, message: string) {
  await scrollSettled(page);
  const verdict = () =>
    page.evaluate(() => {
      const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      const tops = ['work', 'experience', 'about', 'contact'].map((id) => [id, document.getElementById(id)!.getBoundingClientRect().top] as const);
      const passed = tops.filter(([, top]) => top <= headerBottom + 20).map(([id]) => id);
      const next = tops.find(([, top]) => top > headerBottom + 20);
      const links = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a[aria-current]')).map((a) => (a.textContent ?? '').trim().toLowerCase());
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const acceptable: string[] = atBottom ? ['contact'] : [];
      if (!atBottom) {
        if (passed.length) acceptable.push(passed[passed.length - 1]);
        else acceptable.push('none');
        if (next && next[1] <= window.innerHeight * 0.45) acceptable.push(next[0]);
      }
      return { acceptable, links, y: Math.round(window.scrollY), tops: tops.map(([id, top]) => `${id}:${Math.round(top)}`).join(' ') };
    });
  await expect
    .poll(async () => {
      const v = await verdict();
      if (v.links.length > 1) return `several current: ${v.links}`;
      const shown = v.links.length ? v.links[0] : 'none';
      return v.acceptable.includes(shown) ? 'ok' : `current ${shown}, acceptable ${v.acceptable} (scrollY ${v.y}; ${v.tops})`;
    }, { message, timeout: 5_000 })
    .toBe('ok');
}

async function hydrated(page: Page) {
  await expect(toggle(page)).toBeEnabled(); // disabled until React hydrates
}

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await hydrated(page);
}

/** Wait until the scroll position has not changed for ~400 ms (smooth scrolling finished). */
async function scrollSettled(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = window.scrollY;
        let stable = 0;
        const timer = setInterval(() => {
          if (Math.abs(window.scrollY - last) < 0.5) stable += 1;
          else stable = 0;
          last = window.scrollY;
          if (stable >= 4) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      }),
  );
}

/** Instant scroll so that the section's top edge is `offset` px below the bottom of the sticky header (negative = under it). */
async function scrollSectionTo(page: Page, id: SectionId, offset = -20) {
  await page.evaluate(
    ({ id: sectionId, offset: extra }) => {
      const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      const top = document.getElementById(sectionId)!.getBoundingClientRect().top + window.scrollY - headerBottom - extra;
      window.scrollTo({ top, behavior: 'instant' });
    },
    { id, offset },
  );
}
const scrollToBottom = (page: Page) => page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
const scrollToTop = (page: Page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

async function noOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    body: [document.body.scrollWidth, document.body.clientWidth],
  }));
  expect(metrics.root[0], `documentElement scrollWidth ${metrics.root[0]} > clientWidth ${metrics.root[1]}`).toBeLessThanOrEqual(metrics.root[1]);
  expect(metrics.body[0], `body scrollWidth ${metrics.body[0]} > clientWidth ${metrics.body[1]}`).toBeLessThanOrEqual(metrics.body[1]);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(`${message.type()}: ${message.text()}`);
  });
  return errors;
}

type Rgba = [number, number, number, number];
function parseColour(value: string): Rgba {
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(value.trim());
  expect(match, `computed colour "${value}" is rgb()/rgba()`).not.toBeNull();
  const alpha = match![4] === undefined ? 1 : match![4].endsWith('%') ? parseFloat(match![4]) / 100 : Number(match![4]);
  return [Number(match![1]), Number(match![2]), Number(match![3]), alpha];
}
function hexToRgba(hex: string): Rgba {
  const value = hex.trim().replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  expect(full, `colour token "${hex}" is a hex colour`).toMatch(/^[0-9a-f]{6}$/i);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).concat(1) as Rgba;
}
function luminance([r, g, b]: Rgba) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}
function contrast(a: Rgba, b: Rgba) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function over(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top[3];
  return [top[0] * alpha + bottom[0] * (1 - alpha), top[1] * alpha + bottom[1] * (1 - alpha), top[2] * alpha + bottom[2] * (1 - alpha), 1];
}

// ---------------------------------------------------------------------------------------------------------------

test.describe('Blog is current on blog routes (FR-001, SC-002)', () => {
  for (const [label, url] of [
    ['the blog index', '/blog'],
    ['an article', ARTICLE],
  ] as const) {
    test(`${label}: aria-current="page" on Blog only, in the server-rendered HTML (raw response)`, async ({ page }) => {
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);
      const body = await response.text();
      const nav = /<nav[^>]*aria-label="Main navigation"[\s\S]*?<\/nav>/.exec(body)?.[0];
      expect(nav, 'main navigation present in the served HTML').toBeTruthy();
      const anchors = nav!.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
      expect(anchors.length).toBe(5);
      const current = anchors.filter((anchor) => /aria-current=/.test(anchor));
      expect(current, 'exactly one anchor carries aria-current').toHaveLength(1);
      expect(current[0]).toMatch(/aria-current="page"/);
      expect(current[0]).toMatch(/href="\/blog"/);
      expect(current[0]).toMatch(/>\s*Blog\s*</);
    });

    test(`${label}: Blog is current without JavaScript and after hydration`, async ({ visit }) => {
      const plain = await visit({ javaScriptEnabled: false });
      await plain.goto(url, { waitUntil: 'domcontentloaded' });
      expect(await navState(plain)).toEqual(only('Blog', 'page'));

      const page = await visit();
      const errors = watchErrors(page);
      await goto(page, url);
      await expectState(page, only('Blog', 'page'));
      await page.waitForTimeout(300);
      await expectState(page, only('Blog', 'page'), 'still Blog after hydration settled');
      expect(errors).toEqual([]);
    });
  }

  test('the home page and the 404 page serve no current link', async ({ page, visit }) => {
    for (const url of ['/', '/this-page-does-not-exist']) {
      const body = await (await page.request.get(url)).text();
      const nav = /<nav[^>]*aria-label="Main navigation"[\s\S]*?<\/nav>/.exec(body)?.[0] ?? '';
      expect(nav, `${url}: nav present`).toBeTruthy();
      expect(nav, `${url}: served HTML has no aria-current`).not.toMatch(/aria-current=/);
    }
    const missing = await visit();
    await missing.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' });
    await hydrated(missing);
    await expectState(missing, NONE, '404 page highlights nothing');
  });
});

/** A 404 document legitimately logs "Failed to load resource ... 404"; nothing else may be logged. */
const realErrors = (errors: string[]) => errors.filter((message) => !/Failed to load resource.*404/.test(message));

test.describe('not-found pages and malformed hashes highlight nothing and stay error-free', () => {
  for (const url of ['/blog/unknown-fixture-slug', '/blog/a/b', '/nope']) {
    test(`${url}: renders the site 404 with the nav, nothing current, no hydration errors`, async ({ page, visit }) => {
      const served = await page.request.get(url);
      expect(served.status()).toBe(404);
      const body = await served.text();
      const nav = /<nav[^>]*aria-label="Main navigation"[\s\S]*?<\/nav>/.exec(body)?.[0] ?? '';
      expect(nav, 'nav is rendered').toBeTruthy();
      expect(nav, 'served HTML has no aria-current').not.toMatch(/aria-current=/);

      const live = await visit();
      const errors = watchErrors(live);
      const response = await live.goto(url, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(404);
      await hydrated(live);
      await live.waitForTimeout(400);
      await expectState(live, NONE, `${url} after hydration`);
      expect(realErrors(errors), 'no console or hydration errors').toEqual([]);
    });
  }

  for (const hash of ['%', '%zz', '%E0%A4%A', 'not-a-section']) {
    test(`/#${hash}: the nav renders, no page error, no link is current`, async ({ visit }) => {
      const page = await visit();
      const errors = watchErrors(page);
      await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
      await hydrated(page);
      await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveCount(5);
      await page.waitForTimeout(400);
      await expectState(page, NONE, `hash "${hash}"`);
      // Scrolling still works afterwards.
      await scrollSectionTo(page, 'about');
      await expectState(page, only('About', 'location'), 'scroll tracking works after a malformed hash');
      expect(errors, 'no page errors or console output').toEqual([]);
    });
  }
});

test.describe('home page sections follow the scroll (FR-002, SC-001)', () => {
  test('nothing is current at the hero, including right after hydration', async ({ visit }) => {
    const page = await visit();
    const errors = watchErrors(page);
    await goto(page, '/');
    await expectState(page, NONE);
    await page.waitForTimeout(400);
    await expectState(page, NONE, 'still nothing after the observer settled');
    expect(errors).toEqual([]);
  });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}px: scrolling each section under the header makes exactly that link current, down and back up, and nothing at the hero`, async ({ visit }) => {
      const page = await visit({ viewport });
      await goto(page, '/');
      await expectState(page, NONE);

      for (const id of SECTIONS) {
        await scrollSectionTo(page, id);
        await expectState(page, only(LABEL_OF[id], 'location'), `scrolling down to ${id}`);
      }
      for (const id of [...SECTIONS].reverse()) {
        await scrollSectionTo(page, id);
        await expectState(page, only(LABEL_OF[id], 'location'), `scrolling back up to ${id}`);
      }
      // Hero in view again: the first section is still below the middle of the viewport.
      await scrollSectionTo(page, 'work', Math.round(viewport.height * 0.7));
      await expectState(page, NONE, 'work is far below the header: the hero is what is read');
      await scrollToTop(page);
      await expectState(page, NONE, 'back at the top');
    });
  }

  test('scrolling with the wheel (real input, smooth scrolling on) ends on the section reached', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await scrollSectionTo(page, 'about', 900); // about ~900px below the header, then wheel it into place
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 1000);
    await scrollSettled(page);
    const reached = await page.evaluate(() => {
      const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
      const line = headerBottom + 0.15 * window.innerHeight; // well inside every plausible activation band
      return ['work', 'experience', 'about', 'contact'].find((id) => {
        const rect = document.getElementById(id)!.getBoundingClientRect();
        return rect.top <= line && rect.bottom > line;
      });
    });
    if (reached) await expectState(page, only(LABEL_OF[reached as SectionId], 'location'));
    expect((await headerCurrentCount(page)) <= 1).toBe(true);
  });

  test('the bottom of the page makes Contact current, and scrolling up leaves it', async ({ visit }) => {
    for (const viewport of VIEWPORTS) {
      const page = await visit({ viewport });
      await goto(page, '/');
      await scrollToBottom(page);
      await expectState(page, only('Contact', 'location'), `${viewport.width}px: bottom of the page`);
      await scrollSectionTo(page, 'about');
      await expectState(page, only('About', 'location'), `${viewport.width}px: back up to About`);
    }
  });

  test('at most one link is current at every sampled scroll position, and it matches the section near the top of the viewport', async ({ visit }) => {
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
      const page = await visit({ viewport });
      await goto(page, '/');
      const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      const positions: number[] = [];
      for (let y = 0; y <= total; y += 137) positions.push(y);
      positions.push(total);
      const violations: string[] = [];
      for (const y of positions) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
        // The observer reports asynchronously: wait until the state is consistent with the geometry, then record misses.
        const verdict = async () =>
          page.evaluate(() => {
            const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom;
            const band = [headerBottom, window.innerHeight * 0.5];
            const rects = Object.fromEntries(['work', 'experience', 'about', 'contact'].map((id) => [id, document.getElementById(id)!.getBoundingClientRect()]));
            const links = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a')).filter((a) => a.hasAttribute('aria-current'));
            const problems: string[] = [];
            if (links.length > 1) problems.push(`${links.length} current links: ${links.map((a) => a.textContent).join(', ')}`);
            const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
            if (links.length === 1) {
              const name = (links[0].textContent ?? '').trim().toLowerCase();
              const rect = rects[name];
              if (!rect) problems.push(`unexpected current link ${name}`);
              else if (!(rect.top < band[1] && rect.bottom > band[0]) && !(atBottom && name === 'contact')) problems.push(`${name} is current but not near the top (top ${Math.round(rect.top)}, bottom ${Math.round(rect.bottom)}, band ${Math.round(band[0])}-${Math.round(band[1])})`);
            } else if (links.length === 0) {
              if (rects.work.top < band[0] - 1) problems.push(`nothing current although work is already under the header (work top ${Math.round(rects.work.top)})`);
              if (atBottom) problems.push('nothing current at the bottom of the page');
            }
            return problems;
          });
        await expect.poll(verdict, { message: `scrollY ${y} at ${viewport.width}px`, timeout: 3_000 }).toEqual([]);
        const settled = await verdict();
        if (settled.length) violations.push(`y=${y}: ${settled.join('; ')}`);
      }
      expect(violations).toEqual([]);
    }
  });
});

test.describe('hash, clicks and history (FR-003)', () => {
  for (const id of SECTIONS) {
    test(`loading /#${id} highlights ${LABEL_OF[id]}`, async ({ visit }) => {
      const page = await visit();
      await goto(page, `/#${id}`);
      await expectState(page, only(LABEL_OF[id], 'location'));
      await scrollSettled(page);
      await expectState(page, only(LABEL_OF[id], 'location'), 'still current once the scroll settled');
    });
  }

  for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
    test(`${viewport.width}px: clicking each section link makes that link current once the scroll settles (down, then up)`, async ({ visit }) => {
      const page = await visit({ viewport });
      await goto(page, '/');
      for (const id of [...SECTIONS, 'about', 'experience', 'work'] as SectionId[]) {
        await navLink(page, LABEL_OF[id]).click();
        await scrollSettled(page);
        await expectState(page, only(LABEL_OF[id], 'location'), `after clicking ${LABEL_OF[id]}`);
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
      }
    });
  }

  for (const viewport of [{ width: 667, height: 375 }, { width: 390, height: 844 }]) {
    test(`${viewport.width}x${viewport.height}: clicking About and loading /#about both settle on About, not Experience`, async ({ visit }) => {
      const clicked = await visit({ viewport });
      await goto(clicked, '/');
      await navLink(clicked, 'About').click();
      await scrollSettled(clicked);
      await expectState(clicked, only('About', 'location'), 'after clicking About');
      await clicked.waitForTimeout(400);
      await expectState(clicked, only('About', 'location'), 'still About 400 ms after the scroll ended');

      const loaded = await visit({ viewport });
      await goto(loaded, '/#about');
      await scrollSettled(loaded);
      await expectState(loaded, only('About', 'location'), 'loaded with #about');
      await loaded.waitForTimeout(400);
      await expectState(loaded, only('About', 'location'), 'loaded with #about, 400 ms later');
    });
  }

  for (const [from, to] of [['work', 'about'], ['work', 'contact'], ['contact', 'work']] as const) {
    for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
      test(`${viewport.width}px: clicking ${LABEL_OF[to]} from ${LABEL_OF[from]} never flashes another link (sampled every frame)`, async ({ visit }) => {
        const page = await visit({ viewport });
        await goto(page, '/');
        await scrollSectionTo(page, from);
        await expectState(page, only(LABEL_OF[from], 'location'));
        const label = LABEL_OF[to];
        const frames = await page.evaluate(
          (text) =>
            new Promise<Array<string[]>>((resolve) => {
              const link = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a')).find((a) => (a.textContent ?? '').trim() === text) as HTMLElement;
              const samples: Array<string[]> = [];
              const startY = window.scrollY;
              let lastY = startY;
              let lastChange = performance.now();
              let moved = false;
              const started = performance.now();
              const frame = () => {
                const now = performance.now();
                if (Math.abs(window.scrollY - lastY) > 0.5) {
                  lastY = window.scrollY;
                  lastChange = now;
                  moved = true;
                }
                samples.push(Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a[aria-current]')).map((a) => (a.textContent ?? '').trim()));
                if ((moved && now - lastChange > 500) || now - started > 8000) resolve(samples);
                else requestAnimationFrame(frame);
              };
              link.click();
              requestAnimationFrame(frame);
            }),
          label,
        );
        expect(frames.length, 'frames sampled').toBeGreaterThan(10);
        const seen = new Set(frames.map((names) => names.join('+') || '(none)'));
        expect(Array.from(seen), `current link per frame after the click (${frames.length} frames)`).toEqual([label]);
      });
    }
  }

  test('a tall viewport (1440x2000) scrolled to the bottom has Contact current', async ({ visit }) => {
    const page = await visit({ viewport: { width: 1440, height: 2000 } });
    await goto(page, '/');
    await scrollToBottom(page);
    await expectState(page, only('Contact', 'location'));
    await scrollToTop(page);
    await expectState(page, NONE, 'top of the tall page');
  });

  test('keyboard activation (Enter on a focused link) works too', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await navLink(page, 'About').focus();
    await page.keyboard.press('Enter');
    await scrollSettled(page);
    await expectState(page, only('About', 'location'));
  });

  test('back and forward between hashes follow the history entry', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await navLink(page, 'Work').click();
    await scrollSettled(page);
    await navLink(page, 'About').click();
    await scrollSettled(page);
    await navLink(page, 'Contact').click();
    await scrollSettled(page);
    await expectState(page, only('Contact', 'location'));

    await page.goBack();
    await expect(page).toHaveURL(/#about$/);
    await expectMatchesGeometry(page, 'back to #about');
    await expectState(page, only('About', 'location'), 'back to #about: the restored scroll shows About');
    await page.goBack();
    await expect(page).toHaveURL(/#work$/);
    await expectMatchesGeometry(page, 'back to #work');
    await page.goForward();
    await expect(page).toHaveURL(/#about$/);
    await expectMatchesGeometry(page, 'forward to #about');
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expectMatchesGeometry(page, 'back to the entry without a hash');
  });

  test('client-side navigation home -> blog -> section -> blog -> back updates the highlight each time', async ({ visit }) => {
    const page = await visit();
    const errors = watchErrors(page);
    await goto(page, '/');
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await expectState(page, NONE);

    await navLink(page, 'Blog').click();
    await expect(page).toHaveURL(/\/blog$/);
    await expectState(page, only('Blog', 'page'), 'on the blog index');

    await navLink(page, 'Work').click();
    await expect(page).toHaveURL(/\/#work$/);
    await scrollSettled(page);
    await expectState(page, only('Work', 'location'), 'on the home page, Work section');

    await navLink(page, 'Blog').click();
    await expect(page).toHaveURL(/\/blog$/);
    await expectState(page, only('Blog', 'page'), 'on the blog index again');

    await page.goBack();
    await expect(page).toHaveURL(/\/#work$/);
    await scrollSettled(page);
    await expectState(page, only('Work', 'location'), 'back to the Work section');
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload), 'no full page reload').toBe(true);
    expect(errors).toEqual([]);
  });

  test('an article reached from the blog index keeps Blog current, and the logo link home clears it', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/blog');
    await page.locator(`a[href="${ARTICLE}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
    await expectState(page, only('Blog', 'page'), 'on an article');
    await page.locator('.site-header a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expectState(page, NONE, 'home hero via the logo');
  });
});

test.describe('the highlight is visible, AA, and shifts nothing (FR-004, SC-003)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: the current link is accent-coloured with a persistent underline and meets 4.5:1 against the header in all six seasons`, async ({ visit }) => {
      const failures: string[] = [];
      for (const season of SEASON_IDS) {
        for (const [url, name, kind] of [
          ['/blog', 'Blog', 'page'],
          ['/#about', 'About', 'location'],
        ] as const) {
          const page = await visit({ theme, season });
          await goto(page, url);
          await expect(page.locator('html')).toHaveAttribute('data-season', season);
          await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
          await expectState(page, only(name, kind));
          await scrollSettled(page);
          const facts = await page.evaluate((linkName) => {
            const link = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a')).find((a) => (a.textContent ?? '').trim() === linkName)!;
            const other = Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a')).find((a) => !a.hasAttribute('aria-current'))!;
            const link$ = getComputedStyle(link);
            const other$ = getComputedStyle(other);
            return {
              color: link$.color,
              decorationColor: link$.textDecorationColor,
              decorationLine: link$.textDecorationLine,
              otherDecorationColor: other$.textDecorationColor,
              header: getComputedStyle(document.querySelector('.site-header')!).backgroundColor,
              body: getComputedStyle(document.body).backgroundColor,
              accent: getComputedStyle(document.documentElement).getPropertyValue('--accent'),
            };
          }, name);
          const ground = (() => {
            let bg = parseColour(facts.header);
            if (bg[3] < 1) bg = over(bg, parseColour(facts.body));
            return bg;
          })();
          const colour = parseColour(facts.color);
          const ratio = contrast(colour, ground);
          const label = `${season}/${theme} ${url}`;
          if (ratio < 4.5) failures.push(`${label}: ${name} contrast ${ratio.toFixed(2)} (< 4.5) colour ${facts.color} on ${facts.header}`);
          const accent = hexToRgba(facts.accent);
          if (colour.slice(0, 3).some((channel, i) => Math.abs(channel - accent[i]) > 1)) failures.push(`${label}: link colour ${facts.color} is not the accent ${facts.accent}`);
          if (!facts.decorationLine.includes('underline')) failures.push(`${label}: no underline (${facts.decorationLine})`);
          if (parseColour(facts.decorationColor)[3] === 0) failures.push(`${label}: underline colour is transparent without hover`);
          if (parseColour(facts.otherDecorationColor)[3] !== 0) failures.push(`${label}: a non-current link shows its underline without hover`);
          await page.context().close();
        }
      }
      expect(failures).toEqual([]);
    });
  }

  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}px: the current state changes no link's box, size, weight, or the header height`, async ({ visit }) => {
      const page = await visit({ viewport });
      await goto(page, '/');
      const measure = () =>
        page.evaluate(() => {
          const round = (n: number) => Math.round(n * 100) / 100;
          const header = document.querySelector('.site-header')!.getBoundingClientRect();
          return {
            header: round(header.height),
            links: Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a')).map((a) => {
              const rect = a.getBoundingClientRect();
              const style = getComputedStyle(a);
              return { text: (a.textContent ?? '').trim(), box: [rect.x, rect.y, rect.width, rect.height].map(round), fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily, letterSpacing: style.letterSpacing };
            }),
          };
        });
      await expectState(page, NONE);
      const hero = await measure();
      expect(hero.links.map((link) => link.text)).toEqual([...LINKS]);

      for (const id of SECTIONS) {
        await scrollSectionTo(page, id);
        await expectState(page, only(LABEL_OF[id], 'location'));
        expect(await measure(), `${id} current vs hero`).toEqual(hero);
      }
      await goto(page, '/blog');
      await expectState(page, only('Blog', 'page'));
      expect(await measure(), 'Blog current vs hero').toEqual(hero);
    });

    test(`${viewport.width}px: no horizontal overflow on the home page (hero and a current section), the blog index and an article`, async ({ visit }) => {
      const page = await visit({ viewport });
      await goto(page, '/');
      await noOverflow(page);
      await scrollSectionTo(page, 'about');
      await expectState(page, only('About', 'location'));
      await noOverflow(page);
      await scrollToBottom(page);
      await expectState(page, only('Contact', 'location'));
      await noOverflow(page);
      for (const url of ['/blog', ARTICLE]) {
        await goto(page, url);
        await expectState(page, only('Blog', 'page'));
        await noOverflow(page);
      }
      const edges = await page.evaluate(() => Array.from(document.querySelectorAll('nav[aria-label="Main navigation"] a')).map((a) => {
        const rect = a.getBoundingClientRect();
        return { text: a.textContent, left: rect.left, right: rect.right };
      }));
      for (const edge of edges) {
        expect(edge.left, `${edge.text} left edge`).toBeGreaterThanOrEqual(-0.5);
        expect(edge.right, `${edge.text} right edge`).toBeLessThanOrEqual(viewport.width + 0.5);
      }
    });
  }

  test('keyboard: the nav keeps its markup and order, and the current link keeps the same visible focus indication as the others', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/blog');
    await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(1);
    expect(await page.locator('nav[aria-label="Main navigation"] a').allTextContents()).toEqual([...LINKS]);
    const focus: Record<string, { style: string; width: string; colour: string; offset: string }> = {};
    const order: string[] = [];
    for (let i = 0; i < 14 && order.length < 5; i++) {
      await page.keyboard.press('Tab');
      const hit = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !active.closest('nav[aria-label="Main navigation"]')) return null;
        const style = getComputedStyle(active);
        return { text: (active.textContent ?? '').trim(), style: style.outlineStyle, width: style.outlineWidth, colour: style.outlineColor, offset: style.outlineOffset };
      });
      if (hit) {
        order.push(hit.text);
        focus[hit.text] = hit;
      }
    }
    expect(order, 'Tab order').toEqual([...LINKS]);
    expect(focus.Blog.style, 'the current link shows a focus outline').not.toBe('none');
    expect(parseFloat(focus.Blog.width)).toBeGreaterThan(0);
    const ring = (name: LinkName) => ({ style: focus[name].style, width: focus[name].width, offset: focus[name].offset });
    for (const name of ['Work', 'About'] as const) {
      expect(ring('Blog'), `Blog (current) focus ring equals ${name}'s`).toEqual(ring(name));
    }
  });
});

test.describe('reduced motion (FR-005)', () => {
  test('reduce: the current link has no transition and the highlight still follows the scroll', async ({ visit }) => {
    const page = await visit({ reducedMotion: 'reduce' });
    await goto(page, '/');
    await scrollSectionTo(page, 'about');
    await expectState(page, only('About', 'location'));
    const durations = await page.evaluate(() => {
      const link = document.querySelector('nav[aria-label="Main navigation"] a[aria-current]')!;
      const style = getComputedStyle(link);
      return { duration: style.transitionDuration.split(',').map((part) => parseFloat(part)), animations: link.getAnimations().length };
    });
    expect(durations.duration.every((value) => value === 0), `transition durations ${durations.duration}`).toBe(true);
    expect(durations.animations).toBe(0);
    await scrollSectionTo(page, 'contact');
    await expectState(page, only('Contact', 'location'));
  });

  test('no preference: a colour change on the current link, if animated at all, takes no longer than the existing 180 ms', async ({ visit }) => {
    const page = await visit({ reducedMotion: 'no-preference' });
    await goto(page, '/blog');
    const timing = await page.evaluate(() => {
      const link = document.querySelector('nav[aria-label="Main navigation"] a[aria-current]')!;
      const style = getComputedStyle(link);
      const properties = style.transitionProperty.split(',').map((part) => part.trim());
      const durations = style.transitionDuration.split(',').map((part) => parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000));
      return properties.map((property, i) => [property, durations[i % durations.length]] as const);
    });
    for (const [property, ms] of timing) expect(ms, `${property} transition`).toBeLessThanOrEqual(180);
  });
});
