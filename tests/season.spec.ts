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
const seasonLabel = (page: Page) => page.locator('div.season-toggle-wrap > span.season-toggle-label');
/** The zone in which a season exists (tropical seasons are not offered in a temperate zone and vice versa). */
const zoneFor = (season: SeasonId) => (season === 'wet' || season === 'dry' ? 'Asia/Manila' : 'Europe/Berlin');
const lowerLabel = (id: SeasonId) => LABELS[id].toLowerCase();
const autoName = (id: SeasonId) => `Season: Auto (currently ${lowerLabel(id)})`;
const themeButton = (page: Page) => page.getByRole('button', { name: /^Theme: / });
const ambient = (page: Page) => page.locator('.season-ambient');

async function goto(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  return response;
}

/** The picker and theme toggle are disabled until React hydrates, which makes them a hydration signal. */
async function hydrated(page: Page) {
  // By CSS, not role: where no season applies the whole season control is display:none (and so absent from the role tree).
  await expect(page.locator('.season-toggle')).toBeEnabled();
  await expect(themeButton(page)).toBeEnabled();
}

async function expectSeason(page: Page, season: SeasonId | null) {
  if (season) await expect(html(page)).toHaveAttribute('data-season', season);
  else await expect(html(page)).not.toHaveAttribute('data-season', /.*/);
}

/** One press of the single season toggle: advances to the next season available in the region (or back to Automatic). */
async function press(page: Page, times = 1) {
  for (let i = 0; i < times; i += 1) await seasonButton(page).click();
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

  test('the season control is not displayed where no season applies, and a stored season is ignored there (FR-018)', async ({ visit }) => {
    // Pinned to 12:00 UTC the default Auto theme is light, so seed Dark to keep asserting the dark emerald accent.
    for (const timeZone of ['UTC', 'Etc/GMT-8']) {
      const page = await visit({ timeZone, theme: 'dark', season: 'winter' });
      await goto(page, '/');
      await hydrated(page);
      await expectSeason(page, null);
      expect(await accent(page)).toBe(EMERALD.dark);
      await expect(page.locator('.season-toggle-wrap')).toHaveCount(1);
      await expect(page.locator('.season-toggle-wrap')).toHaveCSS('display', 'none');
      await expect(seasonButton(page)).toBeHidden();
      await expect(page.getByRole('button', { name: /^Season:/ })).toHaveCount(0); // not in the accessibility tree either
      await expect(page.getByRole('button', { name: /^Theme: / })).toBeVisible(); // the theme toggle is unaffected
      await expect(ambient(page)).toHaveCSS('display', 'none');
      await page.context().close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FR-010 / SC-004 - no flash

test.describe('season is set before first paint (FR-010, SC-004)', () => {
  test('inline script alone applies the detected season and palette, with every external script blocked', async ({ visit }) => {
    // 14:00 in Berlin would resolve Auto to light, so a stored Dark choice keeps this the dark-summer check.
    const page = await visit({ blockScripts: true, theme: 'dark', now: '2026-07-15T12:00:00Z' });
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
    // Manila in July is in the wet season; a stored (and regionally available) "dry" must win without the detected one flashing.
    const page = await visit({ recordSeason: true, season: 'dry', timeZone: 'Asia/Manila', now: '2026-07-15T12:00:00Z' });
    await goto(page, '/');
    await hydrated(page);
    await page.waitForLoadState('load');
    const log = await page.evaluate(() => (window as unknown as { __seasonLog: Array<string | null> }).__seasonLog);
    expect(log).toEqual(['dry']);
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
    const page = await visit(); // Berlin in January: winter, so one press selects spring
    await goto(page, '/');
    await hydrated(page);
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await press(page);
    await expectSeason(page, 'spring');

    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expectSeason(page, 'spring');
    await expect(ambient(page)).toHaveCount(1);

    await page.getByRole('link', { name: /Fixture Newest/ }).click();
    await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
    await expectSeason(page, 'spring');
    await expect(ambient(page)).toHaveCount(1);

    await page.getByRole('link', { name: 'Back to blog' }).click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expectSeason(page, 'spring');
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    await hydrated(page);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Spring');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// US2 / FR-017, FR-018, SC-003 - the single-press season toggle (replaces the picker menu of FR-008)

/** [timeZone, instant, detected season, the presses after Automatic in order] - the cycles written out from FR-018. */
const CYCLES: Array<[string, string, SeasonId, SeasonId[]]> = [
  ['Europe/Berlin', '2026-11-15T12:00:00Z', 'autumn', ['winter', 'spring', 'summer']],
  ['Australia/Sydney', '2026-01-15T12:00:00Z', 'summer', ['autumn', 'winter', 'spring']],
  ['Asia/Manila', '2026-11-15T12:00:00Z', 'wet', ['dry']],
  ['Asia/Jakarta', '2026-07-15T12:00:00Z', 'dry', ['wet']],
  ['America/New_York', '2026-01-15T12:00:00Z', 'winter', ['spring', 'summer', 'autumn']],
  ['Africa/Nairobi', '2026-01-15T12:00:00Z', 'wet', ['dry']],
];

test.describe('season toggle (FR-017, FR-018, SC-003)', () => {
  test('contract: one button in div.season-toggle-wrap; no menu, popup or expanded state; one svg and the Auto badge', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    const button = seasonButton(page);
    await expect(button).toHaveAccessibleName('Season: Auto (currently winter)');
    await expect(button).toHaveClass(/\bseason-toggle\b/);
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).not.toHaveAttribute('aria-haspopup', /.*/);
    await expect(button).not.toHaveAttribute('aria-expanded', /.*/);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('[role="menu"], [role="menuitemradio"], .season-menu, .season-option')).toHaveCount(0);
    const facts = await button.evaluate((node) => ({
      parent: node.parentElement?.className,
      siblings: Array.from(node.parentElement!.children).map((child) => `${child.tagName.toLowerCase()}.${child.className}`),
      svgs: node.querySelectorAll('svg').length,
      svgHidden: Array.from(node.querySelectorAll('svg')).map((svg) => svg.getAttribute('aria-hidden')),
      badge: Array.from(node.querySelectorAll('.season-toggle-badge')).map((badge) => badge.textContent),
      badgeHidden: node.querySelector('.season-toggle-badge')?.getAttribute('aria-hidden'),
    }));
    expect(facts).toMatchObject({ parent: 'season-toggle-wrap', svgs: 1, svgHidden: ['true'], badge: ['A'], badgeHidden: 'true' });
    expect(facts.siblings).toEqual(['button.season-toggle', 'span.season-toggle-label']);
  });

  for (const [timeZone, now, detected, order] of CYCLES) {
    test(`${timeZone} (${LABELS[detected]} at ${now.slice(0, 10)}): Auto -> ${order.map((id) => LABELS[id]).join(' -> ')} -> Auto`, async ({ visit }) => {
      const page = await visit({ timeZone, now });
      await goto(page, '/');
      await hydrated(page);
      await expectSeason(page, detected);
      await expect(seasonButton(page)).toHaveAccessibleName(autoName(detected));
      await expect(seasonLabel(page)).toHaveText(`Auto · ${lowerLabel(detected)} now`);
      expect(await storedSeason(page)).toBeNull();
      await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

      for (const id of order) {
        await press(page);
        await expectSeason(page, id);
        await expect(seasonButton(page)).toHaveAccessibleName(`Season: ${LABELS[id]}`);
        await expect(seasonLabel(page)).toHaveText(LABELS[id]);
        expect(await storedSeason(page)).toBe(id);
        await expect(page.locator('.season-toggle .season-toggle-badge'), 'no badge on a manual choice').toHaveCount(0);
        await expect(page.locator('.season-toggle svg')).toHaveCount(1);
      }
      await press(page); // arrives back at the detected season: Automatic
      await expectSeason(page, detected);
      await expect(seasonButton(page)).toHaveAccessibleName(autoName(detected));
      expect(await storedSeason(page)).toBe('auto');
      await expect(page.locator('.season-toggle .season-toggle-badge')).toHaveText('A');
      expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload), 'no reload').toBe(true);

      // The choice survives reload at every step.
      await press(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await hydrated(page);
      await expectSeason(page, order[0]);
      await expect(seasonButton(page)).toHaveAccessibleName(`Season: ${LABELS[order[0]]}`);
    });
  }

  test('a press applies immediately, updates name, storage and ambient animation, and persists to other routes', async ({ visit }) => {
    const page = await visit({ now: '2026-07-15T12:00:00Z' }); // Berlin July: summer
    await goto(page, '/');
    await hydrated(page);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest()) requests.push(request.url());
    });
    const animationOf = () =>
      page.evaluate(() => {
        const first = document.querySelector('.season-ambient span') as HTMLElement;
        return getComputedStyle(first).animationName;
      });
    const expected: Array<[SeasonId, string]> = [['autumn', 'season-fall'], ['winter', 'season-fall'], ['spring', 'season-fall'], ['summer', 'season-rise']];
    for (const [id, animation] of expected) {
      await press(page);
      await expectSeason(page, id);
      await expect(seasonButton(page)).toHaveAccessibleName(id === 'summer' ? autoName('summer') : `Season: ${LABELS[id]}`);
      await expect(ambient(page)).toHaveCSS('display', 'block');
      expect(await animationOf()).toBe(animation);
    }
    expect(requests).toEqual([]);
    await press(page); // summer is detected, so the fourth press was Auto; this one is autumn again
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expectSeason(page, 'autumn');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Autumn');
    await goto(page, ARTICLE);
    await expectSeason(page, 'autumn');
  });

  test('changing the season takes one press from any page; a full cycle returns to Automatic (SC-003)', async ({ visit }) => {
    const page = await visit();
    for (const route of ['/', '/blog', ARTICLE, '/definitely-not-a-page']) {
      await goto(page, route);
      await hydrated(page);
      await press(page); // interaction 1: Berlin January is winter, so spring
      await expectSeason(page, 'spring');
      await press(page, 3); // summer, autumn, back to Automatic (winter)
      await expectSeason(page, 'winter');
      expect(await storedSeason(page)).toBe('auto');
    }
  });

  test('Automatic restores detection, stores "auto", and survives reload', async ({ visit }) => {
    const page = await visit({ now: '2026-01-15T12:00:00Z' }); // Berlin January: winter
    await goto(page, '/');
    await hydrated(page);
    await press(page); // spring
    await expectSeason(page, 'spring');
    await press(page, 3);
    await expectSeason(page, 'winter');
    expect(await storedSeason(page)).toBe('auto');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto (currently winter)');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expectSeason(page, 'winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto (currently winter)');
  });

  test('an invalid stored value behaves as Automatic', async ({ visit }) => {
    for (const bad of ['banana', '', 'WINTER', ' winter', '{"season":"winter"}', 'null', 'undefined']) {
      const page = await visit({ now: '2026-07-15T12:00:00Z', season: bad });
      await goto(page, '/');
      await expectSeason(page, 'summer'); // Berlin July
      await hydrated(page);
      await expect(seasonButton(page), `stored "${bad}"`).toHaveAccessibleName('Season: Auto (currently summer)');
      await press(page);
      await expectSeason(page, 'autumn'); // the next season after the detected one
      expect(await storedSeason(page)).toBe('autumn');
      await page.context().close();
    }
  });

  test('a stored season that the region does not have is ignored: Automatic, and the next press is the region\'s next season', async ({ visit }) => {
    const cases: Array<[string, string, string, SeasonId, SeasonId]> = [
      ['Asia/Manila', 'winter', '2026-11-15T12:00:00Z', 'wet', 'dry'],
      ['Asia/Jakarta', 'spring', '2026-07-15T12:00:00Z', 'dry', 'wet'],
      ['Europe/Berlin', 'wet', '2026-07-15T12:00:00Z', 'summer', 'autumn'],
      ['Australia/Sydney', 'dry', '2026-01-15T12:00:00Z', 'summer', 'autumn'],
    ];
    for (const [timeZone, stored, now, detected, next] of cases) {
      const page = await visit({ timeZone, season: stored, now });
      await goto(page, '/');
      await expectSeason(page, detected); // before hydration: the init script already ignores it
      await hydrated(page);
      await expectSeason(page, detected);
      await expect(seasonButton(page), `${timeZone} with stored ${stored}`).toHaveAccessibleName(autoName(detected));
      await press(page);
      await expectSeason(page, next);
      expect(await storedSeason(page)).toBe(next);
      await page.context().close();
    }
  });

  test('keyboard only: Tab reaches the toggle, Enter and Space each advance one season, focus stays and is visible', async ({ visit }) => {
    const page = await visit();
    await goto(page, '/');
    await hydrated(page);
    let reached = false;
    for (let i = 0; i < 25 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => document.activeElement?.classList.contains('season-toggle') ?? false);
    }
    expect(reached, 'Tab order must reach the season toggle').toBe(true);
    await expect(seasonButton(page)).toBeFocused();
    const ring = await seasonButton(page).evaluate((node) => {
      const style = getComputedStyle(node);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), matches: node.matches(':focus-visible') };
    });
    expect(ring.matches).toBe(true);
    expect(ring.style).not.toBe('none');
    expect(ring.width).toBeGreaterThan(0);

    await page.keyboard.press('Enter');
    await expectSeason(page, 'spring');
    await expect(seasonButton(page)).toBeFocused();
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Spring');
    await page.keyboard.press('Space');
    await expectSeason(page, 'summer');
    await expect(seasonButton(page)).toBeFocused();
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Summer');
    expect(await storedSeason(page)).toBe('summer');
    await page.keyboard.press('Escape'); // nothing to close and nothing changes
    await expectSeason(page, 'summer');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Summer');
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
    await press(page);
    await expectSeason(page, 'autumn');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Autumn');
    await getAnyNavigation(page);
    expect(errors.filter((message) => /season/i.test(message))).toEqual([]);
  });

  test('another tab follows a change, and clearing storage in one tab returns the others to Automatic', async ({ visit }) => {
    const a = await visit({ now: '2026-07-15T12:00:00Z' });
    const b = await a.context().newPage();
    await goto(a, '/');
    await goto(b, '/blog');
    await hydrated(a);
    await hydrated(b);
    await press(a);
    await expectSeason(a, 'autumn');
    await expectSeason(b, 'autumn');
    await expect(seasonButton(b)).toHaveAccessibleName('Season: Autumn');
    await press(b);
    await expectSeason(a, 'winter');
    await expectSeason(b, 'winter');
    await a.evaluate(() => localStorage.clear()); // the browser delivers the clear (key null) to the OTHER tabs only
    await expectSeason(b, 'summer');
    await expect(seasonButton(b)).toHaveAccessibleName('Season: Auto (currently summer)');
  });
});

async function getAnyNavigation(page: Page) {
  // Client-side navigation keeps the in-memory choice for the current page view.
  await page.getByRole('link', { name: 'Blog' }).first().click();
  await expect(page).toHaveURL(/\/blog\/?$/);
  await expectSeason(page, 'autumn');
}

// ---------------------------------------------------------------------------------------------------------------
// FR-009 / FR-015 - independence from dark/light

test.describe('independence from the theme mode (FR-009, FR-015; theme modes: specs/004-auto-theme-by-time)', () => {
  test('Auto is the default on a fresh visit (light by day, dark by night) and no season is stored until the visitor chooses', async ({ visit }) => {
    // The fixture clock is 13:00 in Berlin: day.
    const day = await visit();
    await goto(day, '/');
    await hydrated(day);
    await expect(html(day)).toHaveClass(/\blight\b/);
    await expect(themeButton(day)).toHaveAccessibleName('Theme: Auto (currently light)');
    expect(await storedSeason(day)).toBeNull();

    // 22:00 in Berlin: night.
    const night = await visit({ now: '2026-01-15T21:00:00Z' });
    await goto(night, '/');
    await hydrated(night);
    await expect(html(night)).toHaveClass(/\bdark\b/);
    await expect(themeButton(night)).toHaveAccessibleName('Theme: Auto (currently dark)');
    expect(await storedSeason(night)).toBeNull();
  });

  test('cycling the theme keeps the season; both survive reload and navigation', async ({ visit }) => {
    const page = await visit({ season: 'winter' }); // 13:00 Berlin: Auto resolves to light; winter chosen
    await goto(page, '/');
    await hydrated(page);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Auto (currently light)');

    await themeButton(page).click(); // Auto -> Light
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Light');
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    expect(await accent(page)).toBe('#1c5e8c');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Light');
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'winter');

    await goto(page, ARTICLE);
    await hydrated(page);
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Light');
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'winter');

    await press(page); // winter -> spring
    await expectSeason(page, 'spring');
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Light');
    await themeButton(page).click(); // Light -> Dark
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Dark');
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expectSeason(page, 'spring');
    expect(await accent(page), 'spring reuses the emerald fallback').toBe(EMERALD.dark);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await expectSeason(page, 'spring');

    await themeButton(page).click(); // Dark -> Auto (13:00: light again)
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Auto (currently light)');
    await expect(html(page)).toHaveClass(/\blight\b/);
    await expectSeason(page, 'spring');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Spring');
  });

  test('tropical: the dark wet-season palette stays when the theme cycles', async ({ visit }) => {
    const page = await visit({ timeZone: 'Asia/Manila', season: 'wet', theme: 'dark' });
    await goto(page, '/');
    await hydrated(page);
    await expectSeason(page, 'wet');
    await expect(html(page)).toHaveClass(/\bdark\b/);
    expect(await accent(page)).toBe('#5fd0d8');
    await themeButton(page).click(); // Dark -> Auto (12:00 UTC is 20:00 in Manila: dark)
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Auto (currently dark)');
    await expectSeason(page, 'wet');
    expect(await accent(page)).toBe('#5fd0d8');
    await press(page); // wet -> dry
    await expectSeason(page, 'dry');
    await expect(html(page)).toHaveClass(/\bdark\b/);
  });

  test('rapid, interleaved season and theme changes end in the last requested state of each', async ({ visit }) => {
    const page = await visit(); // Berlin January (winter), starts in Auto
    await goto(page, '/');
    await hydrated(page);
    // Eight presses of each three-way / four-season toggle: the season cycle is 4 long (back to Automatic) and the
    // theme walks Light, Dark, Auto, Light, Dark, Auto, Light, Dark.
    for (let i = 0; i < 4; i += 1) {
      await press(page);
      await themeButton(page).click();
      await press(page);
      await themeButton(page).click();
    }
    await expectSeason(page, 'winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto (currently winter)');
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Dark');
    await expect(html(page)).toHaveClass(/\bdark\b/);

    await press(page); // spring
    await expectSeason(page, 'spring');
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Dark'); // the season change did not touch the mode
    await themeButton(page).click(); // Dark -> Auto, which is light at 13:00
    await expectSeason(page, 'spring');
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Auto (currently light)');
    await expect(html(page)).toHaveClass(/\blight\b/);
    expect(await storedSeason(page)).toBe('spring');
    expect(await page.evaluate(() => localStorage.getItem('theme-mode'))).toBe('auto');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expectSeason(page, 'spring');
    await expect(themeButton(page)).toHaveAccessibleName('Theme: Auto (currently light)');
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
        const page = await visit({ theme, season, timeZone: zoneFor(season) });
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

  test('every season has its own distinct, compositor-only animation', async ({ visit }) => {
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
      // A stored manual season is applied exactly as a press would apply it (the toggle itself is covered above).
      const page = await visit({ season: id, timeZone: zoneFor(id) });
      await goto(page, '/');
      await hydrated(page);
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
      const baseline = await visit({ season, timeZone: zoneFor(season) });
      await goto(baseline, '/');
      const seasonAccent = await accent(baseline);

      const page = await visit({ season, reducedMotion: 'reduce', timeZone: zoneFor(season) });
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
      await press(page);
      await expect(page.locator('html')).not.toHaveAttribute('data-season', season);
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
          // Wet only exists in tropical regions, so that case runs in Manila; the others in Berlin.
          const page = await visit({ theme, season, viewport, timeZone: season === 'wet' ? 'Asia/Manila' : 'Europe/Berlin' });
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

  test('390px: a press shows the label fully inside the viewport with no overflow, above content, even for the widest text', async ({ visit }) => {
    const viewport = { width: 390, height: 844 };
    for (const [timeZone, now] of [['Europe/Berlin', '2026-01-15T12:00:00Z'], ['Asia/Manila', '2026-11-15T12:00:00Z']] as const) {
      for (const route of ['/', ARTICLE]) {
        const page = await visit({ timeZone, now, viewport });
        await goto(page, route);
        await hydrated(page);
        // The widest label is Automatic in a wet season ("Auto · wet season now"): hover shows it without a press.
        await seasonButton(page).hover();
        await expect(seasonLabel(page)).toBeVisible();
        await inside(seasonLabel(page), viewport);
        await noOverflow(page);
        const theme = (await themeButton(page).boundingBox())!;
        const label = (await seasonLabel(page).boundingBox())!;
        expect(label.x + label.width, `${timeZone}: the season label must not cover the theme toggle`).toBeLessThanOrEqual(theme.x + 0.5);
        await expect(seasonButton(page)).toBeEnabled();
        await expect(themeButton(page)).toBeEnabled();
        await page.context().close();
      }
    }
  });

  test('1440px article: the toggles keep working over the sticky contents sidebar after scrolling', async ({ visit }) => {
    const viewport = { width: 1440, height: 900 };
    const page = await visit({ season: 'winter', viewport });
    await goto(page, ARTICLE);
    await hydrated(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await press(page);
    await expectSeason(page, 'spring');
    await expect(seasonLabel(page)).toBeVisible();
    await inside(seasonLabel(page), viewport);
    // The sticky header paints over the ambient layer and the content.
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(seasonButton(page)).toBeInViewport();
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
    await press(page, 4); // Berlin July: autumn, winter, spring, back to Automatic (summer)
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
    await press(page, 5); // through the cycle and back
    await expectSeason(page, 'spring'); // from a stored winter: spring, summer, autumn, Automatic (winter), spring
    await page.waitForLoadState('load');
    const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    expect(shift).toBeLessThan(0.01);
  });
});
