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
type Theme = 'light' | 'dark';
type Mode = 'auto' | 'light' | 'dark';

const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter', 'wet', 'dry'] as const;
type SeasonId = (typeof SEASON_IDS)[number];
const SEASON_LABELS: Record<SeasonId, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter', wet: 'Wet season', dry: 'Dry season' };
/** Tropical seasons exist only in tropical zones and the rest only in temperate ones; a stored season outside the region is ignored. */
const seasonZone = (season: SeasonId): Zone => (season === 'wet' || season === 'dry' ? 'Asia/Manila' : 'Europe/Berlin');

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
  /** A stored manual season; unless `zone` is given the zone is one where that season exists (Berlin or Manila). */
  season?: SeasonId;
  viewport?: { width: number; height: number };
  colorScheme?: 'light' | 'dark';
  javaScriptEnabled?: boolean;
  reducedMotion?: 'reduce' | 'no-preference';
  /** Record every theme-icon-in animation (start details, end) and the most that ever ran at once. */
  iconRecorder?: boolean;
  /** Touch-only device emulation: (hover: none), (pointer: coarse), a mobile viewport. */
  touch?: boolean;
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
      const zone = options.zone ?? (options.season ? seasonZone(options.season) : DEFAULT_ZONE);
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        timezoneId: zone,
        viewport: options.viewport ?? { width: 1440, height: 900 },
        colorScheme: options.colorScheme ?? 'light',
        reducedMotion: options.reducedMotion ?? 'no-preference',
        javaScriptEnabled: options.javaScriptEnabled ?? true,
        ...(options.touch ? { hasTouch: true, isMobile: true } : {}),
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
      const seeds: Record<string, string> = { ...(options.storage ?? {}), ...(options.season ? { season: options.season } : {}) };
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
      if (options.iconRecorder) {
        await context.addInitScript(() => {
          type Win = Window & { __iconAnim: Array<Record<string, unknown>>; __iconMaxRunning: number };
          const w = window as unknown as Win;
          w.__iconAnim = [];
          w.__iconMaxRunning = 0;
          const running = () => document.getAnimations().filter((animation) => (animation as CSSAnimation).animationName === 'theme-icon-in');
          document.addEventListener(
            'animationstart',
            (event) => {
              if (event.animationName !== 'theme-icon-in') return;
              const target = event.target as Element;
              const button = target.closest('.theme-toggle, .season-toggle') as HTMLButtonElement;
              const live = running();
              const effect = live[0]?.effect as KeyframeEffect | undefined;
              const properties: string[] = [];
              effect?.getKeyframes().forEach((frame) => {
                Object.keys(frame).forEach((key) => {
                  if (['offset', 'easing', 'composite', 'computedOffset'].indexOf(key) < 0 && properties.indexOf(key) < 0) properties.push(key);
                });
              });
              const rect = button.getBoundingClientRect();
              const header = document.querySelector('.site-header')!.getBoundingClientRect();
              const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
              w.__iconAnim.push({
                type: 'start',
                which: button.classList.contains('season-toggle') ? 'season' : 'theme',
                target: target.tagName.toLowerCase(),
                svgCount: button.querySelectorAll('svg').length,
                running: live.length,
                duration: effect?.getTiming().duration,
                easing: effect?.getTiming().easing,
                fill: effect?.getTiming().fill,
                properties: properties.sort(),
                disabled: button.disabled,
                hittable: !!hit && button.contains(hit),
                label: button.getAttribute('aria-label'),
                dataAnimate: button.getAttribute('data-animate'),
                button: [rect.x, rect.y, rect.width, rect.height].map((n) => Math.round(n * 100) / 100),
                headerHeight: Math.round(header.height * 100) / 100,
              });
            },
            true,
          );
          document.addEventListener('animationend', (event) => {
            if (event.animationName === 'theme-icon-in') w.__iconAnim.push({ type: 'end' });
          }, true);
          const frame = () => {
            w.__iconMaxRunning = Math.max(w.__iconMaxRunning, running().length);
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
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
const seasonLabel = (page: Page) => page.locator('div.season-toggle-wrap > span.season-toggle-label');
const seasonName = (season: SeasonId) => SEASON_LABELS[season];
/** One press of the single season toggle. */
const pressSeason = (page: Page) => seasonButton(page).click();

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
  /** What the button shows right now: its svg(s), and the Auto badge if there is one. */
  const iconState = (page: Page) =>
    toggle(page).evaluate((node) => {
      const svgs = Array.from(node.querySelectorAll('svg'));
      const badges = Array.from(node.querySelectorAll('.theme-toggle-badge'));
      const badge = badges[0] as HTMLElement | undefined;
      const box = node.getBoundingClientRect();
      const badgeBox = badge?.getBoundingClientRect();
      return {
        svgCount: svgs.length,
        svgHidden: svgs.map((svg) => svg.getAttribute('aria-hidden')),
        svgSize: svgs.map((svg) => [parseFloat(getComputedStyle(svg).width), parseFloat(getComputedStyle(svg).height)]), // layout size: a running scale() would shrink getBoundingClientRect
        shape: svgs[0]?.innerHTML ?? '',
        badgeCount: badges.length,
        badgeText: badge?.textContent ?? null,
        badgeHidden: badge?.getAttribute('aria-hidden') ?? null,
        badgePointerEvents: badge ? getComputedStyle(badge).pointerEvents : null,
        badgeSize: badgeBox ? [Math.round(badgeBox.width), Math.round(badgeBox.height)] : null,
        badgeInside: badgeBox ? badgeBox.left >= box.left - 0.5 && badgeBox.top >= box.top - 0.5 && badgeBox.right <= box.right + 0.5 && badgeBox.bottom <= box.bottom + 0.5 : null,
        badgeVisible: badge ? getComputedStyle(badge).display !== 'none' && getComputedStyle(badge).visibility === 'visible' : null,
        badgeInButtonOnly: badges.every((candidate) => candidate.closest('button') === node),
        text: node.textContent,
      };
    });

  test('contract: one aria-hidden svg in every mode; the Auto badge "A" only in Auto; the svg shows the current theme (sun by day, moon by night)', async ({ visit }) => {
    const seen: Record<string, string> = {};
    for (const time of ['10:00:00', '22:00:00']) {
      const day = time === '10:00:00';
      const page = await visit({ time });
      await goto(page, '/');
      await hydrated(page);
      const button = toggle(page);
      await expect(button).toHaveAttribute('type', 'button');
      await expect(button).toHaveClass(/\btheme-toggle\b/);
      const steps: Array<[string, Mode, string]> = [
        ['auto', 'auto', autoName(day ? 'light' : 'dark')],
        ['light', 'light', NAMES.light],
        ['dark', 'dark', NAMES.dark],
        ['auto again', 'auto', autoName(day ? 'light' : 'dark')],
      ];
      for (let index = 0; index < steps.length; index += 1) {
        const [label, mode, name] = steps[index];
        if (index > 0) await button.click();
        await expect(button).toHaveAccessibleName(name);
        const state = await iconState(page);
        expect(state.svgCount, `${label}: exactly one svg`).toBe(1);
        expect(state.svgHidden).toEqual(['true']);
        expect(state.svgSize).toEqual([[20, 20]]);
        if (mode === 'auto') {
          expect(state, `${label}: badge`).toMatchObject({ badgeCount: 1, badgeText: 'A', badgeHidden: 'true', badgePointerEvents: 'none', badgeSize: [16, 16], badgeInside: true, badgeVisible: true, badgeInButtonOnly: true });
        } else {
          expect(state.badgeCount, `${label}: no badge in ${mode}`).toBe(0);
          expect(state.text, `${label}: the button holds no text`).toBe('');
        }
        seen[`${day ? 'day' : 'night'}/${label}`] = state.shape;
      }
      await page.context().close();
    }
    // By day the svg is the sun in Auto and in Light; by night it is the moon in Auto and in Dark.
    expect(seen['day/auto']).toBe(seen['day/light']);
    expect(seen['day/auto again']).toBe(seen['day/light']);
    expect(seen['night/auto']).toBe(seen['night/dark']);
    expect(seen['night/auto again']).toBe(seen['night/dark']);
    expect(seen['day/light']).toBe(seen['night/light']);
    expect(seen['day/dark']).toBe(seen['night/dark']);
    expect(seen['day/light'], 'sun and moon differ').not.toBe(seen['day/dark']);
    expect(seen['day/auto']).not.toBe(seen['night/auto']);
  });

  test('a live 18:00 flip in Auto swaps the sun for the moon and the badge stays; 06:00 swaps it back', async ({ visit }) => {
    const page = await visit({ clock: 'install', time: '17:55:00' });
    await goto(page, '/');
    await hydrated(page);
    await page.clock.pauseAt(instant('17:59:50'));
    const sun = await iconState(page);
    expect(sun).toMatchObject({ svgCount: 1, badgeCount: 1, badgeText: 'A' });
    await page.clock.runFor(11_000);
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    const moon = await iconState(page);
    expect(moon).toMatchObject({ svgCount: 1, badgeCount: 1, badgeText: 'A', badgeVisible: true, badgeInside: true });
    expect(moon.shape, 'sun -> moon').not.toBe(sun.shape);
    await page.clock.fastForward('12:00:00');
    await expectTheme(page, 'light');
    const again = await iconState(page);
    expect(again.shape, 'moon -> sun').toBe(sun.shape);
    expect(again.badgeCount).toBe(1);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: the Auto badge text is at least 4.5:1 on its own background in all six seasons, at rest and on hover; flat`, async ({ visit }) => {
      const failures: string[] = [];
      for (const season of SEASON_IDS) {
        const page = await visit({ time: theme === 'light' ? '10:00:00' : '22:00:00', season });
        await goto(page, '/');
        await hydrated(page);
        await expectTheme(page, theme);
        await expect(html(page)).toHaveAttribute('data-season', season);
        const badge = page.locator('.theme-toggle .theme-toggle-badge');
        await expect(badge).toHaveCount(1);
        await expect(badge).toBeVisible();
        const read = () =>
          badge.evaluate((node) => {
            const computed = getComputedStyle(node);
            return { color: computed.color, background: computed.backgroundColor, opacity: computed.opacity, boxShadow: computed.boxShadow, backgroundImage: computed.backgroundImage, fontSize: parseFloat(computed.fontSize) };
          });
        const rest = await read();
        await toggle(page).hover(); // (hover: hover): the badge inverts on the accent hover fill
        const hover = await expect.poll(async () => (await read()).color !== rest.color, { message: `${season}/${theme}: hover restyles the badge` }).toBe(true).then(read);
        await parkPointer(page);
        for (const [state, style] of [['rest', rest], ['hover', hover]] as const) {
          expect(style.background, `${season}/${theme}/${state}: opaque background`).toMatch(/^rgb\(/);
          expect(style.color, `${season}/${theme}/${state}: opaque text`).toMatch(/^rgb\(/);
          expect(style.opacity).toBe('1');
          expect(style.boxShadow).toBe('none');
          expect(style.backgroundImage).toBe('none');
          const ratio = contrast(style.color, style.background);
          if (ratio < 4.5) failures.push(`${season}/${theme}/${state}: ${style.color} on ${style.background} = ${ratio.toFixed(2)} (font ${style.fontSize}px)`);
        }
        expect(`${hover.color}|${hover.background}`, `${season}/${theme}: hover is the inverse of rest`).toBe(`${rest.background}|${rest.color}`);
        await page.context().close();
      }
      expect(failures).toEqual([]);
    });
  }

  test('the badge never intercepts pointer input and does not change the button box', async ({ visit }) => {
    const page = await visit({ time: '10:00:00' });
    await goto(page, '/');
    await hydrated(page);
    const before = await boxes(page);
    const target = await page.locator('.theme-toggle .theme-toggle-badge').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { insideButton: !!hit && !!hit.closest('.theme-toggle'), isBadge: !!hit?.closest('.theme-toggle-badge') };
    });
    expect(target.insideButton).toBe(true);
    await page.locator('.theme-toggle .theme-toggle-badge').click({ force: true });
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light); // a click on the badge is a click on the button
    await toggle(page).click();
    await toggle(page).click(); // back to Auto
    expect(await boxes(page)).toEqual(before);
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
        const page = await visit({ time: state.time, storage: state.storage, season, sampler: true });
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

  test('pressing the season toggle never changes the mode, and cycling the mode never changes the season', async ({ visit }) => {
    const page = await visit({ time: '22:00:00' }); // Manila in January: dry
    await goto(page, '/');
    await hydrated(page);
    await expect(html(page)).toHaveAttribute('data-season', 'dry');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto (currently dry season)');
    await pressSeason(page); // dry (detected) -> wet
    await expect(html(page)).toHaveAttribute('data-season', 'wet');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Wet season');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    await expectTheme(page, 'dark');
    expect(await stored(page, 'theme-mode')).toBe('auto');
    expect(await stored(page, 'season')).toBe('wet');
    for (const name of [NAMES.light, NAMES.dark, NAMES.autoDark]) {
      await toggle(page).click();
      await expect(toggle(page)).toHaveAccessibleName(name);
      await expect(html(page)).toHaveAttribute('data-season', 'wet');
      expect(await stored(page, 'season')).toBe('wet');
    }
    await pressSeason(page); // wet -> dry is the detected season: Automatic
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto (currently dry season)');
    expect(await stored(page, 'season')).toBe('auto');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
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

  test('390px: no season menu exists; both toggles are enabled side by side and a press of either changes only its own state', async ({ visit }) => {
    const viewport = { width: 390, height: 844 };
    for (const theme of ['light', 'dark'] as const) {
      const page = await visit({ viewport, storage: MODE_STORAGE(theme) });
      await goto(page, '/');
      await hydrated(page);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await noOverflow(page);
      await expect(toggle(page)).toBeEnabled();
      await expect(seasonButton(page)).toBeEnabled();
      await inside(toggle(page), viewport);
      await inside(seasonButton(page), viewport);
      await pressSeason(page);
      await expect(html(page)).toHaveAttribute('data-season', 'wet');
      await expectTheme(page, theme);
      await toggle(page).click();
      await expect(toggle(page)).toHaveAccessibleName(nameFor(theme === 'light' ? 'dark' : 'auto', theme === 'light' ? 'dark' : 'light'));
      await expect(html(page)).toHaveAttribute('data-season', 'wet');
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

  test('a manual choice made at night lasts through client-side navigation within the page view (as the season toggle does)', async ({ visit }) => {
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
    await pressSeason(page);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Wet season');
    expect(realErrors(errors)).toEqual([]);

    // Navigation runs on real timers: webpack's chunk-load timeout is a timer, so it cannot be driven under a paused fake clock.
    const walker = await visit({ time: '17:59:55' });
    const walkerErrors = watchErrors(walker);
    await goto(walker, '/');
    await hydrated(walker);
    await toggle(walker).click();
    await walker.getByRole('link', { name: 'Blog' }).first().click();
    await expect(walker).toHaveURL(/\/blog\/?$/);
    await walker.getByRole('link', { name: /Fixture Newest/ }).click();
    await expect(walker.locator('.blog-article')).toBeVisible();
    await goto(walker, '/definitely-not-a-page');
    await walker.reload({ waitUntil: 'load' });
    await hydrated(walker);
    expect(realErrors(walkerErrors)).toEqual([]);
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

// ---------------------------------------------------------------------------------------------------------------
// 13. FR-012, SC-007 - the visible mode label

const modeLabel = (page: Page) => page.locator('div.theme-toggle-wrap > span.theme-toggle-label');
const FLASH_MS = 2000;

/** Opens `/` under a fake clock, waits for hydration, then freezes time so the label timer is driven by runFor. */
async function pausedPage(visit: (options?: VisitOptions) => Promise<Page>, options: VisitOptions & { start?: string; pauseAt?: string } = {}) {
  const { start = '10:00:00', pauseAt = '10:30:00', ...rest } = options;
  const page = await visit({ clock: 'install', time: start, ...rest });
  await goto(page, '/');
  await hydrated(page);
  await page.clock.pauseAt(instant(pauseAt, rest.zone ?? (rest.season ? seasonZone(rest.season) : undefined)));
  return page;
}

/** Park the pointer somewhere harmless so neither hover nor focus is what shows the label. */
async function parkPointer(page: Page) {
  await page.mouse.move(5, 700);
}

async function boxes(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100);
    };
    return {
      header: rect('.site-header'),
      season: rect('.season-toggle'),
      theme: rect('.theme-toggle'),
      wrap: rect('.theme-toggle-wrap'),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

test.describe('visible mode label (FR-012, SC-007)', () => {
  test('markup: a decorative sibling of the button inside div.theme-toggle-wrap; name and icons unchanged', async ({ visit }) => {
    const page = await visit({ time: '10:00:00' });
    await goto(page, '/');
    await hydrated(page);
    const facts = await page.evaluate(() => {
      const wrap = document.querySelector('div.theme-toggle-wrap');
      const label = document.querySelector('span.theme-toggle-label') as HTMLElement | null;
      const button = document.querySelector('button.theme-toggle');
      const style = label ? getComputedStyle(label) : null;
      const durations = (value: string) => value.split(',').map((part) => parseFloat(part));
      return {
        wrapCount: document.querySelectorAll('.theme-toggle-wrap').length,
        labelCount: document.querySelectorAll('.theme-toggle-label').length,
        children: wrap ? Array.from(wrap.children).map((child) => `${child.tagName.toLowerCase()}.${child.className}`) : [],
        siblings: !!label && !!button && label.parentElement === wrap && button.parentElement === wrap && button.nextElementSibling === label,
        controls: Array.from(document.querySelector('.header-controls')!.children).map((child) => child.className),
        ariaHidden: label?.getAttribute('aria-hidden'),
        tabindex: label?.getAttribute('tabindex') ?? null,
        focusableInside: label ? label.querySelectorAll('a, button, input, select, textarea, [tabindex]').length : -1,
        pointerEvents: style?.pointerEvents,
        position: style?.position,
        transitionDurations: style ? durations(style.transitionDuration) : [],
        animationName: style?.animationName,
        animationDuration: style ? durations(style.animationDuration) : [],
        display: style?.display,
        buttonLabel: button?.getAttribute('aria-label'),
        buttonText: button?.textContent,
        buttonIcons: button?.querySelectorAll('svg[aria-hidden="true"]').length,
        buttonFocusable: button ? (button as HTMLButtonElement).tabIndex : null,
        spanTag: label?.tagName,
        inButton: !!label?.closest('button'),
      };
    });
    expect(facts.wrapCount).toBe(1);
    expect(facts.labelCount).toBe(1);
    expect(facts.children).toEqual(['button.theme-toggle', 'span.theme-toggle-label']);
    expect(facts.siblings).toBe(true);
    expect(facts.inButton).toBe(false);
    expect(facts.controls).toEqual(['season-toggle-wrap', 'theme-toggle-wrap']);
    expect(facts).toMatchObject({ ariaHidden: 'true', tabindex: null, focusableInside: 0, pointerEvents: 'none', position: 'absolute', spanTag: 'SPAN' });
    expect(facts.transitionDurations.every((value) => value === 0), 'no transition').toBe(true);
    expect(facts.animationName).toBe('none');
    expect(facts.animationDuration.every((value) => value === 0), 'no animation').toBe(true);
    expect(facts.display, 'hidden on load').toBe('none');
    expect(facts).toMatchObject({ buttonLabel: NAMES.autoLight, buttonText: 'A', buttonIcons: 1, buttonFocusable: 0 }); // the Auto badge is the only text
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    await expect(modeLabel(page)).toBeHidden();
    // The label is not part of the accessibility tree: the wrapper exposes only the button.
    const tree = await page.locator('div.theme-toggle-wrap').ariaSnapshot();
    expect(tree).toContain(NAMES.autoLight);
    expect(tree).not.toMatch(/now|Light\b(?!\))/);
    // Not reachable by Tab, not focusable by script either.
    const reachedLabel = await (async () => {
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(() => !!document.activeElement?.closest('.theme-toggle-label'))) return true;
      }
      return false;
    })();
    expect(reachedLabel).toBe(false);
    await modeLabel(page).focus({ timeout: 500 }).catch(() => undefined);
    expect(await page.evaluate(() => !!document.activeElement?.closest('.theme-toggle-label'))).toBe(false);
  });

  test('the label stays hidden on page load, after reload and after navigation', async ({ visit }) => {
    const page = await visit({ time: '10:00:00' });
    await goto(page, '/');
    await expect(modeLabel(page)).toBeHidden(); // pre-hydration
    await hydrated(page);
    await expect(modeLabel(page)).toBeHidden();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expect(modeLabel(page)).toBeHidden();
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await hydrated(page);
    await expect(modeLabel(page)).toBeHidden();
    await goto(page, ARTICLE);
    await hydrated(page);
    await expect(modeLabel(page)).toBeHidden();
    await goto(page, '/definitely-not-a-page');
    await hydrated(page);
    await expect(modeLabel(page)).toBeHidden();
  });

  test('a flash does not follow the visitor to the next page: navigating right after an activation shows nothing', async ({ visit }) => {
    // Real timers on purpose: client-side navigation cannot be driven under a paused fake clock (webpack's chunk-load
    // timeout is a timer). Whether the 2 s timer is still pending or already spent, the new page must start clean.
    const page = await visit({ time: '10:00:00' });
    const errors = watchErrors(page);
    await goto(page, '/');
    await hydrated(page);
    await toggle(page).click();
    await parkPointer(page);
    await expect(modeLabel(page)).toBeVisible();
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await hydrated(page);
    await expect(modeLabel(page)).toBeHidden(); // the remounted toggle starts with no label
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    expect(realErrors(errors)).toEqual([]);
  });

  test('pre-hydration text is "Auto"', async ({ visit }) => {
    const page = await visit({ blockScripts: true });
    await goto(page, '/');
    await expect(toggle(page)).toBeDisabled();
    await expect(modeLabel(page)).toHaveText('Auto');
    await expect(modeLabel(page)).toBeHidden();
  });

  test.describe('text per mode', () => {
    const cases: Array<[string, string, Record<string, string>, string]> = [
      ['Auto by day', '10:00:00', {}, 'Auto · light now'],
      ['Auto by night', '22:00:00', {}, 'Auto · dark now'],
      ['Auto at exactly 06:00', '06:00:00', {}, 'Auto · light now'],
      ['Auto at exactly 18:00', '18:00:00', {}, 'Auto · dark now'],
      ['Light at night', '22:00:00', MODE_STORAGE('light'), 'Light'],
      ['Dark by day', '10:00:00', MODE_STORAGE('dark'), 'Dark'],
    ];
    for (const [name, time, storage, text] of cases) {
      test(`${name}: "${text}"`, async ({ visit }) => {
        const page = await visit({ time, storage });
        await goto(page, '/');
        await hydrated(page);
        await expect(modeLabel(page)).toHaveText(text);
        await toggle(page).hover();
        await expect(modeLabel(page)).toBeVisible();
        await expect(modeLabel(page)).toHaveText(text);
      });
    }

    test('the text follows each activation through the whole cycle', async ({ visit }) => {
      const page = await pausedPage(visit, { start: '10:00:00', pauseAt: '10:30:00' });
      await expect(modeLabel(page)).toHaveText('Auto · light now');
      for (const text of ['Light', 'Dark', 'Auto · light now', 'Light']) {
        await toggle(page).click();
        await expect(modeLabel(page)).toHaveText(text);
        await expect(modeLabel(page)).toBeVisible();
      }
    });

    test('Auto text flips live with the theme at 17:59:50 -> 18:00 while the label is showing', async ({ visit }) => {
      const page = await pausedPage(visit, { start: '17:55:00', pauseAt: '17:59:50' });
      await toggle(page).hover();
      await expect(modeLabel(page)).toBeVisible();
      await expect(modeLabel(page)).toHaveText('Auto · light now');
      await page.clock.runFor(9_000);
      await expect(modeLabel(page)).toHaveText('Auto · light now');
      await page.clock.runFor(2_000);
      await expect(modeLabel(page)).toHaveText('Auto · dark now');
      await expect(modeLabel(page)).toBeVisible();
      await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    });

    test('Auto text flips live with the theme at 05:59:50 -> 06:00 while the label is showing', async ({ visit }) => {
      const page = await pausedPage(visit, { start: '05:55:00', pauseAt: '05:59:50' });
      await toggle(page).hover();
      await expect(modeLabel(page)).toHaveText('Auto · dark now');
      await page.clock.runFor(9_000);
      await expect(modeLabel(page)).toHaveText('Auto · dark now');
      await page.clock.runFor(2_000);
      await expect(modeLabel(page)).toHaveText('Auto · light now');
    });

    test('a stored Light or Dark label does not change across a boundary', async ({ visit }) => {
      const page = await pausedPage(visit, { start: '17:55:00', pauseAt: '17:59:50', storage: MODE_STORAGE('light') });
      await page.clock.runFor(20_000);
      await expect(modeLabel(page)).toHaveText('Light');
    });
  });

  test.describe('when it is visible (desktop, hover-capable pointer)', () => {
    test('precondition: the default desktop context is hover-capable', async ({ visit }) => {
      const page = await visit();
      await goto(page, '/');
      expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(true);
    });

    test('appears on hover and hides when the pointer leaves (no timer involved)', async ({ visit }) => {
      const page = await pausedPage(visit);
      await expect(modeLabel(page)).toBeHidden();
      await toggle(page).hover();
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(10_000); // hover has no timeout
      await expect(modeLabel(page)).toBeVisible();
      await parkPointer(page);
      await expect(modeLabel(page)).toBeHidden();
      // Hovering the season button or the label's own area does not count.
      await seasonButton(page).hover();
      await expect(modeLabel(page)).toBeHidden();
    });

    test('appears on keyboard focus (Tab) and hides on blur', async ({ visit }) => {
      const page = await pausedPage(visit);
      let reached = false;
      for (let i = 0; i < 30 && !reached; i += 1) {
        await page.keyboard.press('Tab');
        reached = await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle') ?? false);
      }
      expect(reached).toBe(true);
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(10_000);
      await expect(modeLabel(page)).toBeVisible(); // focus has no timeout either
      await page.keyboard.press('Tab');
      await expect(toggle(page)).not.toBeFocused();
      await expect(modeLabel(page)).toBeHidden();
      await page.keyboard.press('Shift+Tab');
      await expect(toggle(page)).toBeFocused();
      await expect(modeLabel(page)).toBeVisible();
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());
      await expect(modeLabel(page)).toBeHidden();
    });

    test('a click shows it for about two seconds: visible at +1.9 s, hidden at +2.1 s, even though the click focuses the button', async ({ visit }) => {
      const page = await pausedPage(visit);
      await toggle(page).click();
      await parkPointer(page); // end the hover so only the flash can keep it visible
      await expect(modeLabel(page)).toBeVisible();
      await expect(modeLabel(page)).toHaveText('Light');
      await page.clock.runFor(1_900);
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(200);
      await expect(modeLabel(page)).toBeHidden(); // a mouse click must not leave it stuck via :focus
      await expect(toggle(page)).toBeFocused(); // the button still has (non-visible) focus, which is what is being ruled out
    });

    for (const key of ['Enter', 'Space'] as const) {
      test(`${key} shows it for about two seconds: visible at +1.9 s, hidden at +2.1 s once focus is gone`, async ({ visit }) => {
        const page = await pausedPage(visit);
        let reached = false;
        for (let i = 0; i < 30 && !reached; i += 1) {
          await page.keyboard.press('Tab');
          reached = await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle') ?? false);
        }
        expect(reached).toBe(true);
        await page.keyboard.press(key);
        await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
        await expect(modeLabel(page)).toHaveText('Light');
        await expect(modeLabel(page)).toBeVisible();
        // While the button keeps keyboard focus the label legitimately stays (focus-visible); drop focus to isolate the timer.
        await page.evaluate(() => (document.activeElement as HTMLElement).blur());
        await expect(modeLabel(page)).toBeVisible();
        await page.clock.runFor(1_900);
        await expect(modeLabel(page)).toBeVisible();
        await page.clock.runFor(200);
        await expect(modeLabel(page)).toBeHidden();
      });
    }

    test('with keyboard focus kept on the button the label stays visible after the flash, and hides on blur', async ({ visit }) => {
      const page = await pausedPage(visit);
      for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle'))); i += 1) await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.clock.runFor(FLASH_MS + 500);
      await expect(modeLabel(page)).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(modeLabel(page)).toBeHidden();
    });

    test('a second activation restarts the two-second timer', async ({ visit }) => {
      const page = await pausedPage(visit);
      await toggle(page).click();
      await page.clock.runFor(1_500);
      await toggle(page).click();
      await parkPointer(page);
      await expect(modeLabel(page)).toHaveText('Dark');
      await page.clock.runFor(1_500); // 3.0 s after the first activation, 1.5 s after the second
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(400); // 1.9 s after the second
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(200); // 2.1 s after the second
      await expect(modeLabel(page)).toBeHidden();
    });

    test('rapid activations leave exactly one timer: the label is gone two seconds after the last one', async ({ visit }) => {
      const page = await pausedPage(visit);
      for (let i = 0; i < 6; i += 1) {
        await toggle(page).click();
        await page.clock.runFor(300);
      }
      await parkPointer(page);
      await page.clock.runFor(1_600); // 1.9 s after the last
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(200);
      await expect(modeLabel(page)).toBeHidden();
      await page.clock.runFor(10_000);
      await expect(modeLabel(page)).toBeHidden();
    });

    test('the pointer resting on the button after a click keeps it visible (hover) and it hides when the pointer leaves', async ({ visit }) => {
      const page = await pausedPage(visit);
      await toggle(page).click();
      await page.clock.runFor(FLASH_MS + 500);
      await expect(modeLabel(page)).toBeVisible(); // still hovered
      await parkPointer(page);
      await expect(modeLabel(page)).toBeHidden();
    });
  });

  test.describe('touch (hover: none)', () => {
    test('precondition: the emulated phone has no hover', async ({ visit }) => {
      const page = await visit({ touch: true, viewport: { width: 390, height: 844 } });
      await goto(page, '/');
      const media = await page.evaluate(() => ({ hover: matchMedia('(hover: hover)').matches, none: matchMedia('(hover: none)').matches, coarse: matchMedia('(pointer: coarse)').matches }));
      expect(media).toEqual({ hover: false, none: true, coarse: true });
    });

    test('a tap shows the label for about two seconds and nothing is stuck afterwards', async ({ visit }) => {
      const page = await pausedPage(visit, { touch: true, viewport: { width: 390, height: 844 } });
      await expect(modeLabel(page)).toBeHidden();
      await toggle(page).tap();
      await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
      await expect(modeLabel(page)).toBeVisible();
      await expect(modeLabel(page)).toHaveText('Light');
      await page.clock.runFor(1_900);
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(200);
      await expect(modeLabel(page)).toBeHidden();
      // Sticky touch :hover / :focus must not bring it back, and a tap elsewhere changes nothing.
      await page.clock.runFor(5_000);
      await expect(modeLabel(page)).toBeHidden();
      await page.getByRole('heading', { level: 1 }).first().tap();
      await expect(modeLabel(page)).toBeHidden();
    });

    test('a second tap restarts the timer and shows the new mode', async ({ visit }) => {
      const page = await pausedPage(visit, { touch: true, viewport: { width: 390, height: 844 } });
      await toggle(page).tap();
      await page.clock.runFor(1_500);
      await toggle(page).tap();
      await expect(modeLabel(page)).toHaveText('Dark');
      await page.clock.runFor(1_500);
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(600);
      await expect(modeLabel(page)).toBeHidden();
    });

    test('no label on a touch device after loading or navigating', async ({ visit }) => {
      const page = await visit({ touch: true, viewport: { width: 390, height: 844 } });
      await goto(page, '/');
      await hydrated(page);
      await expect(modeLabel(page)).toBeHidden();
      await page.getByRole('link', { name: 'Blog' }).first().tap();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await hydrated(page);
      await expect(modeLabel(page)).toBeHidden();
    });
  });

  test.describe('one header label at a time, with the season toggle', () => {
    /** How many of the two labels are displayed right now. */
    const shownLabels = (page: Page) =>
      page.evaluate(() => Array.from(document.querySelectorAll('.theme-toggle-label, .season-toggle-label')).filter((label) => getComputedStyle(label).display !== 'none').map((label) => label.className));

    test('pressing one toggle while the other label is flashing swaps them: never two labels', async ({ visit }) => {
      const page = await pausedPage(visit);
      await toggle(page).click();
      await parkPointer(page);
      expect(await shownLabels(page)).toEqual(['theme-toggle-label']);
      await pressSeason(page);
      await parkPointer(page);
      await expect(seasonLabel(page)).toBeVisible();
      await expect(modeLabel(page)).toBeHidden();
      expect(await shownLabels(page)).toEqual(['season-toggle-label']);
      await toggle(page).click();
      await parkPointer(page);
      await expect(modeLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toBeHidden();
      expect(await shownLabels(page)).toEqual(['theme-toggle-label']);
      // The superseded label's timer is gone: after two seconds nothing at all is showing, and nothing comes back.
      await page.clock.runFor(1_900);
      expect(await shownLabels(page)).toEqual(['theme-toggle-label']);
      await page.clock.runFor(200);
      expect(await shownLabels(page)).toEqual([]);
      await page.clock.runFor(5_000);
      expect(await shownLabels(page)).toEqual([]);
    });

    test('hovering the other button replaces a flashing label; hover and focus never stack', async ({ visit }) => {
      const page = await pausedPage(visit);
      await pressSeason(page);
      await parkPointer(page);
      await expect(seasonLabel(page)).toBeVisible();
      await toggle(page).hover();
      await expect(modeLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toBeHidden();
      expect(await shownLabels(page)).toEqual(['theme-toggle-label']);
      await seasonButton(page).hover();
      await expect(seasonLabel(page)).toBeVisible();
      await expect(modeLabel(page)).toBeHidden();
      await parkPointer(page);
      // Keyboard: focusing the season toggle while the theme label is flashing.
      await toggle(page).click();
      await parkPointer(page);
      await expect(modeLabel(page)).toBeVisible();
      for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('season-toggle'))); i += 1) await page.keyboard.press('Tab');
      await expect(seasonButton(page)).toBeFocused();
      await expect(seasonLabel(page)).toBeVisible();
      await expect(modeLabel(page)).toBeHidden();
      expect(await shownLabels(page)).toEqual(['season-toggle-label']);
      await page.keyboard.press('Tab'); // on to the theme toggle
      await expect(toggle(page)).toBeFocused();
      await expect(modeLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toBeHidden();
      expect(await shownLabels(page)).toEqual(['theme-toggle-label']);
    });

    test('touch: tapping one then the other shows only the latest label for about two seconds', async ({ visit }) => {
      const page = await pausedPage(visit, { touch: true, viewport: { width: 390, height: 844 } });
      await seasonButton(page).tap();
      await expect(seasonLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toHaveText('Wet season');
      expect(await shownLabels(page)).toEqual(['season-toggle-label']);
      await page.clock.runFor(1_000);
      await toggle(page).tap();
      await expect(modeLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toBeHidden();
      expect(await shownLabels(page)).toEqual(['theme-toggle-label']);
      await page.clock.runFor(1_900);
      await expect(modeLabel(page)).toBeVisible();
      await page.clock.runFor(200);
      expect(await shownLabels(page)).toEqual([]);
      await page.clock.runFor(5_000);
      expect(await shownLabels(page)).toEqual([]);
    });

    test('at every step of a mixed sequence at most one label is displayed', async ({ visit }) => {
      const page = await pausedPage(visit);
      const steps: Array<() => Promise<void>> = [
        () => pressSeason(page),
        () => toggle(page).click(),
        () => seasonButton(page).hover(),
        () => toggle(page).hover(),
        () => parkPointer(page),
        () => pressSeason(page),
        () => page.keyboard.press('Tab'),
        () => page.keyboard.press('Shift+Tab'),
        () => page.clock.runFor(700),
        () => toggle(page).click(),
        () => page.clock.runFor(2_100),
      ];
      for (let index = 0; index < steps.length; index += 1) {
        await steps[index]();
        const shown = await shownLabels(page);
        expect(shown.length, `after step ${index}: ${shown.join(', ')}`).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe('layout (SC-006, SC-007)', () => {
    for (const width of [390, 768, 1440]) {
      for (const theme of ['light', 'dark'] as const) {
        for (const season of ['none', 'winter'] as const) {
          test(`${theme} at ${width}px${season === 'winter' ? ' with the winter season' : ''}: shown vs hidden changes no position or height; the label is inside the viewport`, async ({ visit }) => {
            const viewport = { width, height: width === 390 ? 844 : 900 };
            const page = await visit({ viewport, storage: MODE_STORAGE(theme), ...(season === 'winter' ? { season: 'winter' as const } : {}) });
            for (const route of ['/', ARTICLE]) {
              await goto(page, route);
              await hydrated(page);
              await expectTheme(page, theme);
              await expect(modeLabel(page)).toBeHidden();
              const hidden = await boxes(page);
              await toggle(page).hover();
              await expect(modeLabel(page)).toBeVisible();
              const shown = await boxes(page);
              expect(shown, `${route}: geometry with the label showing`).toEqual(hidden);
              await inside(modeLabel(page), viewport);
              await noOverflow(page);
              const label = (await modeLabel(page).boundingBox())!;
              const control = (await toggle(page).boundingBox())!;
              expect(label.y, 'label sits below the toggle').toBeGreaterThanOrEqual(control.y + control.height);
              expect(Math.abs(label.x + label.width - (control.x + control.width)), 'right-aligned to the toggle').toBeLessThanOrEqual(1);
              await parkPointer(page);
              await expect(modeLabel(page)).toBeHidden();
              expect(await boxes(page), `${route}: geometry after the label hides`).toEqual(hidden);
            }
          });
        }
      }
    }

    for (const width of [390, 768, 1440]) {
      for (const season of ['none', 'winter'] as const) {
        test(`${width}px${season === 'winter' ? ' winter' : ''}: a click through the label's centre reaches the element underneath`, async ({ visit }) => {
          const viewport = { width, height: width === 390 ? 844 : 900 };
          const page = await pausedPage(visit, { viewport, ...(season === 'winter' ? { season: 'winter' as const } : {}) });
          await page.evaluate(() => {
            const clicks: string[] = [];
            (window as unknown as { __clicks: string[] }).__clicks = clicks;
            window.addEventListener(
              'click',
              (event) => {
                event.preventDefault();
                const target = event.target as Element;
                clicks.push(`${target.tagName.toLowerCase()}.${target.className}|label=${!!target.closest('.theme-toggle-label')}|toggle=${!!target.closest('.theme-toggle')}`);
              },
              true,
            );
          });
          await toggle(page).click();
          await expect(modeLabel(page)).toBeVisible();
          const before = await boxes(page);
          const label = (await modeLabel(page).boundingBox())!;
          await inside(modeLabel(page), viewport);
          await noOverflow(page);
          const cx = label.x + label.width / 2;
          const cy = label.y + label.height / 2;
          const underneath = await page.evaluate(([x, y]) => {
            const element = document.elementFromPoint(x, y)!;
            return { tag: element.tagName.toLowerCase(), cls: String(element.className), inLabel: !!element.closest('.theme-toggle-label') };
          }, [cx, cy]);
          expect(underneath.inLabel, 'hit-testing must pass through the label').toBe(false);
          await page.evaluate(() => ((window as unknown as { __clicks: string[] }).__clicks.length = 0));
          await page.mouse.click(cx, cy);
          const clicks = await page.evaluate(() => (window as unknown as { __clicks: string[] }).__clicks);
          expect(clicks).toHaveLength(1);
          expect(clicks[0]).toContain('label=false');
          expect(clicks[0]).toContain(`${underneath.tag}.${underneath.cls}`);
          expect(clicks[0], 'a click on the label must not activate the toggle').toContain('toggle=false');
          await expect(toggle(page)).toHaveAccessibleName(NAMES.light); // still the mode from the single first click
          expect(await boxes(page)).toEqual(before);
        });
      }
    }

    for (const theme of ['light', 'dark'] as const) {
      test(`${theme}: the label's text on its own fill is at least 4.5:1 in all six seasons; flat (no border, shadow or image)`, async ({ visit }) => {
        const failures: string[] = [];
        for (const season of SEASON_IDS) {
          const page = await visit({ storage: MODE_STORAGE(theme), season });
          await goto(page, '/');
          await hydrated(page);
          await expectTheme(page, theme);
          await expect(html(page)).toHaveAttribute('data-season', season);
          await toggle(page).hover();
          await expect(modeLabel(page)).toBeVisible();
          // Read the label's own computed colours at test time; no particular token is assumed for either.
          const style = await modeLabel(page).evaluate((node) => {
            const computed = getComputedStyle(node);
            return {
              color: computed.color,
              background: computed.backgroundColor,
              opacity: computed.opacity,
              borderWidths: [computed.borderTopWidth, computed.borderRightWidth, computed.borderBottomWidth, computed.borderLeftWidth],
              borderStyles: [computed.borderTopStyle, computed.borderRightStyle, computed.borderBottomStyle, computed.borderLeftStyle],
              outlineStyle: computed.outlineStyle,
              boxShadow: computed.boxShadow,
              backgroundImage: computed.backgroundImage,
              filter: computed.filter,
            };
          });
          expect(style.opacity, `${season}/${theme}: opacity`).toBe('1');
          expect(style.background, `${season}/${theme}: the fill must be opaque (alpha 1)`).toMatch(/^rgb\(/);
          expect(style.color, `${season}/${theme}: text colour must be opaque`).toMatch(/^rgb\(/);
          expect(style.borderWidths.every((width) => parseFloat(width) === 0), `${season}/${theme}: no border width (${style.borderWidths.join(' ')})`).toBe(true);
          expect(style.boxShadow, `${season}/${theme}: no box-shadow`).toBe('none');
          expect(style.backgroundImage, `${season}/${theme}: no background-image`).toBe('none');
          expect(style.filter, `${season}/${theme}: no filter`).toBe('none');
          const ratio = contrast(style.color, style.background);
          if (ratio < 4.5) failures.push(`${season}/${theme}: ${style.color} on ${style.background} = ${ratio.toFixed(2)}`);
          await page.context().close();
        }
        expect(failures).toEqual([]);
      });
    }
  });

  test('runtime health: no console errors, warnings or hydration warnings across hover, focus, clicks, keys, navigation and a phone tap', async ({ visit }) => {
    // Phase 1, fake clock: label interactions around a boundary (no navigation: see the note on the flash test).
    const paused = await pausedPage(visit, { start: '17:55:00', pauseAt: '17:59:50' });
    const pausedErrors = watchErrors(paused);
    await paused.reload({ waitUntil: 'load' }); // hydrate again with the watcher attached
    await hydrated(paused);
    await toggle(paused).hover();
    await expect(modeLabel(paused)).toHaveText('Auto · light now');
    await paused.clock.runFor(11_000);
    await expect(modeLabel(paused)).toHaveText('Auto · dark now');
    await parkPointer(paused);
    await toggle(paused).click();
    await paused.clock.runFor(FLASH_MS + 100);
    await seasonButton(paused).click();
    await paused.keyboard.press('Escape');
    expect(realErrors(pausedErrors)).toEqual([]);

    // Phase 2, real timers: navigation while a label timer is pending, keyboard, season menu, 404.
    const page = await visit({ time: '10:00:00' });
    const errors = watchErrors(page);
    await goto(page, '/');
    await hydrated(page);
    await toggle(page).hover();
    await parkPointer(page);
    await toggle(page).click();
    await page.getByRole('link', { name: 'Blog' }).first().click(); // unmounts the toggle while its timer may still be pending
    await expect(page).toHaveURL(/\/blog\/?$/);
    await hydrated(page);
    for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle'))); i += 1) await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await seasonButton(page).click();
    await page.keyboard.press('Escape');
    await goto(page, '/definitely-not-a-page');
    await hydrated(page);
    expect(realErrors(errors)).toEqual([]);

    // Phase 3: a phone tap, with the real ~2 s timer.
    const phone = await visit({ touch: true, viewport: { width: 390, height: 844 } });
    const phoneErrors = watchErrors(phone);
    await goto(phone, '/');
    await hydrated(phone);
    await toggle(phone).tap();
    await expect(modeLabel(phone)).toBeVisible();
    await expect(modeLabel(phone)).toBeHidden({ timeout: 6_000 });
    expect(realErrors(phoneErrors)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 14. FR-013 - icon animation

type IconStart = {
  type: 'start';
  which: 'season' | 'theme';
  target: string;
  svgCount: number;
  running: number;
  duration: number;
  easing: string;
  fill: string;
  properties: string[];
  disabled: boolean;
  hittable: boolean;
  label: string;
  dataAnimate: string | null;
  button: number[];
  headerHeight: number;
};
const iconEvents = (page: Page) => page.evaluate(() => (window as unknown as { __iconAnim: Array<{ type: string }> }).__iconAnim);
const iconStarts = async (page: Page) => ((await iconEvents(page)).filter((event) => event.type === 'start') as unknown as IconStart[]).filter((start) => start.which === 'theme');
const seasonIconStarts = async (page: Page) => ((await iconEvents(page)).filter((event) => event.type === 'start') as unknown as IconStart[]).filter((start) => start.which === 'season');
const iconEnds = async (page: Page) => (await iconEvents(page)).filter((event) => event.type === 'end').length;
const maxRunning = (page: Page) => page.evaluate(() => (window as unknown as { __iconMaxRunning: number }).__iconMaxRunning);
/** Two animation frames: anything that was going to start on the last change has started. */
const settleFrames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

/** Real rendering frames (IntersectionObserver callbacks), usable while Playwright's fake requestAnimationFrame is paused. */
const realFrames = (page: Page) =>
  page.evaluate(async () => {
    for (let i = 0; i < 3; i += 1) {
      await new Promise<void>((resolve) => {
        const observer = new IntersectionObserver(() => {
          observer.disconnect();
          resolve();
        });
        observer.observe(document.body);
      });
    }
  });

async function iconAtRest(page: Page) {
  // data-animate is set by an effect one tick after the click; let it be set (or not) before waiting for it to clear.
  await settleFrames(page);
  await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
  const rest = await toggle(page).evaluate((node) => {
    const svg = node.querySelector('svg')!;
    const style = getComputedStyle(svg);
    const box = svg.getBoundingClientRect();
    return {
      svgCount: node.querySelectorAll('svg').length,
      opacity: style.opacity,
      transform: style.transform,
      animationName: style.animationName,
      animations: svg.getAnimations().length,
      size: [Math.round(box.width), Math.round(box.height)],
      display: style.display,
      visibility: style.visibility,
    };
  });
  expect(rest).toMatchObject({ svgCount: 1, opacity: '1', transform: 'none', animationName: 'none', animations: 0, size: [20, 20], display: 'block', visibility: 'visible' });
}

async function reachToggleByTab(page: Page) {
  for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('theme-toggle'))); i += 1) await page.keyboard.press('Tab');
  await expect(toggle(page)).toBeFocused();
}

test.describe('icon animation (FR-013)', () => {
  test('nothing animates on load, reload, stored modes, or client-side navigation (including the remount)', async ({ visit }) => {
    for (const storage of [{}, MODE_STORAGE('light'), MODE_STORAGE('dark')]) {
      const page = await visit({ iconRecorder: true, storage, time: '10:00:00' });
      await goto(page, '/');
      await hydrated(page);
      await settleFrames(page);
      expect(await iconStarts(page), `load with ${JSON.stringify(storage)}`).toEqual([]);
      await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
      await page.reload({ waitUntil: 'load' });
      await hydrated(page);
      await settleFrames(page);
      expect(await iconStarts(page), 'reload').toEqual([]);

      // Client-side navigation keeps the document (and the recorder) and remounts the toggle in each layout.
      await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
      const link = (name: string | RegExp) => page.getByRole('link', { name }).first();
      await link('Blog').click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await hydrated(page);
      await settleFrames(page);
      await page.getByRole('link', { name: /Fixture Newest/ }).click();
      await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
      await hydrated(page);
      await settleFrames(page);
      await page.getByRole('link', { name: 'Back to blog' }).click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await hydrated(page);
      await page.getByRole('link', { name: /portfolio|home/i }).first().click();
      await expect(page).toHaveURL(/\/$/);
      await hydrated(page);
      await settleFrames(page);
      expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload), 'no full reload happened').toBe(true);
      expect(await iconStarts(page), `client-side navigation with ${JSON.stringify(storage)}`).toEqual([]);
      await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
      await iconAtRest(page);
      await page.context().close();
    }
  });

  test('a mode set before the activation but changed in the same view animates only the change, not the remount after navigating', async ({ visit }) => {
    const page = await visit({ iconRecorder: true, time: '10:00:00' });
    await goto(page, '/');
    await hydrated(page);
    await toggle(page).click();
    await expect.poll(async () => (await iconStarts(page)).length).toBe(1);
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await hydrated(page);
    await settleFrames(page);
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    expect(await iconStarts(page), 'only the click animated; the remounted toggle stayed still').toHaveLength(1);
    await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
  });

  for (const how of ['click', 'Enter', 'Space'] as const) {
    test(`${how}: exactly one theme-icon-in on the new svg, under 240 ms, transform and opacity only, then the icon is at rest`, async ({ visit }) => {
      const page = await visit({ iconRecorder: true, time: '10:00:00' });
      await goto(page, '/');
      await hydrated(page);
      if (how !== 'click') await reachToggleByTab(page);
      const before = await boxes(page);
      const names = [NAMES.light, NAMES.dark, NAMES.autoLight];
      const shapes = new Set<string>([await toggle(page).evaluate((node) => node.querySelector('svg')!.innerHTML)]);
      for (let activation = 1; activation <= 3; activation += 1) {
        if (how === 'click') await toggle(page).click();
        else await page.keyboard.press(how);
        await expect.poll(async () => (await iconStarts(page)).length, { message: `animationstart after activation ${activation}` }).toBe(activation);
        await expect.poll(() => iconEnds(page), { message: `animationend after activation ${activation}` }).toBe(activation);
        await expect(toggle(page)).toHaveAccessibleName(names[activation - 1]);
        await iconAtRest(page);
        shapes.add(await toggle(page).evaluate((node) => node.querySelector('svg')!.innerHTML));
      }
      const starts = await iconStarts(page);
      expect(starts).toHaveLength(3);
      for (const start of starts) {
        expect(start.target).toBe('svg');
        expect(start.svgCount, 'exactly one svg while animating').toBe(1);
        expect(start.running, 'exactly one running theme-icon-in').toBe(1);
        expect(start.duration).toBeGreaterThan(0);
        expect(start.duration).toBeLessThanOrEqual(240);
        expect(start.properties, 'only compositor properties').toEqual(['opacity', 'transform']);
        expect(start.fill, 'no fill mode: the end state is the plain icon').toBe('none');
        expect(start.dataAnimate).toBe('true');
        expect(start.disabled, 'button stays enabled').toBe(false);
        expect(start.hittable, 'button stays hit-testable').toBe(true);
        expect(start.button, 'button does not move').toEqual(before.theme);
        expect(start.headerHeight, 'header height unchanged').toBe(before.header[3]);
      }
      expect(starts.map((start) => start.label), 'accessible name already updated when the animation starts').toEqual(names);
      expect(shapes.size, 'the icon changed between sun and moon').toBeGreaterThanOrEqual(2);
      expect(await maxRunning(page)).toBeLessThanOrEqual(1);
      expect(await iconStarts(page), 'no extra animation after settling').toHaveLength(3);
      expect(await boxes(page)).toEqual(before);
    });
  }

  test('rapid repeated clicks end in a clean state: one svg, visible, no stuck data-animate, never two animations at once', async ({ visit }) => {
    const page = await visit({ iconRecorder: true, time: '10:00:00' });
    await goto(page, '/');
    await hydrated(page);
    for (let i = 0; i < 9; i += 1) await toggle(page).click(); // nine activations: back to Auto after three full cycles
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
    await iconAtRest(page);
    expect(await maxRunning(page)).toBeLessThanOrEqual(1);
    const starts = await iconStarts(page);
    expect(starts.length).toBeGreaterThanOrEqual(1);
    expect(starts.length).toBeLessThanOrEqual(9);
    for (const start of starts) {
      expect(start.running).toBe(1);
      expect(start.svgCount).toBe(1);
      expect(start.properties).toEqual(['opacity', 'transform']);
    }
    // Still fully working afterwards.
    await toggle(page).click();
    await expect(toggle(page)).toHaveAccessibleName(NAMES.light);
    await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
    await iconAtRest(page);
  });

  test('activations from a script in the same task (faster than any frame) still leave a clean state', async ({ visit }) => {
    const page = await visit({ iconRecorder: true, time: '10:00:00' });
    await goto(page, '/');
    await hydrated(page);
    await toggle(page).evaluate((node) => {
      for (let i = 0; i < 7; i += 1) (node as HTMLButtonElement).click();
    });
    // Scripted clicks inside one task all see the same rendered mode (React flushes between tasks), so only the end state is asserted.
    await expect(toggle(page)).toHaveAccessibleName(/^Theme: (Auto \(currently (light|dark)\)|Light|Dark)$/);
    await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
    await iconAtRest(page);
    expect(await maxRunning(page)).toBeLessThanOrEqual(1);
  });

  test('a mode change made in another tab animates once in the following tab', async ({ visit }) => {
    const a = await visit({ iconRecorder: true, time: '10:00:00' });
    const b = await a.context().newPage();
    await goto(a, '/');
    await goto(b, '/blog');
    await hydrated(a);
    await hydrated(b);
    await settleFrames(b);
    expect(await iconStarts(b)).toEqual([]);

    await toggle(a).click();
    await expect(toggle(b)).toHaveAccessibleName(NAMES.light);
    await expect.poll(async () => (await iconStarts(b)).length, { message: 'tab B animates the followed change' }).toBe(1);
    await expect.poll(() => iconEnds(b)).toBe(1);
    await iconAtRest(b);
    await settleFrames(b);
    const started = await iconStarts(b);
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ target: 'svg', svgCount: 1, running: 1, properties: ['opacity', 'transform'], label: NAMES.light, disabled: false });
    expect(started[0].duration).toBeLessThanOrEqual(240);
    // The tab that was clicked animated once as well, and the echo between the tabs did not add more.
    await expect.poll(async () => (await iconStarts(a)).length).toBe(1);
    await toggle(a).click();
    await expect(toggle(b)).toHaveAccessibleName(NAMES.dark);
    await expect.poll(async () => (await iconStarts(b)).length).toBe(2);
    await expect.poll(() => iconEnds(b)).toBe(2);
    await settleFrames(b);
    expect(await iconStarts(b)).toHaveLength(2);
    expect(await iconStarts(a)).toHaveLength(2);
  });

  test('the live 18:00 flip in Auto changes the theme without animating the icon', async ({ visit }) => {
    const page = await visit({ clock: 'install', time: '17:55:00', iconRecorder: true });
    await goto(page, '/');
    await hydrated(page);
    await page.clock.pauseAt(instant('17:59:50'));
    const sunShape = await toggle(page).evaluate((node) => node.querySelector('svg')!.innerHTML);
    await page.clock.runFor(11_000);
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    await realFrames(page);
    expect(await iconStarts(page)).toEqual([]);
    await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
    expect(await toggle(page).evaluate((node) => node.querySelector('svg')!.innerHTML), 'sun -> moon').not.toBe(sunShape);
    await expect(page.locator('.theme-toggle .theme-toggle-badge')).toHaveText('A'); // the sun became the moon without any animation; the badge stays
    // And the 06:00 flip the next morning.
    await page.clock.fastForward('12:00:00');
    await expectTheme(page, 'light');
    await realFrames(page);
    expect(await iconStarts(page)).toEqual([]);
  });

  test('reduced motion: no animation at all and no animation event, yet the icon swaps and the name updates', async ({ visit }) => {
    const page = await visit({ iconRecorder: true, reducedMotion: 'reduce', time: '10:00:00' });
    await goto(page, '/');
    await hydrated(page);
    const shapes: string[] = [];
    for (const name of [NAMES.light, NAMES.dark, NAMES.autoLight]) {
      await toggle(page).click();
      await expect(toggle(page)).toHaveAccessibleName(name);
      const state = await toggle(page).evaluate((node) => {
        const svg = node.querySelector('svg')!;
        const style = getComputedStyle(svg);
        return { animations: document.getAnimations().length, animationName: style.animationName, opacity: style.opacity, transform: style.transform, count: node.querySelectorAll('svg').length, shape: svg.innerHTML };
      });
      expect(state).toMatchObject({ animations: 0, animationName: 'none', opacity: '1', transform: 'none', count: 1 });
      shapes.push(state.shape);
    }
    expect(new Set(shapes).size, 'the icon still changes between sun and moon').toBe(2); // sun (Light), moon (Dark), sun (Auto by day)
    await settleFrames(page);
    expect(await iconStarts(page)).toEqual([]);
    expect(await maxRunning(page)).toBe(0);
    // The attribute is only a marker: whatever the app does with it, it must not stay set.
    await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
    await iconAtRest(page);
  });

  for (const variant of ['no JavaScript', 'external scripts blocked'] as const) {
    test(`${variant}: both icons are in the markup, exactly the one matching <html> shows, the badge is there, and nothing is animating`, async ({ visit }) => {
      const page = await visit(variant === 'no JavaScript' ? { javaScriptEnabled: false, time: '10:00:00' } : { blockScripts: true, iconRecorder: true, time: '10:00:00' });
      await goto(page, '/');
      await expect(toggle(page)).toBeDisabled();
      await expect(toggle(page)).toHaveAccessibleName('Theme: Auto');
      await expect(toggle(page)).not.toHaveAttribute('data-animate', /.*/);
      const state = await toggle(page).evaluate((node) => {
        const svgs = Array.from(node.querySelectorAll('svg'));
        const visible = svgs.filter((svg) => getComputedStyle(svg).display !== 'none');
        const badge = node.querySelector('.theme-toggle-badge') as HTMLElement | null;
        return {
          classes: svgs.map((svg) => svg.getAttribute('class') ?? ''),
          hidden: svgs.map((svg) => svg.getAttribute('aria-hidden')),
          visibleCount: visible.length,
          visibleClass: visible[0]?.getAttribute('class') ?? '',
          visibleStyle: visible[0] ? { opacity: getComputedStyle(visible[0]).opacity, transform: getComputedStyle(visible[0]).transform, animationName: getComputedStyle(visible[0]).animationName, visibility: getComputedStyle(visible[0]).visibility, width: getComputedStyle(visible[0]).width, height: getComputedStyle(visible[0]).height, animations: visible[0].getAnimations().length } : null,
          root: document.documentElement.className,
          badge: badge ? { text: badge.textContent, hidden: badge.getAttribute('aria-hidden'), display: getComputedStyle(badge).display, pointer: getComputedStyle(badge).pointerEvents } : null,
          animations: document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest?.('.theme-toggle')).length, // the season's ambient particles are not the toggle's
        };
      });
      expect(state.classes.some((name) => /theme-toggle-icon-light/.test(name)), 'sun in the markup').toBe(true);
      expect(state.classes.some((name) => /theme-toggle-icon-dark/.test(name)), 'moon in the markup').toBe(true);
      expect(state.classes).toHaveLength(2);
      expect(state.hidden).toEqual(['true', 'true']);
      expect(state.visibleCount, 'exactly one icon is displayed').toBe(1);
      // No JavaScript keeps the dark design (moon); with only inline scripts the init script has already set light at 10:00 (sun).
      expect(state.visibleClass).toMatch(variant === 'no JavaScript' ? /theme-toggle-icon-dark/ : /theme-toggle-icon-light/);
      expect(state.root).toMatch(variant === 'no JavaScript' ? /\bdark\b/ : /\blight\b/);
      expect(state.visibleStyle).toEqual({ opacity: '1', transform: 'none', animationName: 'none', visibility: 'visible', width: '20px', height: '20px', animations: 0 });
      expect(state.badge).toEqual({ text: 'A', hidden: 'true', display: 'grid', pointer: 'none' });
      expect(state.animations).toBe(0);
      await expect(toggle(page)).toBeVisible();
    });
  }

  for (const width of [390, 1440]) {
    test(`${width}px: activations cause no overflow and no layout shift, and the header and both controls stay put`, async ({ visit }) => {
      const viewport = { width, height: width === 390 ? 844 : 900 };
      const page = await visit({ viewport, iconRecorder: true, time: '10:00:00' });
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
      await page.waitForLoadState('load');
      const before = await boxes(page);
      const shiftBefore = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
      for (let activation = 1; activation <= 4; activation += 1) {
        await toggle(page).click();
        await expect.poll(async () => (await iconStarts(page)).length).toBe(activation);
        await noOverflow(page);
        expect(await boxes(page), `during/after activation ${activation}`).toEqual(before);
        await inside(toggle(page), viewport);
        await expect.poll(() => iconEnds(page)).toBe(activation);
      }
      await iconAtRest(page);
      const shiftAfter = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
      expect(shiftAfter - shiftBefore).toBeLessThan(0.01);
      await noOverflow(page);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 15. FR-017, FR-018 (spec 003) and parity with FR-005/012/013 (spec 004) - the season toggle

const seasonWrap = (page: Page) => page.locator('div.season-toggle-wrap');

/** The Manila January fixture clock is dry season; pressing once gives wet. Berlin January is winter; pressing once gives spring. */
const SEASON_AUTO_NAME = 'Season: Auto (currently dry season)';

async function seasonIconState(page: Page) {
  return seasonButton(page).evaluate((node) => {
    const svgs = Array.from(node.querySelectorAll('svg'));
    const badges = Array.from(node.querySelectorAll('.season-toggle-badge'));
    const badge = badges[0] as HTMLElement | undefined;
    const box = node.getBoundingClientRect();
    const badgeBox = badge?.getBoundingClientRect();
    return {
      svgCount: svgs.length,
      svgHidden: svgs.map((svg) => svg.getAttribute('aria-hidden')),
      svgSize: svgs.map((svg) => [parseFloat(getComputedStyle(svg).width), parseFloat(getComputedStyle(svg).height)]),
      shape: svgs[0]?.innerHTML ?? '',
      badgeCount: badges.length,
      badgeText: badge?.textContent ?? null,
      badgeHidden: badge?.getAttribute('aria-hidden') ?? null,
      badgePointerEvents: badge ? getComputedStyle(badge).pointerEvents : null,
      badgeSize: badgeBox ? [Math.round(badgeBox.width), Math.round(badgeBox.height)] : null,
      badgeInside: badgeBox ? badgeBox.left >= box.left - 0.5 && badgeBox.top >= box.top - 0.5 && badgeBox.right <= box.right + 0.5 && badgeBox.bottom <= box.bottom + 0.5 : null,
      text: node.textContent,
    };
  });
}

test.describe('season toggle: markup, label, icon and badge (FR-017, FR-018; parity with spec 004)', () => {
  test('label markup: a decorative sibling inside div.season-toggle-wrap; hidden on load, after reload and after navigation', async ({ visit }) => {
    const page = await visit({ time: '10:00:00' });
    await goto(page, '/');
    await expect(seasonLabel(page)).toBeHidden(); // pre-hydration
    await hydrated(page);
    await expect(seasonLabel(page)).toBeHidden();
    const facts = await page.evaluate(() => {
      const wrap = document.querySelector('div.season-toggle-wrap')!;
      const label = document.querySelector('span.season-toggle-label') as HTMLElement;
      const style = getComputedStyle(label);
      const durations = (value: string) => value.split(',').map((part) => parseFloat(part));
      return {
        children: Array.from(wrap.children).map((child) => `${child.tagName.toLowerCase()}.${child.className}`),
        controls: Array.from(document.querySelector('.header-controls')!.children).map((child) => child.className),
        ariaHidden: label.getAttribute('aria-hidden'),
        tabindex: label.getAttribute('tabindex'),
        focusableInside: label.querySelectorAll('a, button, input, select, textarea, [tabindex]').length,
        pointerEvents: style.pointerEvents,
        position: style.position,
        display: style.display,
        transitions: durations(style.transitionDuration),
        animationName: style.animationName,
        animationDurations: durations(style.animationDuration),
        labelCount: document.querySelectorAll('.season-toggle-label').length,
      };
    });
    expect(facts.children).toEqual(['button.season-toggle', 'span.season-toggle-label']);
    expect(facts.controls).toEqual(['season-toggle-wrap', 'theme-toggle-wrap']);
    expect(facts).toMatchObject({ ariaHidden: 'true', tabindex: null, focusableInside: 0, pointerEvents: 'none', position: 'absolute', display: 'none', animationName: 'none', labelCount: 1 });
    expect(facts.transitions.every((value) => value === 0)).toBe(true);
    expect(facts.animationDurations.every((value) => value === 0)).toBe(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await hydrated(page);
    await expect(seasonLabel(page)).toBeHidden();
    await page.getByRole('link', { name: 'Blog' }).first().click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await hydrated(page);
    await expect(seasonLabel(page)).toBeHidden();
    // The label is never reachable by keyboard.
    let reachedLabel = false;
    for (let i = 0; i < 40 && !reachedLabel; i += 1) {
      await page.keyboard.press('Tab');
      reachedLabel = await page.evaluate(() => !!document.activeElement?.closest('.season-toggle-label'));
    }
    expect(reachedLabel).toBe(false);
  });

  test('label text: "Auto · <season> now" in Auto, the season name when chosen; "Auto" before hydration', async ({ visit }) => {
    const cases: Array<[string, string, string, string]> = [
      ['Asia/Manila', '2026-11-15T12:00:00Z', 'Auto · wet season now', 'Dry season'],
      ['Asia/Manila', '2026-02-15T12:00:00Z', 'Auto · dry season now', 'Wet season'],
      ['Europe/Berlin', '2026-11-15T12:00:00Z', 'Auto · autumn now', 'Winter'],
      ['Australia/Sydney', '2026-01-15T12:00:00Z', 'Auto · summer now', 'Autumn'],
    ];
    for (const [zone, now, auto, afterPress] of cases) {
      const page = await visit({ zone: zone as Zone, time: Date.parse(now) });
      await goto(page, '/');
      await hydrated(page);
      await expect(seasonLabel(page)).toHaveText(auto);
      await pressSeason(page);
      await expect(seasonLabel(page)).toHaveText(afterPress);
      await page.context().close();
    }
    const blocked = await visit({ blockScripts: true });
    await goto(blocked, '/');
    await expect(seasonLabel(blocked)).toHaveText('Auto');
    await expect(seasonLabel(blocked)).toBeHidden();
    await expect(seasonButton(blocked)).toHaveAccessibleName('Season: Auto');
    await expect(seasonButton(blocked)).toBeDisabled();
  });

  test.describe('when the label is visible (desktop)', () => {
    test('hover shows it and the pointer leaving hides it', async ({ visit }) => {
      const page = await pausedPage(visit);
      await expect(seasonLabel(page)).toBeHidden();
      await seasonButton(page).hover();
      await expect(seasonLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toHaveText('Auto · dry season now');
      await page.clock.runFor(10_000);
      await expect(seasonLabel(page)).toBeVisible();
      await parkPointer(page);
      await expect(seasonLabel(page)).toBeHidden();
    });

    test('keyboard focus shows it and blur hides it', async ({ visit }) => {
      const page = await pausedPage(visit);
      for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('season-toggle'))); i += 1) await page.keyboard.press('Tab');
      await expect(seasonButton(page)).toBeFocused();
      await expect(seasonLabel(page)).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(seasonLabel(page)).toBeHidden();
    });

    test('a click shows it for about two seconds (visible at +1.9 s, hidden at +2.1 s) and a mouse click never leaves it stuck', async ({ visit }) => {
      const page = await pausedPage(visit);
      await pressSeason(page);
      await parkPointer(page);
      await expect(seasonLabel(page)).toBeVisible();
      await expect(seasonLabel(page)).toHaveText('Wet season');
      await page.clock.runFor(1_900);
      await expect(seasonLabel(page)).toBeVisible();
      await page.clock.runFor(200);
      await expect(seasonLabel(page)).toBeHidden();
      await expect(seasonButton(page)).toBeFocused();
    });

    for (const key of ['Enter', 'Space'] as const) {
      test(`${key} shows it for about two seconds once focus is gone`, async ({ visit }) => {
        const page = await pausedPage(visit);
        for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('season-toggle'))); i += 1) await page.keyboard.press('Tab');
        await page.keyboard.press(key);
        await expect(seasonButton(page)).toHaveAccessibleName('Season: Wet season');
        await expect(seasonLabel(page)).toHaveText('Wet season');
        await page.evaluate(() => (document.activeElement as HTMLElement).blur());
        await expect(seasonLabel(page)).toBeVisible();
        await page.clock.runFor(1_900);
        await expect(seasonLabel(page)).toBeVisible();
        await page.clock.runFor(200);
        await expect(seasonLabel(page)).toBeHidden();
      });
    }

    test('a second press restarts the timer; rapid presses leave one timer', async ({ visit }) => {
      const page = await pausedPage(visit, { zone: 'Europe/Berlin', start: '10:00:00', pauseAt: '10:30:00' });
      await pressSeason(page);
      await page.clock.runFor(1_500);
      await pressSeason(page);
      await parkPointer(page);
      await page.clock.runFor(1_500);
      await expect(seasonLabel(page)).toBeVisible();
      await page.clock.runFor(600);
      await expect(seasonLabel(page)).toBeHidden();
      for (let i = 0; i < 5; i += 1) {
        await pressSeason(page);
        await page.clock.runFor(300);
      }
      await parkPointer(page);
      await page.clock.runFor(1_600);
      await expect(seasonLabel(page)).toBeVisible();
      await page.clock.runFor(200);
      await expect(seasonLabel(page)).toBeHidden();
    });
  });

  test('touch: a tap shows the label for about two seconds and nothing sticks', async ({ visit }) => {
    const page = await pausedPage(visit, { touch: true, viewport: { width: 390, height: 844 } });
    await seasonButton(page).tap();
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Wet season');
    await expect(seasonLabel(page)).toBeVisible();
    await page.clock.runFor(1_900);
    await expect(seasonLabel(page)).toBeVisible();
    await page.clock.runFor(200);
    await expect(seasonLabel(page)).toBeHidden();
    await page.clock.runFor(5_000);
    await expect(seasonLabel(page)).toBeHidden();
  });

  test('icon and badge: one aria-hidden svg after mount; the Auto badge only in Auto; each season has its own icon', async ({ visit }) => {
    const shapes: string[] = [];
    for (const season of SEASON_IDS) {
      const page = await visit({ season, time: '10:00:00' });
      await goto(page, '/');
      await hydrated(page);
      await expect(html(page)).toHaveAttribute('data-season', season);
      await expect(seasonButton(page)).toHaveAccessibleName(`Season: ${seasonName(season)}`);
      const state = await seasonIconState(page);
      expect(state, `${season}: manual choice`).toMatchObject({ svgCount: 1, svgHidden: ['true'], svgSize: [[20, 20]], badgeCount: 0, text: '' });
      shapes.push(state.shape);
      await page.context().close();
    }
    expect(new Set(shapes).size, 'six seasons, six distinct icons').toBe(6);

    for (const [zone, expectedBadge] of [['Europe/Berlin', 'winter'], ['Asia/Manila', 'dry']] as const) {
      const page = await visit({ zone, time: '10:00:00' });
      await goto(page, '/');
      await hydrated(page);
      const auto = await seasonIconState(page);
      expect(auto, `${zone}: Auto`).toMatchObject({ svgCount: 1, svgHidden: ['true'], svgSize: [[20, 20]], badgeCount: 1, badgeText: 'A', badgeHidden: 'true', badgePointerEvents: 'none', badgeSize: [16, 16], badgeInside: true });
      await expect(html(page)).toHaveAttribute('data-season', expectedBadge);
      expect(auto.shape, `${zone}: Auto shows the applied season's icon`).toBe(shapes[SEASON_IDS.indexOf(expectedBadge)]);
      await pressSeason(page);
      expect((await seasonIconState(page)).badgeCount, 'no badge once chosen').toBe(0);
      await page.context().close();
    }
  });

  test('before hydration: all seven icons are in the markup, exactly the one matching html[data-season] shows, with the badge', async ({ visit }) => {
    for (const [options, expectedClass] of [
      [{ blockScripts: true, zone: 'Europe/Berlin' as Zone }, 'season-toggle-icon-winter'],
      [{ blockScripts: true, zone: 'Asia/Manila' as Zone }, 'season-toggle-icon-dry'],
      [{ blockScripts: true, season: 'autumn' as SeasonId }, 'season-toggle-icon-autumn'],
    ] as const) {
      const page = await visit({ ...options, time: '10:00:00' });
      await goto(page, '/');
      await expect(seasonButton(page)).toBeDisabled();
      await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto');
      const state = await seasonButton(page).evaluate((node) => {
        const svgs = Array.from(node.querySelectorAll('svg'));
        const visible = svgs.filter((svg) => getComputedStyle(svg).display !== 'none');
        const badge = node.querySelector('.season-toggle-badge');
        return {
          count: svgs.length,
          hidden: svgs.every((svg) => svg.getAttribute('aria-hidden') === 'true'),
          visibleCount: visible.length,
          visibleClass: visible[0]?.getAttribute('class') ?? '',
          size: visible[0] ? [getComputedStyle(visible[0]).width, getComputedStyle(visible[0]).height] : [],
          badge: badge?.textContent ?? null,
          animations: document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest?.('.season-toggle')).length,
          animate: node.getAttribute('data-animate'),
        };
      });
      expect(state).toMatchObject({ count: 7, hidden: true, visibleCount: 1, size: ['20px', '20px'], badge: 'A', animations: 0, animate: null });
      expect(state.visibleClass).toContain(expectedClass);
      await page.context().close();
    }
  });

  test('where no season applies (UTC) the control is not displayed or exposed, and the theme toggle is unaffected', async ({ visit }) => {
    const page = await visit({ zone: 'UTC', time: '12:00:00' });
    await goto(page, '/');
    await hydrated(page);
    await expect(html(page)).not.toHaveAttribute('data-season', /.*/);
    await expect(seasonWrap(page)).toHaveCSS('display', 'none');
    await expect(page.getByRole('button', { name: /^Season:/ })).toHaveCount(0);
    await expect(seasonLabel(page)).toBeHidden();
    await expect(toggle(page)).toBeVisible();
    const viewport = { width: 1440, height: 900 };
    await inside(toggle(page), viewport);
    await noOverflow(page);
    await toggle(page).hover();
    await expect(modeLabel(page)).toBeVisible();
    const nojs = await visit({ javaScriptEnabled: false });
    await goto(nojs, '/');
    await expect(seasonWrap(nojs)).toHaveCSS('display', 'none');
    await expect(html(nojs)).not.toHaveAttribute('data-season', /.*/);
  });
});

test.describe('season toggle: icon animation (FR-013 parity)', () => {
  test('nothing animates on load, reload, stored seasons or client-side navigation; no season label or icon moves', async ({ visit }) => {
    for (const options of [{}, { season: 'winter' as SeasonId }, { season: 'wet' as SeasonId }]) {
      const page = await visit({ iconRecorder: true, time: '10:00:00', ...options });
      await goto(page, '/');
      await hydrated(page);
      await settleFrames(page);
      expect(await seasonIconStarts(page), `load ${JSON.stringify(options)}`).toEqual([]);
      await page.reload({ waitUntil: 'load' });
      await hydrated(page);
      await settleFrames(page);
      expect(await seasonIconStarts(page), 'reload').toEqual([]);
      await page.getByRole('link', { name: 'Blog' }).first().click();
      await expect(page).toHaveURL(/\/blog\/?$/);
      await hydrated(page);
      await page.getByRole('link', { name: /Fixture Newest/ }).click();
      await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
      await hydrated(page);
      await settleFrames(page);
      expect(await seasonIconStarts(page), 'client-side navigation (remount)').toEqual([]);
      expect(await iconStarts(page), 'the theme toggle did not animate either').toEqual([]);
      await expect(seasonButton(page)).not.toHaveAttribute('data-animate', /.*/);
      await page.context().close();
    }
  });

  for (const how of ['click', 'Enter', 'Space'] as const) {
    test(`${how}: exactly one theme-icon-in per press on the season svg, under 240 ms, transform and opacity only, then at rest`, async ({ visit }) => {
      const page = await visit({ iconRecorder: true, time: '10:00:00', zone: 'Europe/Berlin' }); // Berlin January: winter
      await goto(page, '/');
      await hydrated(page);
      if (how !== 'click') {
        for (let i = 0; i < 30 && !(await page.evaluate(() => document.activeElement?.classList.contains('season-toggle'))); i += 1) await page.keyboard.press('Tab');
        await expect(seasonButton(page)).toBeFocused();
      }
      const before = await boxes(page);
      const names = ['Season: Spring', 'Season: Summer', 'Season: Autumn'];
      for (let press = 1; press <= 3; press += 1) {
        if (how === 'click') await pressSeason(page);
        else await page.keyboard.press(how);
        await expect.poll(async () => (await seasonIconStarts(page)).length).toBe(press);
        await expect.poll(() => iconEnds(page)).toBe(press);
        await expect(seasonButton(page)).toHaveAccessibleName(names[press - 1]);
        await expect(seasonButton(page)).not.toHaveAttribute('data-animate', /.*/);
        const rest = await seasonButton(page).evaluate((node) => {
          const svg = node.querySelector('svg')!;
          const style = getComputedStyle(svg);
          return { count: node.querySelectorAll('svg').length, opacity: style.opacity, transform: style.transform, animations: svg.getAnimations().length };
        });
        expect(rest).toEqual({ count: 1, opacity: '1', transform: 'none', animations: 0 });
      }
      const starts = await seasonIconStarts(page);
      for (const start of starts) {
        expect(start).toMatchObject({ target: 'svg', svgCount: 1, running: 1, properties: ['opacity', 'transform'], fill: 'none', dataAnimate: 'true', disabled: false, hittable: true });
        expect(start.duration).toBeGreaterThan(0);
        expect(start.duration).toBeLessThanOrEqual(240);
        expect(start.headerHeight).toBe(before.header[3]);
      }
      expect(starts.map((start) => start.label)).toEqual(names);
      expect(await iconStarts(page), 'the theme toggle is untouched').toEqual([]);
      expect(await maxRunning(page)).toBeLessThanOrEqual(1);
      expect(await boxes(page)).toEqual(before);
    });
  }

  test('rapid presses end clean; reduced motion never animates yet swaps the icon; another tab animates once', async ({ visit }) => {
    const page = await visit({ iconRecorder: true, time: '10:00:00', zone: 'Europe/Berlin' });
    await goto(page, '/');
    await hydrated(page);
    for (let i = 0; i < 8; i += 1) await seasonButton(page).click(); // two full cycles of four
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Auto (currently winter)');
    await expect(seasonButton(page)).not.toHaveAttribute('data-animate', /.*/);
    expect(await maxRunning(page)).toBeLessThanOrEqual(1);

    const reduced = await visit({ iconRecorder: true, reducedMotion: 'reduce', time: '10:00:00', zone: 'Europe/Berlin' });
    await goto(reduced, '/');
    await hydrated(reduced);
    const before = (await seasonIconState(reduced)).shape;
    await pressSeason(reduced);
    await expect(seasonButton(reduced)).toHaveAccessibleName('Season: Spring');
    expect((await seasonIconState(reduced)).shape, 'the icon still swaps').not.toBe(before);
    await settleFrames(reduced);
    expect(await seasonIconStarts(reduced)).toEqual([]);
    expect(await reduced.evaluate(() => document.getAnimations().filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest?.('.season-toggle')).length)).toBe(0);
    await expect(seasonButton(reduced)).not.toHaveAttribute('data-animate', /.*/);

    const a = await visit({ iconRecorder: true, time: '10:00:00', zone: 'Europe/Berlin' });
    const b = await a.context().newPage();
    await goto(a, '/');
    await goto(b, '/blog');
    await hydrated(a);
    await hydrated(b);
    await pressSeason(a);
    await expect(seasonButton(b)).toHaveAccessibleName('Season: Spring');
    await expect.poll(async () => (await seasonIconStarts(b)).length).toBe(1);
    await expect.poll(() => iconEnds(b)).toBe(1);
    await settleFrames(b);
    expect(await seasonIconStarts(b)).toHaveLength(1);
  });

  test('a stored season outside the region does not animate or change anything on load', async ({ visit }) => {
    const page = await visit({ iconRecorder: true, time: '10:00:00', storage: { season: 'winter' } }); // Manila: winter does not exist there
    await goto(page, '/');
    await hydrated(page);
    await expect(html(page)).toHaveAttribute('data-season', 'dry');
    await expect(seasonButton(page)).toHaveAccessibleName(SEASON_AUTO_NAME);
    await settleFrames(page);
    expect(await seasonIconStarts(page)).toEqual([]);
  });
});

test.describe('season toggle: layout with both labels (SC-006, SC-007)', () => {
  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${theme} at ${width}px: both toggles and either label - no overflow, nothing moves, each label inside the viewport and off the other button`, async ({ visit }) => {
        const viewport = { width, height: width === 390 ? 844 : 900 };
        // Manila in November is a wet season: "Auto · wet season now" is the widest label text.
        const page = await visit({ viewport, storage: MODE_STORAGE(theme), time: Date.parse('2026-11-15T10:00:00+08:00') });
        for (const route of ['/', ARTICLE]) {
          await goto(page, route);
          await hydrated(page);
          await expectTheme(page, theme);
          await expect(seasonLabel(page)).toHaveText('Auto · wet season now');
          const resting = await boxes(page);
          const seasonBox = (await seasonButton(page).boundingBox())!;
          const themeBox = (await toggle(page).boundingBox())!;
          expect(seasonBox.x + seasonBox.width, 'season toggle sits left of the theme toggle without overlap').toBeLessThanOrEqual(themeBox.x + 0.5);
          for (const which of ['season', 'theme'] as const) {
            const control = which === 'season' ? seasonButton(page) : toggle(page);
            const label = which === 'season' ? seasonLabel(page) : modeLabel(page);
            const otherControl = which === 'season' ? toggle(page) : seasonButton(page);
            await control.hover();
            await expect(label).toBeVisible();
            expect(await boxes(page), `${route}: geometry with the ${which} label showing`).toEqual(resting);
            await inside(label, viewport);
            await noOverflow(page);
            const box = (await label.boundingBox())!;
            const owner = (await control.boundingBox())!;
            const other = (await otherControl.boundingBox())!;
            expect(box.y, `${which} label sits below its button`).toBeGreaterThanOrEqual(owner.y + owner.height);
            expect(Math.abs(box.x + box.width - (owner.x + owner.width)), `${which} label is right-aligned to its button`).toBeLessThanOrEqual(1);
            const overlapsOther = box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y;
            expect(overlapsOther, `${which} label must not cover the other toggle`).toBe(false);
            await parkPointer(page);
            await expect(label).toBeHidden();
            expect(await boxes(page), `${route}: geometry after the ${which} label hides`).toEqual(resting);
          }
        }
      });
    }
  }
});

test.describe('season toggle: badge contrast (FR-017)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: the season badge is at least 4.5:1 at rest and on hover, and the label fill/text is at least 4.5:1, in all six seasons`, async ({ visit }) => {
      const failures: string[] = [];
      for (const season of SEASON_IDS) {
        // Auto badge: Berlin and Manila detect a season; pick the zone/time where the detected season equals the one under test
        // so the badge is shown (a manual choice renders no badge).
        const detected: Record<SeasonId, [Zone, string]> = {
          spring: ['Europe/Berlin', '2026-04-15'],
          summer: ['Europe/Berlin', '2026-07-15'],
          autumn: ['Europe/Berlin', '2026-10-15'],
          winter: ['Europe/Berlin', '2026-01-15'],
          wet: ['Asia/Manila', '2026-08-15'],
          dry: ['Asia/Manila', '2026-02-15'],
        };
        const [zone, date] = detected[season];
        const hour = theme === 'light' ? '10:00:00' : '22:00:00';
        const page = await visit({ zone, time: Date.parse(`${date}T${hour}${OFFSETS[zone]}`), storage: MODE_STORAGE(theme) });
        await goto(page, '/');
        await hydrated(page);
        await expectTheme(page, theme);
        await expect(html(page)).toHaveAttribute('data-season', season);
        const badge = page.locator('.season-toggle .season-toggle-badge');
        await expect(badge).toHaveCount(1);
        const read = (locator: Locator) =>
          locator.evaluate((node) => {
            const computed = getComputedStyle(node);
            return { color: computed.color, background: computed.backgroundColor, opacity: computed.opacity, boxShadow: computed.boxShadow, backgroundImage: computed.backgroundImage, borders: [computed.borderTopWidth, computed.borderLeftWidth] };
          });
        const rest = await read(badge);
        await seasonButton(page).hover();
        await expect.poll(async () => (await read(badge)).color !== rest.color, { message: `${season}/${theme}: hover restyles the badge` }).toBe(true);
        const hover = await read(badge);
        const label = await read(seasonLabel(page));
        await parkPointer(page);
        for (const [state, style] of [['badge rest', rest], ['badge hover', hover], ['label', label]] as const) {
          expect(style.background, `${season}/${theme}/${state}: opaque background`).toMatch(/^rgb\(/);
          expect(style.color, `${season}/${theme}/${state}: opaque text`).toMatch(/^rgb\(/);
          expect(style.boxShadow).toBe('none');
          expect(style.backgroundImage).toBe('none');
          const ratio = contrast(style.color, style.background);
          if (ratio < 4.5) failures.push(`${season}/${theme}/${state}: ${style.color} on ${style.background} = ${ratio.toFixed(2)}`);
        }
        expect(`${hover.color}|${hover.background}`, `${season}/${theme}: hover inverts the badge`).toBe(`${rest.background}|${rest.color}`);
        await page.context().close();
      }
      expect(failures).toEqual([]);
    });
  }
});
