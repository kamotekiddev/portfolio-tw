import { expect, test as base, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { blogFixtures, restartFixtureServer } from './blog-fixtures';

/*
 * Browser regression coverage for specs/003-seasonal-theme (contracts/season-contract.md).
 * The expectation tables below are written out from the spec's season table on purpose: they are an
 * independent oracle, not a re-import of app/data/seasons.ts.
 */

const ARTICLE = '/blog/fixture-newest';
const EMERALD = { dark: '#64dba3', light: '#086d4e' } as const;
const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter', 'wet', 'dry'] as const;
type SeasonId = (typeof SEASON_IDS)[number];
type Theme = 'dark' | 'light';

const LABELS: Record<SeasonId, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
  wet: 'Wet season',
  dry: 'Dry season',
};

/** January to December, straight from the Assumptions table in spec.md. */
const BANDS: Record<string, { zone: string; months: string }> = {
  'north-temperate': { zone: 'Europe/Berlin', months: 'winter winter spring spring spring summer summer summer autumn autumn autumn winter' },
  'south-temperate': { zone: 'Australia/Sydney', months: 'summer summer autumn autumn autumn winter winter winter spring spring spring summer' },
  'north-tropical': { zone: 'Asia/Manila', months: 'dry dry dry dry dry wet wet wet wet wet wet dry' },
  'south-tropical': { zone: 'Asia/Jakarta', months: 'wet wet wet wet wet dry dry dry dry dry dry wet' },
};

const midMonth = (month: number) => Date.UTC(2026, month, 15, 12, 0, 0);
const WINTER_BERLIN = '2026-01-15T12:00:00Z';

type VisitOptions = {
  timeZone?: string;
  now?: string | number;
  theme?: Theme;
  /** Raw value to seed into localStorage["season"] before any page script runs. */
  season?: string;
  reducedMotion?: 'reduce' | 'no-preference';
  viewport?: { width: number; height: number };
  javaScriptEnabled?: boolean;
  /** Abort every external script so only inline scripts can run (no hydration). */
  blockScripts?: boolean;
  /** Record every change of html[data-season] from the very first parsed byte. */
  recordSeason?: boolean;
};

const test = base.extend<{ visit: (options?: VisitOptions) => Promise<Page> }>({
  visit: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    await use(async (options = {}) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        timezoneId: options.timeZone ?? 'Europe/Berlin',
        viewport: options.viewport ?? { width: 1440, height: 900 },
        reducedMotion: options.reducedMotion ?? 'no-preference',
        javaScriptEnabled: options.javaScriptEnabled ?? true,
      });
      contexts.push(context);
      await context.clock.setFixedTime(options.now ?? WINTER_BERLIN);
      const seeds: Record<string, string> = {};
      if (options.theme) seeds.theme = options.theme;
      if (options.season !== undefined) seeds.season = options.season;
      if (Object.keys(seeds).length) {
        await context.addInitScript((entries) => {
          try {
            for (const [key, value] of Object.entries(entries)) {
              if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
            }
          } catch {
            /* storage unavailable on this document */
          }
        }, seeds);
      }
      if (options.recordSeason) {
        await context.addInitScript(() => {
          const log: Array<string | null> = [];
          (window as unknown as { __seasonLog: Array<string | null> }).__seasonLog = log;
          new MutationObserver((records) => {
            for (const record of records) log.push((record.target as Element).getAttribute('data-season'));
          }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-season'] });
        });
      }
      if (options.blockScripts) {
        await context.route('**/*', (route) =>
          route.request().resourceType() === 'script' ? route.abort() : route.continue(),
        );
      }
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeAll(async ({}, testInfo) => {
  // blog.spec.ts ends by restarting the shared fixture server with no posts. When this file runs after it,
  // put the original fixtures back so article routes exist.
  const origin = String(testInfo.project.use.baseURL);
  const response = await fetch(`${origin}${ARTICLE}`).catch(() => undefined);
  if (response?.status === 200) return;
  testInfo.setTimeout(300_000);
  await restartFixtureServer(blogFixtures);
});

// ---------------------------------------------------------------------------------------------------------------
// Helpers

const html = (page: Page) => page.locator('html');
const seasonButton = (page: Page) => page.getByRole('button', { name: /^Season:/ });
const seasonMenu = (page: Page) => page.getByRole('menu', { name: 'Season' });
const menuItem = (page: Page, name: string) => seasonMenu(page).getByRole('menuitemradio', { name, exact: true });
const themeButton = (page: Page) => page.getByRole('button', { name: /^Switch to (dark|light) theme$/ });
const ambient = (page: Page) => page.locator('.season-ambient');

async function goto(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  return response;
}

/** The picker and theme toggle are disabled until React hydrates, which makes them a hydration signal. */
async function hydrated(page: Page) {
  await expect(seasonButton(page)).toBeEnabled();
  await expect(themeButton(page)).toBeEnabled();
}

async function expectSeason(page: Page, season: SeasonId | null) {
  if (season) await expect(html(page)).toHaveAttribute('data-season', season);
  else await expect(html(page)).not.toHaveAttribute('data-season', /.*/);
}

async function pick(page: Page, label: string) {
  await seasonButton(page).click();
  await menuItem(page, label).click();
}

async function storedSeason(page: Page) {
  return page.evaluate(() => localStorage.getItem('season'));
}

const TOKENS = ['--ground', '--surface', '--ink', '--muted', '--accent', '--accent-hover', '--on-accent', '--contact'] as const;
type Tokens = Record<(typeof TOKENS)[number], string>;

async function readTokens(page: Page): Promise<Tokens> {
  return page.evaluate((names) => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim().toLowerCase()]));
  }, TOKENS as unknown as string[]) as Promise<Tokens>;
}

async function accent(page: Page) {
  return (await readTokens(page))['--accent'];
}

function rgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  expect(full, `colour token "${hex}" must be a hex colour`).toMatch(/^[0-9a-f]{6}$/);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function blend(top: [number, number, number], bottom: [number, number, number], alpha: number): [number, number, number] {
  return top.map((channel, i) => channel * alpha + bottom[i] * (1 - alpha)) as [number, number, number];
}

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

async function inside(locator: Locator, viewport: { width: number; height: number }) {
  const box = await locator.boundingBox();
  expect(box, 'element must be rendered').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 0.5);
}

// ---------------------------------------------------------------------------------------------------------------
// US1 / FR-001, FR-002, FR-016, SC-001 - detection

test.describe('detection from device time zone and date (FR-002, SC-001)', () => {
  for (const [band, { zone, months }] of Object.entries(BANDS)) {
    test(`${band} (${zone}): all twelve months match the season table`, async ({ visit }) => {
      const page = await visit({ timeZone: zone });
      const expected = months.split(' ') as SeasonId[];
      expect(expected).toHaveLength(12);
      for (let month = 0; month < 12; month += 1) {
        await page.context().clock.setFixedTime(midMonth(month));
        await goto(page, '/');
        await expectSeason(page, expected[month]);
      }
    });
  }

  test('headline examples: Berlin, Sydney, Manila and Jakarta in January and July', async ({ visit }) => {
    const cases: Array<[string, string, SeasonId]> = [
      ['Europe/Berlin', '2026-01-15T12:00:00Z', 'winter'],
      ['Europe/Berlin', '2026-07-15T12:00:00Z', 'summer'],
      ['Australia/Sydney', '2026-01-15T12:00:00Z', 'summer'],
      ['Australia/Sydney', '2026-07-15T12:00:00Z', 'winter'],
      ['Asia/Manila', '2026-11-15T12:00:00Z', 'wet'],
      ['Asia/Manila', '2026-02-15T12:00:00Z', 'dry'],
      ['Asia/Jakarta', '2026-01-15T12:00:00Z', 'wet'],
      ['Asia/Jakarta', '2026-07-15T12:00:00Z', 'dry'],
      ['America/New_York', '2026-01-15T12:00:00Z', 'winter'],
      ['Pacific/Auckland', '2026-01-15T12:00:00Z', 'summer'],
      ['Africa/Nairobi', '2026-01-15T12:00:00Z', 'wet'],
    ];
    for (const [timeZone, now, expected] of cases) {
      const page = await visit({ timeZone, now });
      await goto(page, '/');
      await expect(html(page), `${timeZone} at ${now}`).toHaveAttribute('data-season', expected);
      await page.context().close();
    }
  });

  test('month boundaries use the device-local calendar month, not UTC', async ({ visit }) => {
    // Each pair straddles local midnight at the month boundary while the UTC date is still the earlier month.
    const cases: Array<[string, string, SeasonId, string, SeasonId]> = [
      ['Europe/Berlin', '2026-11-30T22:59:00Z', 'autumn', '2026-11-30T23:00:00Z', 'winter'],
      ['Europe/Berlin', '2026-02-28T22:59:00Z', 'winter', '2026-02-28T23:00:00Z', 'spring'],
      ['Australia/Sydney', '2026-02-28T12:59:00Z', 'summer', '2026-02-28T13:00:00Z', 'autumn'],
      ['Australia/Sydney', '2026-08-31T13:59:00Z', 'winter', '2026-08-31T14:00:00Z', 'spring'],
      ['Asia/Manila', '2026-05-31T15:59:00Z', 'dry', '2026-05-31T16:00:00Z', 'wet'],
      ['Asia/Manila', '2026-11-30T15:59:00Z', 'wet', '2026-11-30T16:00:00Z', 'dry'],
      ['Asia/Jakarta', '2026-05-31T16:59:00Z', 'wet', '2026-05-31T17:00:00Z', 'dry'],
    ];
    for (const [timeZone, before, seasonBefore, after, seasonAfter] of cases) {
      const page = await visit({ timeZone, now: before });
      await goto(page, '/');
      await expect(html(page), `${timeZone} just before local month change (${before})`).toHaveAttribute('data-season', seasonBefore);
      await page.context().clock.setFixedTime(after);
      await goto(page, '/');
      await expect(html(page), `${timeZone} just after local month change (${after})`).toHaveAttribute('data-season', seasonAfter);
      await page.context().close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FR-006 - unknown region fallback

test.describe('unrecognised region falls back to the emerald design (FR-006)', () => {
  for (const timeZone of ['UTC', 'Etc/GMT-8']) {
    for (const theme of ['dark', 'light'] as const) {
      test(`${timeZone} in ${theme}: no data-season, emerald accent, no ambient`, async ({ visit }) => {
        const page = await visit({ timeZone, theme, now: midMonth(6) });
        await goto(page, '/');
        await expectSeason(page, null);
        await expect(html(page)).toHaveClass(new RegExp(`\\b${theme}\\b`));
        expect(await accent(page)).toBe(EMERALD[theme]);
        await expect(ambient(page)).toHaveCount(1);
        await expect(ambient(page)).toHaveCSS('display', 'none');
      });
    }
  }

  test('a visitor in an unrecognised region can still choose a season and return to Automatic', async ({ visit }) => {
    const page = await visit({ timeZone: 'UTC' });
    await goto(page, '/');
    await hydrated(page);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Automatic');
    await pick(page, 'Winter');
    await expectSeason(page, 'winter');
    expect(await accent(page)).not.toBe(EMERALD.dark);
    await pick(page, 'Automatic');
    await expectSeason(page, null);
    expect(await accent(page)).toBe(EMERALD.dark);
    expect(await storedSeason(page)).toBe('auto');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FR-010 / SC-004 - no flash

test.describe('season is set before first paint (FR-010, SC-004)', () => {
  test('inline script alone applies the detected season and palette, with every external script blocked', async ({ visit }) => {
    const page = await visit({ blockScripts: true, now: '2026-07-15T12:00:00Z' });
    await goto(page, '/');
    await expectSeason(page, 'summer');
    expect(await accent(page)).toBe('#eec35a'); // dark summer; proves the palette applied without hydration
    // Hydration really did not happen: controls still carry the server-rendered disabled state.
    await expect(page.locator('.season-toggle')).toBeDisabled();
  });

  test('inline script alone applies a stored manual preference over detection', async ({ visit }) => {
    const page = await visit({ blockScripts: true, season: 'autumn', now: '2026-07-15T12:00:00Z' });
    await goto(page, '/');
    await expectSeason(page, 'autumn');
    await expect(page.locator('.season-toggle')).toBeDisabled();
  });

  test('automatic: the attribute is written once and never changes during hydration', async ({ visit }) => {
    const page = await visit({ recordSeason: true, now: '2026-07-15T12:00:00Z' });
    await goto(page, '/');
    await hydrated(page);
    await page.waitForLoadState('load');
    const log = await page.evaluate(() => (window as unknown as { __seasonLog: Array<string | null> }).__seasonLog);
    expect(log).toEqual(['summer']);
  });

  test('stored preference: the attribute is written once with the stored season, never the detected one', async ({ visit }) => {
    const page = await visit({ recordSeason: true, season: 'wet', now: '2026-07-15T12:00:00Z' });
    await goto(page, '/');
    await hydrated(page);
    await page.waitForLoadState('load');
    const log = await page.evaluate(() => (window as unknown as { __seasonLog: Array<string | null> }).__seasonLog);
    expect(log).toEqual(['wet']);
  });

  test('client-side navigation does not re-write the attribute', async ({ visit }) => {
    const page = await visit({ recordSeason: true, season: 'winter' });
    await goto(page, '/');
    await hydrated(page);
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    const log = await page.evaluate(() => (window as unknown as { __seasonLog: Array<string | null> }).__seasonLog);
    expect(log).toEqual(['winter']);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FR-007 - consistency across routes

test.describe('consistency across routes (FR-007)', () => {
  test('home, blog index, article and both not-found pages carry the same season and one ambient layer', async ({ visit }) => {
    const page = await visit({ now: '2026-07-15T12:00:00Z' });
    const routes: Array<[string, number]> = [
      ['/', 200],
      ['/blog', 200],
      [ARTICLE, 200],
      ['/definitely-not-a-page', 404],
      ['/blog/definitely-not-an-article', 404],
    ];
    for (const [route, status] of routes) {
      const response = await goto(page, route);
      expect(response?.status(), route).toBe(status);
      await expectSeason(page, 'summer');
      await expect(ambient(page), route).toHaveCount(1);
      await expect(page.locator('.season-toggle'), route).toHaveCount(1);
      await expect(ambient(page), route).toHaveCSS('display', 'block');
    }
  });

  test('a manual choice survives client-side navigation between home, blog, article and back', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await pick(page, 'Wet season');
    await expectSeason(page, 'wet');

    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expectSeason(page, 'wet');
    await expect(ambient(page)).toHaveCount(1);

    await page.getByRole('link', { name: /Fixture Newest/ }).click();
    await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
    await expectSeason(page, 'wet');
    await expect(ambient(page)).toHaveCount(1);

    await page.getByRole('link', { name: 'Back to blog' }).click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expectSeason(page, 'wet');
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Wet season');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// US2 / FR-008, FR-009, SC-003 - picker

test.describe('season picker (FR-008, FR-009, SC-003)', () => {
  test('contract: button, menu and seven radio items with accessible names and state', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);

    const button = seasonButton(page);
    await expect(button).toHaveAccessibleName('Season: Automatic');
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(seasonMenu(page)).toHaveCount(0);

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(seasonMenu(page)).toBeVisible();
    const items = seasonMenu(page).getByRole('menuitemradio');
    await expect(items).toHaveCount(7);
    const names = await items.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? node.textContent));
    expect(names).toEqual(['Automatic', 'Spring', 'Summer', 'Autumn', 'Winter', 'Wet season', 'Dry season']);
    await expect(seasonMenu(page).getByRole('menuitemradio', { checked: true })).toHaveCount(1);
    await expect(menuItem(page, 'Automatic')).toHaveAttribute('aria-checked', 'true');
    await expect(menuItem(page, 'Winter')).toHaveAttribute('aria-checked', 'false');
  });

  test('choosing a season applies immediately without navigation, updates the name and aria-checked, and persists', async ({ visit }) => {
    const page = await visit({ now: '2026-07-15T12:00:00Z' });
    await goto(page, '/');
    await hydrated(page);
    await expectSeason(page, 'summer');
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest()) requests.push(request.url());
    });

    for (const id of SEASON_IDS) {
      await pick(page, LABELS[id]);
      await expectSeason(page, id); // same tick: no reload, no waiting for a navigation
      await expect(seasonButton(page)).toHaveAccessibleName(`Season: ${LABELS[id]}`);
      await expect(seasonMenu(page)).toHaveCount(0);
      expect(await storedSeason(page)).toBe(id);
      await seasonButton(page).click();
      await expect(menuItem(page, LABELS[id])).toHaveAttribute('aria-checked', 'true');
      await expect(seasonMenu(page).getByRole('menuitemradio', { checked: true })).toHaveCount(1);
      await page.keyboard.press('Escape');
    }
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    await pick(page, 'Autumn');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expectSeason(page, 'autumn');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Autumn');
    await goto(page, ARTICLE);
    await expectSeason(page, 'autumn');
  });

  test('changing the season takes at most two interactions from any page (SC-003)', async ({ visit }) => {
    const page = await visit();
    for (const route of ['/', '/blog', ARTICLE, '/definitely-not-a-page']) {
      await goto(page, route);
      await hydrated(page);
      await seasonButton(page).click(); // interaction 1
      await menuItem(page, 'Dry season').click(); // interaction 2
      await expectSeason(page, 'dry');
      await pick(page, 'Automatic');
    }
  });

  test('Automatic restores detection, stores "auto", and survives reload', async ({ visit }) => {
    const page = await visit({ now: '2026-01-15T12:00:00Z' }); // Berlin January: winter
    await goto(page, '/');
    await hydrated(page);
    await pick(page, 'Dry season');
    await expectSeason(page, 'dry');
    await pick(page, 'Automatic');
    await expectSeason(page, 'winter');
    expect(await storedSeason(page)).toBe('auto');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Automatic');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expectSeason(page, 'winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Automatic');
  });

  test('an invalid stored value behaves as Automatic', async ({ visit }) => {
    for (const bad of ['banana', '', 'WINTER', ' winter', '{"season":"winter"}', 'null', 'undefined']) {
      const page = await visit({ now: '2026-07-15T12:00:00Z', season: bad });
      await page.context().addInitScript((value) => {
        try {
          localStorage.setItem('season', value);
        } catch {
          /* ignore */
        }
      }, bad);
      await goto(page, '/');
      await expectSeason(page, 'summer'); // Berlin July
      await hydrated(page);
      await expect(seasonButton(page), `stored "${bad}"`).toHaveAccessibleName('Season: Automatic');
      await seasonButton(page).click();
      await expect(menuItem(page, 'Automatic')).toHaveAttribute('aria-checked', 'true');
      await page.context().close();
    }
  });

  test('keyboard only: reach the button with Tab, open, navigate, select, escape and focus return', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);

    // Reach the control by Tab alone.
    let reached = false;
    for (let i = 0; i < 25 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => document.activeElement?.classList.contains('season-toggle') ?? false);
    }
    expect(reached, 'Tab order must reach the season button').toBe(true);
    await expect(seasonButton(page)).toBeFocused();

    // Open with Enter: focus moves to the checked item.
    await page.keyboard.press('Enter');
    await expect(seasonMenu(page)).toBeVisible();
    await expect(menuItem(page, 'Automatic')).toBeFocused();
    const ring = await menuItem(page, 'Automatic').evaluate((node) => {
      const style = getComputedStyle(node);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), matches: node.matches(':focus-visible') };
    });
    expect(ring.matches).toBe(true);
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThan(0);

    await page.keyboard.press('ArrowDown');
    await expect(menuItem(page, 'Spring')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menuItem(page, 'Summer')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(menuItem(page, 'Spring')).toBeFocused();
    await page.keyboard.press('End');
    await expect(menuItem(page, 'Dry season')).toBeFocused();
    await page.keyboard.press('ArrowDown'); // wraps
    await expect(menuItem(page, 'Automatic')).toBeFocused();
    await page.keyboard.press('ArrowUp'); // wraps the other way
    await expect(menuItem(page, 'Dry season')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(menuItem(page, 'Automatic')).toBeFocused();

    // Escape closes, returns focus and changes nothing.
    await page.keyboard.press('Escape');
    await expect(seasonMenu(page)).toHaveCount(0);
    await expect(seasonButton(page)).toBeFocused();
    await expect(seasonButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Automatic');
    expect(await storedSeason(page)).toBeNull();

    // ArrowDown on the button also opens it; select Winter with arrows + Enter.
    await page.keyboard.press('ArrowDown');
    await expect(seasonMenu(page)).toBeVisible();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
    await expect(menuItem(page, 'Winter')).toBeFocused();
    await page.keyboard.press('Enter');
    await expectSeason(page, 'winter');
    await expect(seasonMenu(page)).toHaveCount(0);
    await expect(seasonButton(page)).toBeFocused();
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    expect(await storedSeason(page)).toBe('winter');

    // Persisted choice is what the reopened menu focuses.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await seasonButton(page).focus();
    await page.keyboard.press('Space');
    await expect(menuItem(page, 'Winter')).toBeFocused();
    await expect(menuItem(page, 'Winter')).toHaveAttribute('aria-checked', 'true');
  });

  test('outside click and Tab close the menu', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    await seasonButton(page).click();
    await expect(seasonMenu(page)).toBeVisible();
    await page.mouse.click(8, 500);
    await expect(seasonMenu(page)).toHaveCount(0);
    await expect(seasonButton(page)).toHaveAttribute('aria-expanded', 'false');

    await seasonButton(page).click();
    await expect(seasonMenu(page)).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(seasonMenu(page)).toHaveCount(0);
  });

  test('clicking the button again closes the menu without changing the season', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    await seasonButton(page).click();
    await seasonButton(page).click();
    await expect(seasonMenu(page)).toHaveCount(0);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Automatic');
    expect(await storedSeason(page)).toBeNull();
  });

  test('storage unavailable: automatic still works and a manual choice lasts for the page view', async ({ visit }) => {
    const page = await visit({ now: '2026-07-15T12:00:00Z' });
    await page.context().addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await goto(page, '/');
    await expectSeason(page, 'summer');
    await expect(seasonButton(page)).toBeEnabled();
    await pick(page, 'Winter');
    await expectSeason(page, 'winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    await getAnyNavigation(page);
    expect(errors.filter((message) => /season/i.test(message))).toEqual([]);
  });
});

async function getAnyNavigation(page: Page) {
  // Client-side navigation keeps the in-memory choice for the current page view.
  await page.getByRole('link', { name: 'Blog' }).first().click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  await expectSeason(page, 'winter');
}

// ---------------------------------------------------------------------------------------------------------------
// FR-009 / FR-015 - independence from dark/light

test.describe('independence from the dark/light theme (FR-009, FR-015)', () => {
  test('dark remains the default on a fresh visit and nothing is stored until the visitor chooses', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expect(themeButton(page)).toHaveAccessibleName('Switch to light theme');
    expect(await storedSeason(page)).toBeNull();
  });

  test('toggling the theme keeps the season; both survive reload and navigation', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    await pick(page, 'Winter');
    await themeButton(page).click();
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    expect(await accent(page)).toBe('#1c5e8c');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'winter');

    await goto(page, ARTICLE);
    await hydrated(page);
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'winter');

    await pick(page, 'Wet season');
    await expect(html(page)).toHaveClass(/\blight\b/);
    await themeButton(page).click();
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expectSeason(page, 'wet');
    expect(await accent(page)).toBe('#5fd0d8');
  });

  test('rapid, interleaved season and theme changes end in the last requested state of each', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    for (let i = 0; i < 4; i += 1) {
      await pick(page, 'Wet season');
      await themeButton(page).click();
      await pick(page, 'Dry season');
      await themeButton(page).click();
    }
    await pick(page, 'Autumn');
    await themeButton(page).click();
    await expectSeason(page, 'autumn');
    await expect(html(page)).toHaveClass(/\blight\b/);
    expect(await storedSeason(page)).toBe('autumn');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expectSeason(page, 'autumn');
    await expect(html(page)).toHaveClass(/\blight\b/);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FR-005 / SC-002 - contrast from the live computed tokens

test.describe('palette contrast (FR-005, SC-002)', () => {
  test('all six seasons in both themes meet WCAG AA for text, buttons, focus and the ambient worst case', async ({ visit }) => {
    const accents: Record<Theme, Record<string, string>> = { dark: {}, light: {} };
    const failures: string[] = [];
    for (const theme of ['dark', 'light'] as const) {
      for (const season of SEASON_IDS) {
        const page = await visit({ theme, season });
        await goto(page, '/');
        await expectSeason(page, season);
        await expect(html(page)).toHaveClass(new RegExp(`\\b${theme}\\b`));
        const t = await readTokens(page);
        const layerOpacity = Number(await ambient(page).evaluate((node) => getComputedStyle(node).opacity));
        accents[theme][season] = t['--accent'];

        const c = (a: keyof Tokens, b: keyof Tokens) => contrast(rgb(t[a]), rgb(t[b]));
        const particlePairs: Array<[string, number]> = [];
        const pairs: Array<[string, number]> = [
          ['accent/ground', c('--accent', '--ground')],
          ['accent/surface', c('--accent', '--surface')],
          ['accent-hover/ground', c('--accent-hover', '--ground')],
          ['accent-hover/surface', c('--accent-hover', '--surface')],
          ['on-accent/accent', c('--on-accent', '--accent')],
          ['on-accent/accent-hover', c('--on-accent', '--accent-hover')],
          ['ink/contact', c('--ink', '--contact')],
          ['accent/contact', c('--accent', '--contact')],
          ['muted/contact', c('--muted', '--contact')],
          ['ink/ground', c('--ink', '--ground')],
          ['muted/ground', c('--muted', '--ground')],
          ['muted/surface', c('--muted', '--surface')],
        ];
        // A particle is the accent colour at the layer's group opacity; text may sit on top of it.
        expect(layerOpacity, 'ambient layer opacity must be a number in (0, 1]').toBeGreaterThan(0);
        // The layer sits at z-index -1, so only transparent areas over the page ground can ever show a particle;
        // surface and contact sections, the menu and code blocks have opaque backgrounds and cover it.
        for (const ground of ['--ground'] as const) {
          const particle = blend(rgb(t['--accent']), rgb(t[ground]), layerOpacity);
          for (const text of ['--ink', '--muted', '--accent'] as const) {
            particlePairs.push([`${text.slice(2)} over accent particle on ${ground.slice(2)} (alpha ${layerOpacity})`, contrast(rgb(t[text]), particle)]);
          }
        }
        for (const [name, ratio] of pairs) {
          if (ratio < 4.5) failures.push(`${season}/${theme} ${name} = ${ratio.toFixed(2)}`);
        }
        // A moving decorative particle can briefly sit behind a glyph: body ink must stay AA, and any text keeps the
        // 3:1 floor that applies to large text and UI components (FR-011).
        for (const [name, ratio] of particlePairs) {
          const floor = name.startsWith('ink ') ? 4.5 : 3;
          if (ratio < floor) failures.push(`${season}/${theme} ${name} = ${ratio.toFixed(2)} (floor ${floor})`);
        }
        await page.context().close();
      }
    }
    expect(failures, 'pairs below their contrast floor').toEqual([]);

    for (const theme of ['dark', 'light'] as const) {
      expect(new Set(Object.values(accents[theme])).size, `six distinct ${theme} accents`).toBe(6);
      expect(accents[theme].spring, 'spring reuses the emerald fallback').toBe(EMERALD[theme]);
      for (const season of SEASON_IDS.filter((id) => id !== 'spring')) {
        expect(accents[theme][season], `${season} differs from the fallback`).not.toBe(EMERALD[theme]);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// US3 / FR-011, FR-012, SC-005 - ambient layer

test.describe('ambient layer (FR-011, FR-012, SC-005)', () => {
  test('is decorative: aria-hidden, empty spans, not focusable, never a hit target, behind content', async ({ visit }) => {
    const page = await visit({ season: 'winter' });
    await goto(page, '/');
    await hydrated(page);
    const layer = ambient(page);
    await expect(layer).toHaveCount(1);
    await expect(layer).toHaveAttribute('aria-hidden', 'true');
    await expect(layer).toHaveCSS('pointer-events', 'none');
    await expect(layer).toHaveCSS('position', 'fixed');

    const facts = await layer.evaluate((node) => ({
      spans: node.children.length,
      allSpansEmpty: Array.from(node.children).every((child) => child.tagName === 'SPAN' && child.childNodes.length === 0),
      text: node.textContent,
      focusable: node.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
      ownTabindex: node.hasAttribute('tabindex'),
      zIndex: getComputedStyle(node).zIndex,
      pointer: Array.from(node.children).every((child) => getComputedStyle(child).pointerEvents === 'none'),
    }));
    expect(facts).toMatchObject({ spans: 18, allSpansEmpty: true, text: '', focusable: 0, ownTabindex: false, pointer: true });
    expect(Number(facts.zIndex)).toBeLessThan(0);

    // Hit-testing across a grid never lands in the layer.
    const hits = await page.evaluate(() => {
      const found: string[] = [];
      for (let x = 10; x < innerWidth; x += 120) {
        for (let y = 10; y < innerHeight; y += 90) {
          const element = document.elementFromPoint(x, y);
          if (!element || element.closest('.season-ambient')) found.push(`${x},${y}`);
        }
      }
      return found;
    });
    expect(hits).toEqual([]);

    // Real clicks still reach content and the menu while particles move.
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
  });

  test('every season has its own distinct, compositor-only animation and it follows the picker', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    const signatures = new Set<string>();
    const expectedAnimation: Record<SeasonId, string> = {
      spring: 'season-fall',
      summer: 'season-rise',
      autumn: 'season-fall',
      winter: 'season-fall',
      wet: 'season-rain',
      dry: 'season-drift',
    };
    for (const id of SEASON_IDS) {
      await pick(page, LABELS[id]);
      await expectSeason(page, id);
      await expect(ambient(page)).toHaveCSS('display', 'block');
      const info = await page.evaluate(() => {
        const spans = Array.from(document.querySelectorAll<HTMLElement>('.season-ambient span'));
        const first = getComputedStyle(spans[0]);
        const running = document
          .getAnimations()
          .filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest?.('.season-ambient'));
        const properties = new Set<string>();
        for (const animation of running) {
          for (const frame of (animation.effect as KeyframeEffect).getKeyframes()) {
            for (const key of Object.keys(frame)) {
              if (!['offset', 'easing', 'composite', 'computedOffset'].includes(key)) properties.add(key);
            }
          }
        }
        return {
          visible: spans.filter((span) => getComputedStyle(span).display !== 'none').length,
          running: running.length,
          states: Array.from(new Set(running.map((animation) => animation.playState))),
          names: Array.from(new Set(running.map((animation) => (animation as CSSAnimation).animationName))),
          properties: Array.from(properties).sort(),
          signature: [first.animationName, first.width, first.height, first.animationDuration, first.borderRadius].join('|'),
        };
      });
      expect(info.running, `${id} animations running`).toBeGreaterThan(0);
      expect(info.running).toBe(info.visible);
      expect(info.states).toEqual(['running']);
      expect(info.names).toEqual([expectedAnimation[id]]);
      expect(info.properties, `${id} must animate only transform and opacity`).toEqual(['opacity', 'transform']);
      signatures.add(info.signature);
    }
    expect(signatures.size, 'each season has a visibly different effect').toBe(6);
  });

  test('fewer particles on narrow viewports', async ({ visit }) => {
    const page = await visit({ viewport: { width: 390, height: 844 }, season: 'autumn' });
    await goto(page, '/');
    const visible = await page.evaluate(
      () => Array.from(document.querySelectorAll('.season-ambient span')).filter((span) => getComputedStyle(span).display !== 'none').length,
    );
    expect(visible).toBe(10);
  });

  for (const season of SEASON_IDS) {
    test(`reduced motion (${season}): layer not displayed, zero ambient animations, palette still applied`, async ({ visit }) => {
      const baseline = await visit({ season });
      await goto(baseline, '/');
      const seasonAccent = await accent(baseline);

      const page = await visit({ season, reducedMotion: 'reduce' });
      await goto(page, '/');
      await hydrated(page);
      await expectSeason(page, season);
      expect(await accent(page)).toBe(seasonAccent);
      await expect(ambient(page)).toHaveCSS('display', 'none');
      const running = await page.evaluate(
        () => document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest?.('.season-ambient')).length,
      );
      expect(running).toBe(0);
      // Changing season under reduced motion keeps it off.
      await pick(page, season === 'wet' ? 'Dry season' : 'Wet season');
      await expect(ambient(page)).toHaveCSS('display', 'none');
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// FR-013 / SC-006 - layout

test.describe('no overflow and usable header controls (FR-013, SC-006, US2.5)', () => {
  const widths = [390, 768, 1440];
  for (const theme of ['dark', 'light'] as const) {
    for (const width of widths) {
      for (const season of ['winter', 'wet', 'auto']) {
        test(`${theme} at ${width}px, season ${season}: no horizontal overflow on home and article`, async ({ visit }) => {
          const viewport = { width, height: width === 390 ? 844 : 900 };
          const page = await visit({ theme, season, viewport });
          for (const route of ['/', ARTICLE]) {
            await goto(page, route);
            await hydrated(page);
            await expect(html(page)).toHaveClass(new RegExp(`\\b${theme}\\b`));
            await noOverflow(page);
            await expect(seasonButton(page)).toBeVisible();
            await expect(seasonButton(page)).toBeEnabled();
            await expect(themeButton(page)).toBeVisible();
            await expect(themeButton(page)).toBeEnabled();
            await inside(seasonButton(page), viewport);
            await inside(themeButton(page), viewport);
            for (const link of await page.locator('.main-nav a').all()) {
              await expect(link).toBeVisible();
              await inside(link, viewport);
            }
          }
        });
      }
    }
  }

  test('390px: the open menu is fully inside the viewport, above content, with every item reachable', async ({ visit }) => {
    const viewport = { width: 390, height: 844 };
    for (const route of ['/', ARTICLE]) {
      const page = await visit({ season: 'wet', viewport });
      await goto(page, route);
      await hydrated(page);
      await seasonButton(page).click();
      await expect(seasonMenu(page)).toBeVisible();
      await inside(seasonMenu(page), viewport);
      await noOverflow(page);
      const items = await seasonMenu(page).getByRole('menuitemradio').all();
      expect(items).toHaveLength(7);
      for (const item of items) {
        await expect(item).toBeVisible();
        await inside(item, viewport);
        const topmost = await item.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          return !!hit && node.contains(hit);
        });
        expect(topmost, 'menu item must be the topmost element at its centre').toBe(true);
      }
      await expect(seasonButton(page)).toBeEnabled();
      await expect(themeButton(page)).toBeEnabled();
      await page.context().close();
    }
  });

  test('1440px article: the open menu stays above the sticky contents sidebar after scrolling', async ({ visit }) => {
    const viewport = { width: 1440, height: 900 };
    const page = await visit({ season: 'winter', viewport });
    await goto(page, ARTICLE);
    await hydrated(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await seasonButton(page).click();
    for (const item of await seasonMenu(page).getByRole('menuitemradio').all()) {
      const topmost = await item.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return !!hit && node.contains(hit);
      });
      expect(topmost).toBe(true);
    }
    // The sticky header and its menu paint over the ambient layer and content.
    await expect(page.locator('.site-header')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FR-006 / SC-007 - no scripts

test.describe('scripts disabled (FR-006, SC-007)', () => {
  test('emerald design with full content and navigation, even where a season would apply', async ({ visit }) => {
    const page = await visit({ javaScriptEnabled: false, now: '2026-07-15T12:00:00Z', season: 'autumn' });
    await goto(page, '/');
    await expectSeason(page, null);
    expect(await accent(page)).toBe(EMERALD.dark);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(ambient(page)).toHaveCSS('display', 'none');
    for (const name of ['Blog', 'Contact']) {
      await expect(page.locator('.main-nav').getByRole('link', { name })).toBeVisible();
    }

    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expectSeason(page, null);
    await expect(page.getByRole('heading', { name: /^Blog$/ })).toBeVisible();
    await page.getByRole('link', { name: /Fixture Newest/ }).click();
    await expect(page.locator('.article-body')).toContainText('A paragraph with bold text');
    await expectSeason(page, null);
    expect(await accent(page)).toBe(EMERALD.dark);

    const missing = await goto(page, '/definitely-not-a-page');
    expect(missing?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to portfolio' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Health

test.describe('runtime health', () => {
  test('no console errors, warnings or page errors across a full season-changing session', async ({ visit }) => {
    const page = await visit({ now: '2026-07-15T12:00:00Z' });
    const errors = watchErrors(page);
    await goto(page, '/');
    await hydrated(page);
    for (const label of ['Winter', 'Wet season', 'Automatic']) await pick(page, label);
    await themeButton(page).click();
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.getByRole('link', { name: /Fixture Newest/ }).click();
    await expect(page.locator('.blog-article')).toBeVisible();
    await goto(page, '/definitely-not-a-page');
    await page.reload({ waitUntil: 'load' });
    await hydrated(page);
    // A 404 document legitimately logs "Failed to load resource" for the status; ignore only that.
    expect(errors.filter((message) => !/Failed to load resource.*404/.test(message))).toEqual([]);
  });

  test('applying a season does not shift layout', async ({ visit }) => {
    const page = await visit({ season: 'winter', viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      (window as unknown as { __shift: number }).__shift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
          if (!entry.hadRecentInput) (window as unknown as { __shift: number }).__shift += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await goto(page, '/');
    await hydrated(page);
    await pick(page, 'Wet season');
    await pick(page, 'Summer');
    await pick(page, 'Automatic');
    await page.waitForLoadState('load');
    const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    expect(shift).toBeLessThan(0.01);
  });
});
