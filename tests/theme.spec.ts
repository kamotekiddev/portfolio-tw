import { expect, test as base, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { themeInitScript } from '../app/data/theme-schedule';
import { blogFixtures, restartFixtureServer } from './blog-fixtures';

/*
 * Browser regression coverage for specs/004-auto-theme-by-time (contracts/theme-contract.md).
 * Expected values are written out from the spec (light 06:00-17:59 local, dark otherwise; Auto -> Light -> Dark -> Auto)
 * as an independent oracle, not re-derived from app/data/theme-schedule.ts. The one import from the app is the init
 * script's own text, used only to locate it in served HTML and to build the first-paint negative control.
 *
 * Every context sets its time zone explicitly and writes instants with the matching UTC offset, so the local hour
 * never depends on the machine running the tests. "Wrong first paint" is judged at paint opportunities (every
 * animation frame, DOMContentLoaded and the end of every class mutation), not on the transient server-rendered
 * class="dark" that the parser holds until the first body script runs.
 */

const ARTICLE = '/blog/fixture-newest';
const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter', 'wet', 'dry'] as const;
type Theme = 'light' | 'dark';
type Mode = 'auto' | 'light' | 'dark';

const OFFSETS = {
  'Asia/Manila': '+08:00',
  'America/Los_Angeles': '-08:00',
  'Europe/Berlin': '+01:00',
  UTC: 'Z',
} as const;
type Zone = keyof typeof OFFSETS;
const DEFAULT_ZONE: Zone = 'Asia/Manila';
const DATE = '2026-01-15';

/** Epoch ms for a local wall-clock time on 2026-01-15 (or the given date) in the given zone. */
const instant = (time: string, zone: Zone = DEFAULT_ZONE, date: string = DATE) => Date.parse(`${date}T${time}${OFFSETS[zone]}`);

/** `body` is false while the parser has not created <body> yet: the body background is what paints the theme ground. */
type Sample = { where: string; cls: string; body: boolean; children: number };
type SamplerWindow = Window & { __themeSamples: Sample[] };

type VisitOptions = {
  zone?: Zone;
  /** Local 'HH:MM:SS(.mmm)' on 2026-01-15 in `zone`, or epoch milliseconds. Default 12:00:00. */
  time?: string | number;
  /** 'fixed' freezes Date only (timers stay real); 'install' fakes timers too so a test can move time. */
  clock?: 'fixed' | 'install';
  /** Raw localStorage entries written (only where absent) before any page script runs. */
  storage?: Record<string, string>;
  viewport?: { width: number; height: number };
  colorScheme?: 'light' | 'dark';
  javaScriptEnabled?: boolean;
  /** Abort every external script so only inline scripts can run (no hydration). */
  blockScripts?: boolean;
  /** Record html's class at every frame, at DOMContentLoaded and after every class mutation. */
  sampler?: boolean;
  /** Make window.localStorage throw, as in a locked-down browser. */
  storageUnavailable?: boolean;
  /** Count calls to the geolocation API (FR-003). */
  watchGeolocation?: boolean;
};

const test = base.extend<{ visit: (options?: VisitOptions) => Promise<Page> }>({
  visit: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    await use(async (options = {}) => {
      const zone = options.zone ?? DEFAULT_ZONE;
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        timezoneId: zone,
        viewport: options.viewport ?? { width: 1440, height: 900 },
        colorScheme: options.colorScheme ?? 'light',
        reducedMotion: 'no-preference',
        javaScriptEnabled: options.javaScriptEnabled ?? true,
      });
      contexts.push(context);
      const now = typeof options.time === 'number' ? options.time : instant(options.time ?? '12:00:00', zone);
      if (options.clock === 'install') await context.clock.install({ time: now });
      else await context.clock.setFixedTime(now);

      if (options.storageUnavailable) {
        await context.addInitScript(() => {
          Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
              throw new DOMException('denied', 'SecurityError');
            },
          });
        });
      }
      if (options.storage && Object.keys(options.storage).length) {
        await context.addInitScript((entries) => {
          try {
            for (const [key, value] of Object.entries(entries)) {
              if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
            }
          } catch {
            /* storage unavailable on this document */
          }
        }, options.storage);
      }
      if (options.sampler) {
        await context.addInitScript(() => {
          const samples: SamplerWindow['__themeSamples'] = [];
          (window as unknown as SamplerWindow).__themeSamples = samples;
          const snap = (where: string) => {
            const root = document.documentElement;
            if (root && samples.length < 4000) samples.push({ where, cls: root.className, body: !!document.body, children: document.body ? document.body.childElementCount : 0 });
          };
          const frame = () => {
            snap('raf');
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
          new MutationObserver((records) => {
            if (records.some((record) => record.target === document.documentElement)) snap('mutation');
          }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
          document.addEventListener('DOMContentLoaded', () => snap('dcl'));
        });
      }
      if (options.watchGeolocation) {
        await context.addInitScript(() => {
          const calls: string[] = [];
          (window as unknown as { __geoCalls: string[] }).__geoCalls = calls;
          for (const method of ['getCurrentPosition', 'watchPosition'] as const) {
            try {
              Object.defineProperty(Geolocation.prototype, method, {
                configurable: true,
                value: () => {
                  calls.push(method);
                },
              });
            } catch {
              /* ignore */
            }
          }
        });
      }
      if (options.blockScripts) {
        await context.route('**/*', (route) => (route.request().resourceType() === 'script' ? route.abort() : route.continue()));
      }
      return context.newPage();
    });
    for (const context of contexts) await context.close();
  },
});

test.beforeAll(async ({}, testInfo) => {
  // blog.spec.ts ends by restarting the shared fixture server with no posts. When this file runs after it (or on its
  // own after a partial run), put the original fixtures back so article routes exist.
  const origin = String(testInfo.project.use.baseURL);
  const response = await fetch(`${origin}${ARTICLE}`).catch(() => undefined);
  if (response?.status === 200) return;
  testInfo.setTimeout(300_000);
  await restartFixtureServer(blogFixtures);
});

// ---------------------------------------------------------------------------------------------------------------
// Helpers

const html = (page: Page) => page.locator('html');
const toggle = (page: Page) => page.getByRole('button', { name: /^Theme: / });
const seasonButton = (page: Page) => page.getByRole('button', { name: /^Season:/ });
const seasonMenu = (page: Page) => page.getByRole('menu', { name: 'Season' });

const NAMES = {
  light: 'Theme: Light',
  dark: 'Theme: Dark',
  autoLight: 'Theme: Auto (currently light)',
  autoDark: 'Theme: Auto (currently dark)',
} as const;
const autoName = (theme: Theme) => (theme === 'light' ? NAMES.autoLight : NAMES.autoDark);
const nameFor = (mode: Mode, theme: Theme) => (mode === 'auto' ? autoName(theme) : mode === 'light' ? NAMES.light : NAMES.dark);

const hasTheme = (cls: string, theme: Theme) => {
  const tokens = cls.split(/\s+/).filter(Boolean);
  return tokens.includes(theme) && !tokens.includes(theme === 'light' ? 'dark' : 'light');
};

async function goto(page: Page, url: string) {
  return page.goto(url, { waitUntil: 'domcontentloaded' });
}

/** The toggle is disabled until React hydrates, which makes it a hydration signal. */
async function hydrated(page: Page) {
  await expect(toggle(page)).toBeEnabled();
}

async function expectTheme(page: Page, theme: Theme) {
  await expect(html(page)).toHaveClass(theme === 'light' ? /\blight\b/ : /\bdark\b/);
  await expect(html(page)).not.toHaveClass(theme === 'light' ? /\bdark\b/ : /\blight\b/);
}

async function stored(page: Page, key: string) {
  return page.evaluate((name) => localStorage.getItem(name), key);
}

/** Wait until html carries a theme class and report it. */
async function currentTheme(page: Page): Promise<Theme> {
  await expect(html(page)).toHaveClass(/\b(light|dark)\b/);
  return (await html(page).getAttribute('class'))!.split(/\s+/).includes('light') ? 'light' : 'dark';
}

async function samples(page: Page) {
  // One more frame guarantees the rAF sampler has run after the page settled.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  return page.evaluate(() => (window as unknown as SamplerWindow).__themeSamples);
}

function wrongPaints(list: Sample[], expected: Theme) {
  // A frame before <body> exists paints only the default canvas (the theme ground is the body background), so the
  // html class cannot show; every frame, DOMContentLoaded and mutation once <body> exists must carry the right class.
  return list
    .filter((sample) => sample.where !== 'raf' || sample.body)
    .filter((sample) => !hasTheme(sample.cls, expected))
    .map((sample) => `${sample.where}: "${sample.cls}" (body children: ${sample.children})`);
}

async function expectNoWrongPaint(page: Page, expected: Theme, label: string) {
  const list = await samples(page);
  expect(list.filter((sample) => sample.where === 'dcl').length, `${label}: DOMContentLoaded sample`).toBeGreaterThan(0);
  expect(list.filter((sample) => sample.where === 'raf').length, `${label}: frame samples`).toBeGreaterThan(0);
  expect(wrongPaints(list, expected), `${label}: html class at paint opportunities (want "${expected}")`).toEqual([]);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(`${message.type()}: ${message.text()}`);
  });
  return errors;
}

/** A 404 document legitimately logs "Failed to load resource" for the status; ignore only that. */
const realErrors = (errors: string[]) => errors.filter((message) => !/Failed to load resource.*404/.test(message));

async function noOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    body: [document.body.scrollWidth, document.body.clientWidth],
  }));
  expect(metrics.root[0], `documentElement scrollWidth ${metrics.root[0]} > clientWidth ${metrics.root[1]}`).toBeLessThanOrEqual(metrics.root[1]);
  expect(metrics.body[0], `body scrollWidth ${metrics.body[0]} > clientWidth ${metrics.body[1]}`).toBeLessThanOrEqual(metrics.body[1]);
}

async function inside(locator: Locator, viewport: { width: number; height: number }) {
  const box = await locator.boundingBox();
  expect(box, 'element must be rendered').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 0.5);
}

function luminance(color: string) {
  const channels = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  expect(channels, `"${color}" must be an rgb() colour`).toHaveLength(3);
  const [r, g, b] = channels.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const MODE_STORAGE = (mode: Mode): Record<string, string> => ({ 'theme-mode': mode });

// ---------------------------------------------------------------------------------------------------------------
// 1. FR-001, FR-002, SC-001 - Auto resolves by the local hour

test.describe('Auto resolves from the local hour (FR-001, FR-002, SC-001)', () => {
  const edges: Array<[string, Theme]> = [
    ['00:00:00', 'dark'],
    ['05:59:59', 'dark'],
    ['06:00:00', 'light'],
    ['10:00:00', 'light'],
    ['17:59:59', 'light'],
    ['18:00:00', 'dark'],
    ['22:00:00', 'dark'],
  ];
  for (const [time, expected] of edges) {
    test(`fresh visitor at ${time} local sees ${expected}; storage ends with theme-mode=auto`, async ({ visit }) => {
      const page = await visit({ time });
      await goto(page, '/');
      await expectTheme(page, expected);
      expect(await stored(page, 'theme-mode')).toBe('auto');
      expect(await stored(page, 'theme')).toBe(expected);
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(autoName(expected));
      await expectTheme(page, expected);
    });
  }

  for (let hour = 0; hour < 24; hour += 1) {
    const expected: Theme = hour >= 6 && hour < 18 ? 'light' : 'dark';
    const clock = `${String(hour).padStart(2, '0')}:30:00`;
    test(`hour ${String(hour).padStart(2, '0')} (${clock}) -> ${expected}`, async ({ visit }) => {
      const page = await visit({ time: clock });
      await goto(page, '/');
      await expectTheme(page, expected);
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(autoName(expected));
    });
  }

  test('the hour is the visitor-local hour, not UTC: the same instant differs by zone', async ({ visit }) => {
    // 2026-01-15T04:00Z is 12:00 in Manila (day), 20:00 the day before in Los Angeles (night), 04:00 in UTC (night).
    const instantUtc = Date.parse('2026-01-15T04:00:00Z');
    const cases: Array<[Zone, Theme]> = [
      ['Asia/Manila', 'light'],
      ['America/Los_Angeles', 'dark'],
      ['UTC', 'dark'],
    ];
    for (const [zone, expected] of cases) {
      const page = await visit({ zone, time: instantUtc });
      await goto(page, '/');
      await expectTheme(page, expected);
      await page.context().close();
    }
  });

  test('the 06:00 and 18:00 boundaries also hold in a zone behind UTC', async ({ visit }) => {
    const cases: Array<[string, Theme]> = [
      ['05:59:59', 'dark'],
      ['06:00:00', 'light'],
      ['17:59:59', 'light'],
      ['18:00:00', 'dark'],
    ];
    for (const [time, expected] of cases) {
      const page = await visit({ zone: 'America/Los_Angeles', time });
      await goto(page, '/');
      await expectTheme(page, expected);
      await page.context().close();
    }
  });

  test('the operating-system colour scheme does not decide the theme', async ({ visit }) => {
    const day = await visit({ time: '12:00:00', colorScheme: 'dark' });
    await goto(day, '/');
    await expectTheme(day, 'light');
    const night = await visit({ time: '22:00:00', colorScheme: 'light' });
    await goto(night, '/');
    await expectTheme(night, 'dark');
  });

  test('detection stays on the device: no location request and no request that carries the time, zone or choice (FR-003)', async ({ visit }) => {
    const page = await visit({ time: '22:00:00', watchGeolocation: true });
    const requests: Array<{ method: string; url: string; body: string | null }> = [];
    page.on('request', (request) => requests.push({ method: request.method(), url: request.url(), body: request.postData() }));
    await goto(page, '/');
    await hydrated(page);
    await toggle(page).click();
    await toggle(page).click();
    await page.reload({ waitUntil: 'load' });
    await hydrated(page);
    expect(await page.evaluate(() => (window as unknown as { __geoCalls: string[] }).__geoCalls)).toEqual([]);
    expect(requests.filter((request) => request.method !== 'GET'), 'no request may send data').toEqual([]);
    const leaks = requests.filter((request) => /theme|timezone|tz=|Asia%2FManila|Asia\/Manila|auto|T22:/i.test(request.url.replace(/\/_next\/static\/[^?#]*/, '')));
    expect(leaks, 'no URL may carry the mode, the zone or the time').toEqual([]);
    const offOrigin = requests.filter((request) => !request.url.startsWith('http://127.0.0.1:3137/') && !request.url.startsWith('data:'));
    expect(offOrigin, 'no third-party request may be made').toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 2. FR-004, SC-002 - no wrong first paint

test.describe('the correct theme is present at first paint (FR-004, SC-002)', () => {
  type PaintCase = { name: string; time: string; storage: Record<string, string>; expected: Theme };
  const cases: PaintCase[] = [
    { name: 'Auto by day', time: '12:00:00', storage: {}, expected: 'light' },
    { name: 'Auto by night', time: '22:00:00', storage: {}, expected: 'dark' },
    { name: 'Auto just before 06:00', time: '05:59:59', storage: {}, expected: 'dark' },
    { name: 'Auto at exactly 06:00', time: '06:00:00', storage: {}, expected: 'light' },
    { name: 'Light chosen, at night', time: '22:00:00', storage: MODE_STORAGE('light'), expected: 'light' },
    { name: 'Dark chosen, by day', time: '12:00:00', storage: MODE_STORAGE('dark'), expected: 'dark' },
    { name: 'legacy light, at night', time: '22:00:00', storage: { theme: 'light' }, expected: 'light' },
    { name: 'legacy dark, by day', time: '12:00:00', storage: { theme: 'dark' }, expected: 'dark' },
  ];

  for (const { name, time, storage, expected } of cases) {
    test(`${name}: class is ${expected} at DOMContentLoaded and at every frame; hydration never flips it`, async ({ visit }) => {
      const page = await visit({ time, storage, sampler: true });
      await goto(page, '/');
      await hydrated(page);
      await page.waitForLoadState('load');
      await expectNoWrongPaint(page, expected, name);

      // A full document load of every other kind of route behaves the same.
      for (const route of ['/blog', ARTICLE, '/definitely-not-a-page']) {
        await goto(page, route);
        await hydrated(page);
        await expectNoWrongPaint(page, expected, `${name} on ${route}`);
      }
    });

    test(`${name}: the inline scripts alone (no external script runs) already apply ${expected}`, async ({ visit }) => {
      const page = await visit({ time, storage, sampler: true, blockScripts: true });
      await goto(page, '/');
      // Hydration really did not happen: the toggle still carries the server-rendered disabled state and name.
      await expect(toggle(page)).toBeDisabled();
      await expect(toggle(page)).toHaveAccessibleName('Theme: Auto');
      await expectTheme(page, expected);
      await expectNoWrongPaint(page, expected, `${name} (scripts blocked)`);
    });
  }

  test('negative control: with the theme init script stripped from the HTML the checker reports a wrong first paint', async ({ visit }) => {
    const page = await visit({ time: '12:00:00', sampler: true });
    await page.route((url) => url.pathname === '/', async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      expect(body, 'the served HTML must contain the init script for this control to mean anything').toContain(themeInitScript);
      await route.fulfill({ response, body: body.replace(themeInitScript, '') });
    });
    await goto(page, '/');
    await hydrated(page);
    const list = await samples(page);
    // Server markup is class="dark" and nothing pre-paint corrects it on a light day, so the sensor must see it.
    expect(wrongPaints(list, 'light').length, 'the sampler must be able to fail').toBeGreaterThan(0);
    expect(list.find((sample) => sample.where === 'dcl')?.cls).toContain('dark');
  });

  test('served HTML: html starts as class="dark" and the theme script runs before next-themes\' pre-paint script', async ({ request }) => {
    for (const route of ['/', '/blog', ARTICLE, '/definitely-not-a-page']) {
      const response = await request.get(route);
      const body = await response.text();
      expect(body, route).toMatch(/<html lang="en" class="dark"/);
      const scripts = Array.from(body.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)).map((match) => ({ index: match.index!, text: match[1] }));
      const inline = scripts.filter((script) => script.text && !script.text.startsWith('self.__next_f') && !script.text.startsWith('(self.__next_f'));
      const themeIndex = inline.findIndex((script) => script.text === themeInitScript);
      expect(themeIndex, `${route}: theme init script is inlined verbatim, exactly once`).toBeGreaterThanOrEqual(0);
      expect(inline.filter((script) => script.text === themeInitScript)).toHaveLength(1);
      const nextThemesIndex = inline.findIndex((script) => script.text !== themeInitScript && script.text.includes('document.documentElement') && script.text.includes('classList') && script.text.includes('localStorage.getItem'));
      expect(nextThemesIndex, `${route}: next-themes pre-paint script is present`).toBeGreaterThanOrEqual(0);
      expect(themeIndex, `${route}: theme init script comes before next-themes' script`).toBeLessThan(nextThemesIndex);
      // Both run from <body>, before any content, so neither can be preceded by a paint of body content.
      const bodyStart = body.indexOf('<body');
      expect(inline[themeIndex].index, `${route}: after <body>`).toBeGreaterThan(bodyStart);
      const firstContent = body.indexOf('<header');
      if (firstContent >= 0) expect(inline[nextThemesIndex].index, `${route}: before the header content`).toBeLessThan(firstContent);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 3. FR-005, FR-006, SC-003 - the toggle

test.describe('header toggle (FR-005, FR-006, SC-003)', () => {
  test('contract: button, icon, and accessible name for every mode', async ({ visit }) => {
    const page = await visit({ time: '22:00:00' });
    await goto(page, '/');
    await hydrated(page);
    const button = toggle(page);
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button).toHaveClass(/\btheme-toggle\b/);
    await expect(button).toHaveAccessibleName(NAMES.autoDark);

    const icon = async () =>
      button.evaluate((node) => {
        const svg = node.querySelector('svg');
        return { count: node.querySelectorAll('svg').length, hidden: svg?.getAttribute('aria-hidden'), shape: svg?.innerHTML ?? '', text: node.textContent };
      });
    const auto = await icon();
    expect(auto).toMatchObject({ count: 1, hidden: 'true', text: '' });
    await button.click();
    await expect(button).toHaveAccessibleName(NAMES.light);
    const light = await icon();
    await button.click();
    await expect(button).toHaveAccessibleName(NAMES.dark);
    const dark = await icon();
    expect([light.hidden, dark.hidden]).toEqual(['true', 'true']);
    expect(new Set([auto.shape, light.shape, dark.shape]).size, 'Auto, Light and Dark show three different icons').toBe(3);
    await button.click();
    await expect(button).toHaveAccessibleName(NAMES.autoDark);
    expect((await icon()).shape).toBe(auto.shape);
  });

  test('before hydration the toggle is disabled and named "Theme: Auto"', async ({ visit }) => {
    const page = await visit({ blockScripts: true });
    await goto(page, '/');
    await expect(toggle(page)).toBeDisabled();
    await expect(toggle(page)).toHaveAccessibleName('Theme: Auto');
  });

  for (const [time, startTheme] of [['12:00:00', 'light'], ['22:00:00', 'dark']] as const) {
    test(`cycles Auto -> Light -> Dark -> Auto (starting ${startTheme} at ${time}), updating class, name and storage each step`, async ({ visit }) => {
      const page = await visit({ time });
      await goto(page, '/');
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(autoName(startTheme));

      const steps: Array<[Mode, Theme]> = [['light', 'light'], ['dark', 'dark'], ['auto', startTheme], ['light', 'light']];
      for (const [mode, theme] of steps) {
        await toggle(page).click();
        await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, theme));
        await expectTheme(page, theme);
        expect(await stored(page, 'theme-mode')).toBe(mode);
        expect(await stored(page, 'theme')).toBe(theme);
      }
    });
  }

  test('the mode persists across reload and across every kind of navigation', async ({ visit }) => {
    for (const mode of ['light', 'dark'] as const) {
      const page = await visit({ time: mode === 'light' ? '22:00:00' : '12:00:00' });
      await goto(page, '/');
      await hydrated(page);
      await toggle(page).click(); // Auto -> Light
      if (mode === 'dark') await toggle(page).click(); // -> Dark
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      await expectTheme(page, mode);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      await expectTheme(page, mode);

      // Full document loads.
      for (const route of ['/blog', ARTICLE, '/definitely-not-a-page', '/']) {
        await goto(page, route);
        await hydrated(page);
        await expect(toggle(page), route).toHaveAccessibleName(nameFor(mode, mode));
        await expectTheme(page, mode);
      }

      // Client-side navigation (no reload): home -> blog -> article -> back.
      await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
      await page.getByRole('link', { name: 'Blog' }).first().click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      await expectTheme(page, mode);
      await page.getByRole('link', { name: /Fixture Newest/ }).click();
      await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      await expectTheme(page, mode);
      await page.getByRole('link', { name: 'Back to blog' }).click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await expectTheme(page, mode);
      expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
      expect(await stored(page, 'theme-mode')).toBe(mode);
      await page.context().close();
    }
  });

  for (const start of ['auto', 'light', 'dark'] as const) {
    test(`any mode is reachable in at most two activations from ${start}, and survives reload (SC-003)`, async ({ visit }) => {
      const page = await visit({ time: '12:00:00', storage: MODE_STORAGE(start) });
      await goto(page, '/');
      await hydrated(page);
      const wanted = (['auto', 'light', 'dark'] as const).filter((mode) => mode !== start);
      const reached = new Map<Mode, number>([[start, 0]]);
      for (let activations = 1; activations <= 2; activations += 1) {
        await toggle(page).click();
        const name = await toggle(page).getAttribute('aria-label');
        const mode = (['auto', 'light', 'dark'] as const).find((candidate) => name === nameFor(candidate, 'light') || name === nameFor(candidate, 'dark'));
        expect(mode, `name after activation ${activations}: ${name}`).toBeDefined();
        reached.set(mode!, activations);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await hydrated(page);
        expect(await toggle(page).getAttribute('aria-label'), `after reload following activation ${activations}`).toBe(name);
      }
      expect(Array.from(reached.keys()).sort()).toEqual(['auto', 'dark', 'light']);
      for (const mode of wanted) expect(reached.get(mode)!).toBeLessThanOrEqual(2);
    });
  }

  test('keyboard only: Tab reaches the toggle; Enter and Space activate it; focus stays and is visible', async ({ visit }) => {
    for (const [time, storage] of [['12:00:00', {}], ['22:00:00', MODE_STORAGE('dark')]] as const) {
      const page = await visit({ time, storage });
      await goto(page, '/');
      await hydrated(page);
      let reached = false;
      for (let i = 0; i < 30 && !reached; i += 1) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle') ?? false);
      }
      expect(reached, 'Tab order must reach the theme toggle').toBe(true);
      await expect(toggle(page)).toBeFocused();

      const initial = (await toggle(page).getAttribute('aria-label'))!;
      await page.keyboard.press('Enter');
      await expect(toggle(page)).not.toHaveAccessibleName(initial);
      await expect(toggle(page)).toBeFocused();
      const afterEnter = (await toggle(page).getAttribute('aria-label'))!;
      await page.keyboard.press('Space');
      await expect(toggle(page)).not.toHaveAccessibleName(afterEnter);
      await expect(toggle(page)).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(toggle(page)).toBeFocused();
      // Three activations from any mode land back on the starting mode.
      await expect(toggle(page)).toHaveAccessibleName(initial);

      const ring = await toggle(page).evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          matches: node.matches(':focus-visible'),
          style: style.outlineStyle,
          width: parseFloat(style.outlineWidth),
          color: style.outlineColor,
          ground: getComputedStyle(document.documentElement).getPropertyValue('--ground').trim(),
          background: getComputedStyle(document.body).backgroundColor,
        };
      });
      expect(ring.matches).toBe(true);
      expect(ring.style).not.toBe('none');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      expect(contrast(ring.color, ring.background), `focus ring ${ring.color} on ${ring.background}`).toBeGreaterThanOrEqual(3);
      await page.context().close();
    }
  });

  test('the focus ring is visible in both themes (Light and Dark)', async ({ visit }) => {
    for (const theme of ['light', 'dark'] as const) {
      const page = await visit({ storage: MODE_STORAGE(theme) });
      await goto(page, '/');
      await hydrated(page);
      await page.keyboard.press('Tab');
      for (let i = 0; i < 30 && !(await toggle(page).evaluate((node) => node === document.activeElement)); i += 1) await page.keyboard.press('Tab');
      await expect(toggle(page)).toBeFocused();
      const ring = await toggle(page).evaluate((node) => {
        const style = getComputedStyle(node);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor, background: getComputedStyle(document.body).backgroundColor };
      });
      expect(ring.style).not.toBe('none');
      expect(ring.width).toBeGreaterThan(0);
      expect(contrast(ring.color, ring.background), `${theme}: focus ring ${ring.color} on ${ring.background}`).toBeGreaterThanOrEqual(3);
      await page.context().close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 4. FR-007 - Light and Dark ignore the clock

test.describe('Light and Dark ignore the clock (FR-007)', () => {
  const cases: Array<[Mode & ('light' | 'dark'), string]> = [
    ['light', '22:00:00'],
    ['light', '03:00:00'],
    ['dark', '10:00:00'],
    ['dark', '14:00:00'],
  ];
  for (const [mode, time] of cases) {
    test(`stored ${mode} at ${time} stays ${mode}, including after a reload and a client-side navigation`, async ({ visit }) => {
      const page = await visit({ time, storage: MODE_STORAGE(mode), sampler: true });
      await goto(page, '/');
      await expectTheme(page, mode);
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      await expectNoWrongPaint(page, mode, `${mode} at ${time}`);
      expect(await stored(page, 'theme-mode')).toBe(mode);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await hydrated(page);
      await expectTheme(page, mode);
      await page.getByRole('link', { name: 'Blog' }).first().click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await expectTheme(page, mode);
    });
  }

  test('a returning visitor whose clock has moved to the other half of the day still gets the stored choice', async ({ visit }) => {
    const page = await visit({ time: '12:00:00', storage: MODE_STORAGE('light') });
    await goto(page, '/');
    await hydrated(page);
    for (const [time, mode] of [['23:00:00', 'light'], ['04:00:00', 'light']] as const) {
      await page.context().clock.setFixedTime(instant(time));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectTheme(page, mode);
    }
    await toggle(page).click(); // Light -> Dark
    for (const time of ['12:00:00', '07:00:00']) {
      await page.context().clock.setFixedTime(instant(time));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectTheme(page, 'dark');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 5. FR-007 - legacy and invalid stored values

test.describe('legacy and invalid stored values (FR-007)', () => {
  type Case = { name: string; time: string; storage: Record<string, string>; mode: Mode; theme: Theme };
  const cases: Case[] = [
    { name: 'legacy theme=light with no mode, at 22:00, is an explicit Light choice', time: '22:00:00', storage: { theme: 'light' }, mode: 'light', theme: 'light' },
    { name: 'legacy theme=dark with no mode, at 10:00, is an explicit Dark choice', time: '10:00:00', storage: { theme: 'dark' }, mode: 'dark', theme: 'dark' },
    { name: 'legacy theme=light at 10:00 stays Light', time: '10:00:00', storage: { theme: 'light' }, mode: 'light', theme: 'light' },
    { name: 'legacy theme=dark at 22:00 stays Dark', time: '22:00:00', storage: { theme: 'dark' }, mode: 'dark', theme: 'dark' },
    { name: 'legacy theme=system is Auto (day)', time: '10:00:00', storage: { theme: 'system' }, mode: 'auto', theme: 'light' },
    { name: 'legacy theme=system is Auto (night)', time: '22:00:00', storage: { theme: 'system' }, mode: 'auto', theme: 'dark' },
    { name: 'garbage theme is Auto (day)', time: '10:00:00', storage: { theme: 'banana' }, mode: 'auto', theme: 'light' },
    { name: 'garbage theme is Auto (night)', time: '22:00:00', storage: { theme: '{"x":1}' }, mode: 'auto', theme: 'dark' },
    { name: 'wrong-case theme=LIGHT is not an explicit choice: Auto', time: '22:00:00', storage: { theme: 'LIGHT' }, mode: 'auto', theme: 'dark' },
    { name: 'padded theme=" dark" is not an explicit choice: Auto', time: '10:00:00', storage: { theme: ' dark' }, mode: 'auto', theme: 'light' },
    { name: 'empty theme is Auto', time: '10:00:00', storage: { theme: '' }, mode: 'auto', theme: 'light' },
    { name: 'invalid theme-mode alone falls back to Auto (day)', time: '10:00:00', storage: { 'theme-mode': 'banana' }, mode: 'auto', theme: 'light' },
    { name: 'invalid theme-mode alone falls back to Auto (night)', time: '22:00:00', storage: { 'theme-mode': 'banana' }, mode: 'auto', theme: 'dark' },
    { name: 'invalid theme-mode falls back to the legacy rule: legacy light at night', time: '22:00:00', storage: { 'theme-mode': 'banana', theme: 'light' }, mode: 'light', theme: 'light' },
    { name: 'invalid theme-mode falls back to the legacy rule: legacy dark by day', time: '10:00:00', storage: { 'theme-mode': 'banana', theme: 'dark' }, mode: 'dark', theme: 'dark' },
    { name: 'empty theme-mode falls back to the legacy rule', time: '10:00:00', storage: { 'theme-mode': '', theme: 'dark' }, mode: 'dark', theme: 'dark' },
    { name: 'wrong-case theme-mode=DARK is invalid: Auto', time: '10:00:00', storage: { 'theme-mode': 'DARK' }, mode: 'auto', theme: 'light' },
    { name: 'valid theme-mode wins over a conflicting stored theme (dark mode, theme=light)', time: '10:00:00', storage: { 'theme-mode': 'dark', theme: 'light' }, mode: 'dark', theme: 'dark' },
    { name: 'valid theme-mode wins over a conflicting stored theme (light mode, theme=dark)', time: '22:00:00', storage: { 'theme-mode': 'light', theme: 'dark' }, mode: 'light', theme: 'light' },
    { name: 'Auto ignores a stale stored theme from an earlier hour (theme=light at night)', time: '22:00:00', storage: { 'theme-mode': 'auto', theme: 'light' }, mode: 'auto', theme: 'dark' },
    { name: 'Auto ignores a stale stored theme from an earlier hour (theme=dark by day)', time: '10:00:00', storage: { 'theme-mode': 'auto', theme: 'dark' }, mode: 'auto', theme: 'light' },
  ];

  for (const { name, time, storage, mode, theme } of cases) {
    test(name, async ({ visit }) => {
      // The init script alone decides first: no external script runs here.
      const scriptOnly = await visit({ time, storage, blockScripts: true, sampler: true });
      await goto(scriptOnly, '/');
      await expectTheme(scriptOnly, theme);
      expect(await stored(scriptOnly, 'theme-mode'), 'init script migrates/normalises the stored mode').toBe(mode);
      expect(await stored(scriptOnly, 'theme')).toBe(theme);
      await expectNoWrongPaint(scriptOnly, theme, `${name} (script only)`);

      // Then the hydrated toggle must agree with what the script chose.
      const page = await visit({ time, storage, sampler: true });
      await goto(page, '/');
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, theme));
      await expectTheme(page, theme);
      expect(await stored(page, 'theme-mode')).toBe(mode);
      expect(await stored(page, 'theme')).toBe(theme);
      await expectNoWrongPaint(page, theme, name);

      // And it survives a reload with the same answer.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, theme));
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 6. FR-008, SC-004 - live switching

test.describe('live switching while the page is open (FR-008, SC-004)', () => {
  /** Opens the page under a fake clock that starts well before `pauseAt`, waits for hydration, then freezes at `pauseAt`. */
  async function openPaused(visit: (options?: VisitOptions) => Promise<Page>, start: string, pauseAt: string, storage: Record<string, string> = {}) {
    const page = await visit({ clock: 'install', time: start, storage });
    await goto(page, '/');
    await hydrated(page);
    await page.clock.pauseAt(instant(pauseAt));
    return page;
  }

  test('Auto flips to dark within the window after 18:00 without a reload, and the toggle name follows', async ({ visit }) => {
    const page = await openPaused(visit, '17:55:00', '17:59:50');
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    await page.clock.runFor(9_000); // 17:59:59
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    await page.clock.runFor(1_000 + 1_000); // 18:00:01: within SC-004's one second of the boundary (+250 ms margin in the app)
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    expect(await stored(page, 'theme')).toBe('dark');
    expect(await stored(page, 'theme-mode')).toBe('auto');
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
  });

  test('Auto flips to light within the window after 06:00, and the next boundary re-arms (light -> dark at 18:00)', async ({ visit }) => {
    const page = await openPaused(visit, '05:55:00', '05:59:50');
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    await page.clock.runFor(11_000); // 06:00:01
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    // The timer re-armed itself for the next boundary.
    await page.clock.fastForward('11:58:00'); // 17:58:01
    await expectTheme(page, 'light');
    await page.clock.runFor('02:00'); // 18:00:01
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
  });

  test('a long gap spanning the boundary is corrected by the next timer firing (day -> overnight -> morning)', async ({ visit }) => {
    const page = await openPaused(visit, '17:55:00', '17:59:50');
    await page.clock.fastForward('12:00:00'); // 05:59:50 next day: past 18:00, before 06:00
    await expectTheme(page, 'dark');
    await page.clock.fastForward('00:30'); // 06:00:20
    await expectTheme(page, 'light');
  });

  for (const [mode, start, pauseAt, after] of [
    ['light', '17:55:00', '17:59:50', 'dark-side'],
    ['dark', '05:55:00', '05:59:50', 'light-side'],
  ] as const) {
    test(`${mode} does not change when the clock crosses ${mode === 'light' ? '18:00' : '06:00'}, on a timer, on visibilitychange or on focus`, async ({ visit }) => {
      const page = await openPaused(visit, start, pauseAt, MODE_STORAGE(mode));
      await expectTheme(page, mode);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      expect(after).toBeTruthy();
      await page.clock.runFor(30_000); // across the boundary and well past the app's +250 ms
      await expectTheme(page, mode);
      await page.clock.fastForward('13:00:00'); // into the other half of the day entirely
      await expectTheme(page, mode);
      await page.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      });
      await expectTheme(page, mode);
      await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, mode));
      expect(await stored(page, 'theme-mode')).toBe(mode);
    });
  }

  test('a tab that was hidden across a boundary corrects itself when it becomes visible again', async ({ visit }) => {
    const page = await openPaused(visit, '17:55:00', '17:59:50');
    await expectTheme(page, 'light');
    const setVisibility = (state: 'hidden' | 'visible') =>
      page.evaluate((value) => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => value === 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      }, state);

    await setVisibility('hidden');
    await page.clock.setSystemTime(instant('18:30:00')); // moves Date without firing timers: a throttled/slept background tab
    await setVisibility('hidden'); // a second hidden event must not re-resolve either
    await expectTheme(page, 'light');
    await setVisibility('visible');
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);

    // And the other direction.
    await setVisibility('hidden');
    await page.clock.setSystemTime(instant('06:30:00', DEFAULT_ZONE, '2026-01-16'));
    await expectTheme(page, 'dark');
    await setVisibility('visible');
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
  });

  test('regaining window focus also re-resolves', async ({ visit }) => {
    const page = await openPaused(visit, '17:55:00', '17:59:50');
    await expectTheme(page, 'light');
    await page.clock.setSystemTime(instant('19:00:00'));
    await expectTheme(page, 'light'); // nothing fired yet
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expectTheme(page, 'dark');
  });

  test('a mid-session clock change (for example a changed system time) is picked up by the next re-resolve', async ({ visit }) => {
    const page = await openPaused(visit, '10:55:00', '11:00:00');
    await expectTheme(page, 'light');
    await page.clock.setSystemTime(instant('23:00:00'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expectTheme(page, 'dark');
  });

  test('switching the mode to Auto re-arms the timer; leaving Auto stops it', async ({ visit }) => {
    // Start in Light, walk to Auto (Light -> Dark -> Auto) just before 18:00: Auto must now follow the clock.
    const page = await openPaused(visit, '17:55:00', '17:59:50', MODE_STORAGE('light'));
    await toggle(page).click();
    await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);
    await expectTheme(page, 'dark');
    await toggle(page).click();
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    await expectTheme(page, 'light');
    await page.clock.runFor(11_000);
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);

    // Leave Auto (-> Light) with a boundary still ahead: a leaked timer would turn it dark/light by the clock.
    await toggle(page).click();
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    await expectTheme(page, 'light');
    await page.clock.fastForward('12:00:00'); // 06:00:xx next day: the boundary at 06:00 passes
    await expectTheme(page, 'light');
    await page.clock.fastForward('12:00:00'); // and 18:00 again
    await expectTheme(page, 'light');
    expect(await stored(page, 'theme-mode')).toBe('light');
  });

  test('leaving Auto for Light just before a boundary is not undone when the old timer would have fired', async ({ visit }) => {
    const page = await openPaused(visit, '17:55:00', '17:59:50');
    await toggle(page).click(); // Auto -> Light
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    await page.clock.runFor(11_000); // the Auto timer was due at 18:00:00.25
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 7. Cross-tab

test.describe('other tabs follow a mode change (storage events)', () => {
  test('a change in tab A is applied in tab B (name and class), through the whole cycle', async ({ visit }) => {
    const a = await visit({ time: '22:00:00' });
    const b = await a.context().newPage();
    await goto(a, '/');
    await goto(b, '/blog');
    await hydrated(a);
    await hydrated(b);
    await expect(toggle(b)).toHaveAccessibleName(NAMES.autoDark);

    const steps: Array<[string, Theme]> = [[NAMES.light, 'light'], [NAMES.dark, 'dark'], [NAMES.autoDark, 'dark'], [NAMES.light, 'light']];
    for (const [name, theme] of steps) {
      await toggle(a).click();
      await expect(toggle(a)).toHaveAccessibleName(name);
      await expect(toggle(b)).toHaveAccessibleName(name);
      await expectTheme(b, theme);
      await expectTheme(a, theme);
    }
  });

  test('a change in tab B is applied in tab A, and a tab opened later starts from the shared choice', async ({ visit }) => {
    const a = await visit({ time: '12:00:00' });
    const b = await a.context().newPage();
    await goto(a, '/');
    await goto(b, ARTICLE);
    await hydrated(a);
    await hydrated(b);
    await toggle(b).click();
    await toggle(b).click(); // Auto -> Light -> Dark
    await expect(toggle(b)).toHaveAccessibleName(NAMES.dark);
    await expect(toggle(a)).toHaveAccessibleName(NAMES.dark);
    await expectTheme(a, 'dark');

    const c = await a.context().newPage();
    await goto(c, '/');
    await hydrated(c);
    await expect(toggle(c)).toHaveAccessibleName(NAMES.dark);
    await expectTheme(c, 'dark');
  });

  test('both tabs return to Auto together and keep following the clock afterwards', async ({ visit }) => {
    const a = await visit({ time: '12:00:00', storage: MODE_STORAGE('dark') });
    const b = await a.context().newPage();
    await goto(a, '/');
    await goto(b, '/blog');
    await hydrated(a);
    await hydrated(b);
    await toggle(a).click(); // Dark -> Auto
    await expect(toggle(a)).toHaveAccessibleName(NAMES.autoLight);
    await expect(toggle(b)).toHaveAccessibleName(NAMES.autoLight);
    await expectTheme(b, 'light');
    await a.context().clock.setFixedTime(instant('23:00:00'));
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expectTheme(b, 'dark');
    await expect(toggle(b)).toHaveAccessibleName(NAMES.autoDark);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 7b. Cleared storage (the visitor clears site data while a page is open)

test.describe('storage cleared while pages are open', () => {
  test('an Auto page restores theme-mode=auto on focus, and a later reload at night is dark, not pinned to Light', async ({ visit }) => {
    const page = await visit({ time: '12:00:00' });
    await goto(page, '/');
    await hydrated(page);
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);

    await page.evaluate(() => localStorage.clear());
    expect(await stored(page, 'theme-mode')).toBeNull();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => stored(page, 'theme-mode'), { message: 'Auto re-resolve writes the mode back' }).toBe('auto');
    await expectTheme(page, 'light');

    await page.context().clock.setFixedTime(instant('22:00:00'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectTheme(page, 'dark');
    await hydrated(page);
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    expect(await stored(page, 'theme-mode')).toBe('auto');
    await expectTheme(page, 'dark');
  });

  test('three tabs: clearing storage in one leaves every tab on "Theme: Auto (currently ...)" with the same class', async ({ visit }) => {
    const a = await visit({ time: '12:00:00' });
    const b = await a.context().newPage();
    const c = await a.context().newPage();
    await goto(a, '/');
    await goto(b, '/blog');
    await goto(c, ARTICLE);
    for (const tab of [a, b, c]) {
      await hydrated(tab);
      await expect(toggle(tab)).toHaveAccessibleName(NAMES.autoLight);
    }

    await a.evaluate(() => localStorage.clear());
    await a.evaluate(() => window.dispatchEvent(new Event('focus')));
    for (const tab of [a, b, c]) {
      await expect(toggle(tab)).toHaveAccessibleName(/^Theme: Auto \(currently (light|dark)\)$/);
      await expectTheme(tab, 'light');
    }
    await expect.poll(() => stored(a, 'theme-mode')).toBe('auto');
    // A fresh load now, at night, must still be Auto (not a pinned Light left behind by a tab writing only "theme").
    await a.context().clock.setFixedTime(instant('22:00:00'));
    for (const tab of [a, b, c]) {
      await tab.reload({ waitUntil: 'domcontentloaded' });
      await hydrated(tab);
      await expect(toggle(tab)).toHaveAccessibleName(NAMES.autoDark);
      await expectTheme(tab, 'dark');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 8. FR-006, FR-010 - independence from the season

test.describe('independent of the season (FR-006, FR-010)', () => {
  const states: Array<{ label: string; time: string; storage: Record<string, string>; theme: Theme; name: string }> = [
    { label: 'Auto by day', time: '12:00:00', storage: {}, theme: 'light', name: NAMES.autoLight },
    { label: 'Auto by night', time: '22:00:00', storage: {}, theme: 'dark', name: NAMES.autoDark },
    { label: 'Light at night', time: '22:00:00', storage: MODE_STORAGE('light'), theme: 'light', name: NAMES.light },
    { label: 'Dark by day', time: '12:00:00', storage: MODE_STORAGE('dark'), theme: 'dark', name: NAMES.dark },
  ];

  for (const season of SEASON_IDS) {
    test(`${season}: data-season and the theme class are set together in every mode and the page ground matches the theme`, async ({ visit }) => {
      for (const state of states) {
        const page = await visit({ time: state.time, storage: { ...state.storage, season }, sampler: true });
        await goto(page, '/');
        await hydrated(page);
        await expect(html(page), `${season} / ${state.label}`).toHaveAttribute('data-season', season);
        await expectTheme(page, state.theme);
        await expect(toggle(page)).toHaveAccessibleName(state.name);
        await expect(seasonButton(page)).toBeEnabled();
        const ground = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ground').trim());
        const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(ground, 'palette token applied').not.toBe('');
        expect(luminance(background) > 0.3, `${season} / ${state.label}: ${state.theme} ground ${background}`).toBe(state.theme === 'light');
        await expectNoWrongPaint(page, state.theme, `${season} / ${state.label}`);
        await page.context().close();
      }
    });
  }

  test('changing the season never changes the mode, and cycling the mode never changes the season', async ({ visit }) => {
    const page = await visit({ time: '22:00:00' });
    await goto(page, '/');
    await hydrated(page);
    const seasonOf = () => html(page).getAttribute('data-season');
    const detected = await seasonOf(); // Manila in January: dry
    expect(detected).toBe('dry');
    for (const [label, id] of [['Winter', 'winter'], ['Wet season', 'wet'], ['Automatic', 'dry']] as const) {
      await seasonButton(page).click();
      await seasonMenu(page).getByRole('menuitemradio', { name: label, exact: true }).click();
      await expect(html(page)).toHaveAttribute('data-season', id);
      await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
      await expectTheme(page, 'dark');
      expect(await stored(page, 'theme-mode')).toBe('auto');
    }
    await seasonButton(page).click();
    await seasonMenu(page).getByRole('menuitemradio', { name: 'Autumn', exact: true }).click();
    for (const name of [NAMES.light, NAMES.dark, NAMES.autoDark]) {
      await toggle(page).click();
      await expect(toggle(page)).toHaveAccessibleName(name);
      await expect(html(page)).toHaveAttribute('data-season', 'autumn');
      expect(await stored(page, 'season')).toBe('autumn');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 9. FR-009 - no JavaScript

test.describe('scripts disabled (FR-009)', () => {
  for (const time of ['12:00:00', '22:00:00']) {
    test(`at ${time} the existing dark design is shown with full content and navigation, and no season`, async ({ visit }) => {
      const page = await visit({ javaScriptEnabled: false, time });
      await goto(page, '/');
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await expect(html(page)).not.toHaveClass(/\blight\b/);
      await expect(html(page)).not.toHaveAttribute('data-season', /.*/);
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(luminance(background), `dark ground ${background}`).toBeLessThan(0.3);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      for (const name of ['Blog', 'Contact']) await expect(page.locator('.main-nav').getByRole('link', { name })).toBeVisible();
      // The toggle is present but inert and still named; it never claims a mode it cannot apply.
      await expect(toggle(page)).toBeDisabled();
      await expect(toggle(page)).toHaveAccessibleName('Theme: Auto');

      await page.getByRole('link', { name: 'Blog' }).first().click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await expect(html(page)).toHaveClass(/\bdark\b/);
      await page.getByRole('link', { name: /Fixture Newest/ }).click();
      await expect(page.locator('.article-body')).toContainText('A paragraph with bold text');
      await expect(html(page)).toHaveClass(/\bdark\b/);
      const missing = await goto(page, '/definitely-not-a-page');
      expect(missing?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
      await expect(html(page)).toHaveClass(/\bdark\b/);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 10. SC-006 - layout

test.describe('header controls without overflow (SC-006)', () => {
  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${theme} at ${width}px: home and article have no horizontal overflow; season picker and theme toggle are visible, enabled and apart`, async ({ visit }) => {
        const viewport = { width, height: width === 390 ? 844 : 900 };
        const page = await visit({ viewport, storage: MODE_STORAGE(theme) });
        for (const route of ['/', ARTICLE]) {
          await goto(page, route);
          await hydrated(page);
          await expectTheme(page, theme);
          await noOverflow(page);
          await expect(seasonButton(page)).toBeVisible();
          await expect(seasonButton(page)).toBeEnabled();
          await expect(toggle(page)).toBeVisible();
          await expect(toggle(page)).toBeEnabled();
          await inside(seasonButton(page), viewport);
          await inside(toggle(page), viewport);
          const season = (await seasonButton(page).boundingBox())!;
          const themeBox = (await toggle(page).boundingBox())!;
          expect(themeBox.width, 'touch target width').toBeGreaterThanOrEqual(24);
          expect(themeBox.height, 'touch target height').toBeGreaterThanOrEqual(24);
          const overlap = Math.min(season.x + season.width, themeBox.x + themeBox.width) - Math.max(season.x, themeBox.x);
          expect(overlap, 'season picker and theme toggle must not overlap').toBeLessThanOrEqual(0);
          for (const link of await page.locator('.main-nav a').all()) {
            await expect(link).toBeVisible();
            await inside(link, viewport);
          }
          // The control is the topmost element at its centre (not covered by the header, menu or ambient layer).
          const hit = await toggle(page).evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const element = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return !!element && node.contains(element);
          });
          expect(hit).toBe(true);
        }
      });
    }
  }

  test('390px: the open season menu stays inside the viewport and the theme toggle still works around it', async ({ visit }) => {
    const viewport = { width: 390, height: 844 };
    for (const theme of ['light', 'dark'] as const) {
      const page = await visit({ viewport, storage: MODE_STORAGE(theme) });
      await goto(page, '/');
      await hydrated(page);
      await seasonButton(page).click();
      await expect(seasonMenu(page)).toBeVisible();
      await inside(seasonMenu(page), viewport);
      await noOverflow(page);
      await expect(toggle(page)).toBeEnabled();
      await inside(toggle(page), viewport);
      await page.keyboard.press('Escape');
      await expect(seasonMenu(page)).toHaveCount(0);
      await toggle(page).click();
      await expect(toggle(page)).toHaveAccessibleName(nameFor(theme === 'light' ? 'dark' : 'auto', theme === 'light' ? 'dark' : 'light'));
      await page.context().close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 11. Storage unavailable

test.describe('storage unavailable (edge case)', () => {
  for (const [time, expected] of [['10:00:00', 'light'], ['22:00:00', 'dark']] as const) {
    test(`Auto still resolves by the hour at ${time} (${expected}); a manual choice changes the theme for the page view; no errors`, async ({ visit }) => {
      const page = await visit({ time, storageUnavailable: true });
      const errors = watchErrors(page);
      await goto(page, '/');
      await expectTheme(page, expected);
      await hydrated(page);
      await expect(toggle(page)).toHaveAccessibleName(autoName(expected));
      await toggle(page).click(); // Auto -> Light
      await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
      await expectTheme(page, 'light');
      await toggle(page).click(); // -> Dark
      await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);
      await expectTheme(page, 'dark');
      await toggle(page).click(); // -> Auto
      await expect(toggle(page)).toHaveAccessibleName(autoName(expected));
      await expectTheme(page, expected);
      expect(realErrors(errors)).toEqual([]);
    });
  }

  for (const [time, expected] of [['10:30:00', 'light'], ['22:00:00', 'dark']] as const) {
    test(`storage blocked at ${time}: the first-paint class is already ${expected} (the init script needs no storage) and so is the final class`, async ({ visit }) => {
      const page = await visit({ time, storageUnavailable: true, sampler: true });
      const errors = watchErrors(page);
      await goto(page, '/');
      // Judged at the first paint opportunities: DOMContentLoaded and the first frame. (One corrected frame after
      // hydration would be tolerated, so later frames are not asserted; the final state is.)
      const early = await samples(page);
      const dcl = early.find((sample) => sample.where === 'dcl');
      const firstFrame = early.find((sample) => sample.where === 'raf' && sample.body); // a frame before <body> exists paints no themed ground
      expect(dcl, 'DOMContentLoaded sample').toBeDefined();
      expect(hasTheme(dcl!.cls, expected), `class at DOMContentLoaded was "${dcl!.cls}"`).toBe(true);
      expect(firstFrame, 'first frame sample with <body> present').toBeDefined();
      expect(hasTheme(firstFrame!.cls, expected), `class at the first frame was "${firstFrame!.cls}"`).toBe(true);
      await expectTheme(page, expected);
      await hydrated(page);
      await expectTheme(page, expected);
      await expect(toggle(page)).toHaveAccessibleName(autoName(expected));
      expect(realErrors(errors)).toEqual([]);
    });
  }

  test('a manual choice made at night lasts through client-side navigation within the page view (as the season picker does)', async ({ visit }) => {
    // <Header> lives in the (home) and blog layouts, so ThemeToggle remounts on home -> blog. With storage blocked the
    // toggle keeps the chosen mode in module scope so the choice survives that remount (the spec's edge case: "a
    // manual choice lasts for the page view").
    const page = await visit({ time: '22:00:00', storageUnavailable: true });
    const errors = watchErrors(page);
    await goto(page, '/');
    await hydrated(page);
    await toggle(page).click(); // Auto (dark) -> Light
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    await expectTheme(page, 'light');
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await hydrated(page);
    await expectTheme(page, 'light');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    expect(realErrors(errors)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 12. Console health

test.describe('runtime health', () => {
  test('no console errors, warnings or page errors across a session that cycles modes and crosses a boundary', async ({ visit }) => {
    const page = await visit({ clock: 'install', time: '17:55:00' });
    const errors = watchErrors(page);
    await goto(page, '/');
    await hydrated(page);
    await page.clock.pauseAt(instant('17:59:50'));
    for (let i = 0; i < 4; i += 1) await toggle(page).click(); // Auto -> Light -> Dark -> Auto -> Light
    await toggle(page).click(); // Dark
    await toggle(page).click(); // Auto
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    await page.clock.runFor(11_000); // crosses 18:00 in Auto
    await expectTheme(page, 'dark');
    await page.clock.resume(); // client-side navigation and page animations need time to flow again
    await seasonButton(page).click();
    await seasonMenu(page).getByRole('menuitemradio', { name: 'Winter', exact: true }).click();
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.getByRole('link', { name: /Fixture Newest/ }).click();
    await expect(page.locator('.blog-article')).toBeVisible();
    await goto(page, '/definitely-not-a-page');
    await page.reload({ waitUntil: 'load' });
    await hydrated(page);
    expect(realErrors(errors)).toEqual([]);
  });

  test('applying a theme does not shift layout', async ({ visit }) => {
    const page = await visit({ time: '12:00:00' });
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
    for (let i = 0; i < 4; i += 1) await toggle(page).click();
    await page.waitForLoadState('load');
    const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    expect(shift).toBeLessThan(0.01);
  });
});
