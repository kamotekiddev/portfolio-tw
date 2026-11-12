import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
import { blogFixtures, restartFixtureServer } from './blog-fixtures';

/*
 * Browser regression coverage for specs/005-theme-transition (spec.md FR-001-FR-010, SC-001-SC-004;
 * contracts/theme-transition-contract.md). Written from the spec as an independent oracle: nothing is imported from
 * app/components/theme-transition.ts. The page is instrumented before any app script runs:
 *
 *  - document.startViewTransition is wrapped (pass-through) to record every call, the <html> class and data-season
 *    when the update callback was invoked and when it returned (the DOM change must have happened by then), and whether
 *    the transition's `finished` promise settled. Only `finished` is observed, so no rejection of `ready` or
 *    `updateCallbackDone` is silenced: an unhandled rejection in the app still surfaces as a `pageerror`.
 *  - Element.prototype.animate is wrapped (pass-through) to capture animations aimed at a ::view-transition-* pseudo:
 *    pseudoElement, normalised keyframes, duration, easing and the viewport size at that moment.
 *
 * Every context fixes its time zone and clock, as the theme and season suites do, so Auto mode never depends on the
 * machine running the tests (default 2026-01-15 12:00 in Asia/Manila: Auto shows light, the detected season is dry).
 */

const ARTICLE = '/blog/fixture-newest';
type Theme = 'light' | 'dark';
type Mode = 'auto' | 'light' | 'dark';
type VTMode = 'record' | 'none' | 'undefined' | 'deleted';

const SEASON_LABELS = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter', wet: 'Wet season', dry: 'Dry season' } as const;
type SeasonId = keyof typeof SEASON_LABELS;

const ZONE = 'Asia/Manila';
const OFFSET = '+08:00';
const DATE = '2026-01-15';
/** Epoch ms for a local wall-clock time on 2026-01-15 in Asia/Manila (UTC+8, no DST). */
const instant = (time: string) => Date.parse(`${DATE}T${time}${OFFSET}`);

const REVEAL_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

type VTCall = {
  at: number;
  classAtCall: string;
  seasonAtCall: string | null;
  callbackRan: boolean;
  classAtReturn: string | null;
  seasonAtReturn: string | null;
  finished: boolean;
  finishedRejected: boolean;
};
type VTAnim = {
  call: number;
  pseudo: string | null;
  duration: number | string | null;
  easing: string | null;
  keyframes: Array<Record<string, unknown>>;
  innerWidth: number;
  innerHeight: number;
};
type VTState = { calls: VTCall[]; anims: VTAnim[] };
type RealSample = { t: number; anims: number; clip: string };
type VTWindow = Window & { __vt?: VTState; __real?: RealSample[] };

type VisitOptions = {
  /** Local 'HH:MM:SS' on 2026-01-15 in Asia/Manila. Default 12:00:00. */
  time?: string;
  /** 'fixed' freezes Date only (timers stay real); 'install' fakes timers too so a test can move time. */
  clock?: 'fixed' | 'install';
  storage?: Record<string, string>;
  viewport?: { width: number; height: number };
  reducedMotion?: 'reduce' | 'no-preference';
  /**
   * 'record' wraps startViewTransition/animate (pass-through); 'none' installs nothing (the real, un-instrumented API);
   * 'undefined' sets document.startViewTransition = undefined; 'deleted' removes it from Document.prototype.
   */
  vt?: VTMode;
  /** Passive per-frame sampler of the real transition's pseudo-element animations and computed clip-path. */
  realSampler?: boolean;
};

const test = base.extend<{ visit: (options?: VisitOptions) => Promise<Page> }>({
  visit: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    await use(async (options = {}) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        timezoneId: ZONE,
        viewport: options.viewport ?? { width: 1440, height: 900 },
        colorScheme: 'light',
        reducedMotion: options.reducedMotion ?? 'no-preference',
      });
      contexts.push(context);
      const now = instant(options.time ?? '12:00:00');
      if (options.clock === 'install') await context.clock.install({ time: now });
      else await context.clock.setFixedTime(now);

      if (options.storage && Object.keys(options.storage).length) {
        await context.addInitScript((entries) => {
          try {
            for (const [key, value] of Object.entries(entries)) {
              if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
            }
          } catch {
            /* storage unavailable */
          }
        }, options.storage);
      }

      const vt = options.vt ?? 'record';
      if (vt === 'undefined') {
        await context.addInitScript(() => {
          (document as unknown as { startViewTransition: unknown }).startViewTransition = undefined;
        });
      } else if (vt === 'deleted') {
        await context.addInitScript(() => {
          delete (Document.prototype as unknown as Record<string, unknown>).startViewTransition;
        });
      } else if (vt === 'record') {
        await context.addInitScript(() => {
          const state: VTState = { calls: [], anims: [] };
          (window as unknown as VTWindow).__vt = state;
          const root = () => document.documentElement;

          const original = (document as unknown as { startViewTransition?: (arg?: unknown) => { finished: Promise<void> } }).startViewTransition;
          if (typeof original === 'function') {
            (document as unknown as { startViewTransition: unknown }).startViewTransition = function (this: Document, arg?: unknown) {
              const call: VTCall = {
                at: performance.now(),
                classAtCall: root().className,
                seasonAtCall: root().getAttribute('data-season'),
                callbackRan: false,
                classAtReturn: null,
                seasonAtReturn: null,
                finished: false,
                finishedRejected: false,
              };
              state.calls.push(call);
              const wrap = (callback: unknown) =>
                typeof callback === 'function'
                  ? function (this: unknown) {
                      call.callbackRan = true;
                      const result = (callback as () => unknown).apply(this);
                      // Recorded synchronously: the DOM change has to be in place by the time the callback returns.
                      call.classAtReturn = root().className;
                      call.seasonAtReturn = root().getAttribute('data-season');
                      return result;
                    }
                  : callback;
              const wrapped =
                arg && typeof arg === 'object' && 'update' in (arg as object)
                  ? { ...(arg as object), update: wrap((arg as { update?: unknown }).update) }
                  : wrap(arg);
              const transition = original.call(document, wrapped);
              // Observe only `finished`: ready / updateCallbackDone rejections stay the app's business.
              transition.finished.then(
                () => {
                  call.finished = true;
                },
                () => {
                  call.finished = true;
                  call.finishedRejected = true;
                },
              );
              return transition as never;
            } as never;
          }

          const animate = Element.prototype.animate;
          Element.prototype.animate = function (this: Element, keyframes: PropertyIndexedKeyframes | Keyframe[] | null, options?: number | KeyframeAnimationOptions) {
            const animation = animate.call(this, keyframes, options);
            const pseudo = typeof options === 'object' && options ? ((options as { pseudoElement?: string }).pseudoElement ?? null) : null;
            if (pseudo && pseudo.startsWith('::view-transition')) {
              const timing = (animation.effect as KeyframeEffect).getTiming();
              state.anims.push({
                call: state.calls.length - 1,
                pseudo,
                duration: typeof timing.duration === 'object' ? String(timing.duration) : (timing.duration ?? null),
                easing: timing.easing ?? null,
                keyframes: (animation.effect as KeyframeEffect).getKeyframes() as unknown as Array<Record<string, unknown>>,
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
              });
            }
            return animation;
          };
        });
      }

      if (options.realSampler) {
        await context.addInitScript(() => {
          const samples: RealSample[] = [];
          (window as unknown as VTWindow).__real = samples;
          const isVt = (animation: Animation) => String((animation.effect as unknown as { pseudoElement?: string } | null)?.pseudoElement ?? '').startsWith('::view-transition');
          const frame = () => {
            const live = document.getAnimations().filter(isVt);
            if (live.length && samples.length < 2000) {
              samples.push({
                t: performance.now(),
                anims: live.length,
                clip: getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath,
              });
            }
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
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

const html = (page: Page) => page.locator('html');
const toggle = (page: Page) => page.getByRole('button', { name: /^Theme: / });
const seasonButton = (page: Page) => page.getByRole('button', { name: /^Season:/ });
const seasonMenu = (page: Page) => page.getByRole('menu', { name: 'Season' });
const seasonRow = (page: Page, label: string) => seasonMenu(page).getByRole('menuitemradio', { name: new RegExp(`^${label}( \\(Automatic\\))?$`) });

const NAMES = { light: 'Theme: Light', dark: 'Theme: Dark', autoLight: 'Theme: Auto (currently light)', autoDark: 'Theme: Auto (currently dark)' } as const;
const nameFor = (mode: Mode, theme: Theme) => (mode === 'auto' ? (theme === 'light' ? NAMES.autoLight : NAMES.autoDark) : mode === 'light' ? NAMES.light : NAMES.dark);
/** Toggle flip (spec 004): a press picks the opposite of the shown theme, and Auto when that is the scheduled theme. */
function flip(mode: Mode, scheduled: Theme): Mode {
  const shown: Theme = mode === 'auto' ? scheduled : mode;
  const target: Theme = shown === 'light' ? 'dark' : 'light';
  return target === scheduled ? 'auto' : target;
}
const shownIn = (mode: Mode, scheduled: Theme): Theme => (mode === 'auto' ? scheduled : mode);

const hasTheme = (cls: string | null, theme: Theme) => {
  const tokens = (cls ?? '').split(/\s+/).filter(Boolean);
  return tokens.includes(theme) && !tokens.includes(theme === 'light' ? 'dark' : 'light');
};

async function goto(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(toggle(page)).toBeEnabled(); // disabled until hydration
  await expect(seasonButton(page)).toBeEnabled();
}

async function expectTheme(page: Page, theme: Theme) {
  await expect(html(page)).toHaveClass(theme === 'light' ? /\blight\b/ : /\bdark\b/);
  await expect(html(page)).not.toHaveClass(theme === 'light' ? /\bdark\b/ : /\blight\b/);
}

const stored = (page: Page, key: string) => page.evaluate((name) => localStorage.getItem(name), key);
const state = (page: Page) => page.evaluate(() => (window as unknown as VTWindow).__vt as VTState);

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(`${message.type()}: ${message.text()}`);
  });
  return errors;
}

/** Wait until every recorded transition has finished and no ::view-transition tree or animation remains. */
async function settled(page: Page) {
  await page.waitForFunction(
    () => {
      const w = window as unknown as VTWindow;
      const recorded = w.__vt ? w.__vt.calls.every((call) => call.finished) : true;
      const doc = document as unknown as { activeViewTransition?: unknown };
      const active =
        'activeViewTransition' in doc
          ? doc.activeViewTransition !== null && doc.activeViewTransition !== undefined
          : document.getAnimations().some((animation) => String((animation.effect as unknown as { pseudoElement?: string } | null)?.pseudoElement ?? '').startsWith('::view-transition'));
      return recorded && !active;
    },
    undefined,
    { timeout: 5_000 },
  );
}

type Box = { x: number; y: number; width: number; height: number };
const centre = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const CIRCLE = /^circle\(\s*([\d.]+)(?:px)?\s+at\s+([\d.]+)px[\s,]+([\d.]+)px\s*\)$/;
function parseCircle(text: unknown) {
  const match = CIRCLE.exec(String(text));
  expect(match, `clip-path keyframe "${String(text)}" is not circle(<r> at <x>px <y>px)`).not.toBeNull();
  return { r: Number(match![1]), x: Number(match![2]), y: Number(match![3]) };
}
const keyframeClip = (frame: Record<string, unknown>) => frame.clipPath ?? frame['clip-path'];

/**
 * Asserts one recorded reveal animation: ::view-transition-new(root), circle(0 at x y) -> circle(r at x y), (x, y) within
 * 2px of `origin`, r the distance to the farthest viewport corner, 400-600 ms, the site's ease-out curve.
 */
function expectReveal(anim: VTAnim, origin: { x: number; y: number }, label = 'reveal') {
  expect(anim.pseudo, `${label}: pseudoElement`).toBe('::view-transition-new(root)');
  expect(typeof anim.duration, `${label}: duration type`).toBe('number');
  expect(anim.duration as number, `${label}: duration`).toBeGreaterThanOrEqual(400);
  expect(anim.duration as number, `${label}: duration`).toBeLessThanOrEqual(600);
  expect(anim.easing, `${label}: easing`).toBe(REVEAL_EASING);
  const clips = anim.keyframes.map(keyframeClip);
  expect(clips.length, `${label}: keyframe count`).toBe(2);
  const from = parseCircle(clips[0]);
  const to = parseCircle(clips[1]);
  expect(from.r, `${label}: start radius`).toBe(0);
  for (const end of [from, to]) {
    expect(Math.abs(end.x - origin.x), `${label}: x ${end.x} vs control centre ${origin.x}`).toBeLessThanOrEqual(2);
    expect(Math.abs(end.y - origin.y), `${label}: y ${end.y} vs control centre ${origin.y}`).toBeLessThanOrEqual(2);
  }
  const farthest = Math.hypot(Math.max(to.x, anim.innerWidth - to.x), Math.max(to.y, anim.innerHeight - to.y));
  expect(to.r, `${label}: end radius ${to.r} must reach the farthest corner (${farthest.toFixed(1)})`).toBeGreaterThanOrEqual(farthest - 0.5);
  expect(to.r, `${label}: end radius ${to.r} is the distance to the farthest corner (${farthest.toFixed(1)}), not far beyond it`).toBeLessThanOrEqual(farthest + 2);
}

async function noOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    root: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
    body: [document.body.scrollWidth, document.body.clientWidth],
  }));
  expect(metrics.root[0], `documentElement scrollWidth ${metrics.root[0]} > clientWidth ${metrics.root[1]}`).toBeLessThanOrEqual(metrics.root[1]);
  expect(metrics.body[0], `body scrollWidth ${metrics.body[0]} > clientWidth ${metrics.body[1]}`).toBeLessThanOrEqual(metrics.body[1]);
}

/** The control's centre is the element at that point (no overlay or pseudo-element left capturing the pointer). */
async function expectHittable(page: Page, selector: string) {
  const hit = await page.evaluate((sel) => {
    const el = document.querySelector(sel)!;
    const rect = el.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return !!top && el.contains(top);
  }, selector);
  expect(hit, `${selector} receives pointer events at its centre`).toBe(true);
}

const THEME = '.theme-toggle';
const SEASON = '.season-toggle';
const MODE_STORAGE = (mode: Mode) => ({ 'theme-mode': mode });

/** Opens a page and returns it with an error collector. */
async function open(visit: (options?: VisitOptions) => Promise<Page>, options: VisitOptions = {}, url = '/') {
  const page = await visit(options);
  const errors = watchErrors(page);
  await goto(page, url);
  return { page, errors };
}

// ---------------------------------------------------------------------------------------------------------------

test.describe('theme toggle reveals from the toggle (FR-001, FR-003, FR-007)', () => {
  for (const method of ['mouse', 'keyboard Enter', 'keyboard Space'] as const) {
    test(`${method}: one transition, circle from the toggle centre, DOM updated in the callback, same end state as an instant switch`, async ({ visit }) => {
      const { page, errors } = await open(visit);
      await expectTheme(page, 'light');
      await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
      const origin = centre((await toggle(page).boundingBox())!);

      // Press 1: Auto (light) -> Dark. Press 2: Dark -> Auto (the scheduled theme is light).
      let mode: Mode = 'auto';
      for (let press = 1; press <= 2; press++) {
        const next = flip(mode, 'light');
        const before = (await state(page)).calls.length;
        if (method === 'mouse') await toggle(page).click();
        else {
          await toggle(page).focus();
          await page.keyboard.press(method === 'keyboard Enter' ? 'Enter' : 'Space');
        }

        // FR-003: nothing the visitor relies on waits for the ~500 ms reveal.
        await page.waitForTimeout(200);
        const mid = await state(page);
        expect(mid.calls.length - before, `press ${press}: startViewTransition calls`).toBe(1);
        const call = mid.calls[before];
        expect(call.finished, `press ${press}: reveal still running at 200 ms`).toBe(false);
        expect(await stored(page, 'theme-mode'), `press ${press}: stored mode while the reveal runs`).toBe(next);
        await expect(toggle(page)).toHaveAccessibleName(nameFor(next, 'light'));
        await expect(toggle(page)).toBeFocused();
        // The change was in place when the update callback returned.
        expect(call.callbackRan).toBe(true);
        expect(hasTheme(call.classAtCall, shownIn(mode, 'light')), `class before the press: "${call.classAtCall}"`).toBe(true);
        expect(hasTheme(call.classAtReturn, shownIn(next, 'light')), `class when the callback returned: "${call.classAtReturn}"`).toBe(true);

        await settled(page);
        const done = await state(page);
        expect(done.calls.length - before).toBe(1);
        expect(done.calls[before].finishedRejected).toBe(false);
        const reveals = done.anims.filter((anim) => anim.call === before);
        expect(reveals.length, `press ${press}: reveal animations`).toBe(1);
        expectReveal(reveals[0], origin, `press ${press}`);

        await expectTheme(page, shownIn(next, 'light'));
        expect(await stored(page, 'theme-mode')).toBe(next);
        expect(await stored(page, 'theme')).toBe(shownIn(next, 'light'));
        await expect(toggle(page)).toHaveAccessibleName(nameFor(next, 'light'));
        await expect(toggle(page)).toBeFocused();
        await expectHittable(page, THEME);
        mode = next;
      }
      expect(errors).toEqual([]);
    });
  }

  test('on an article scrolled to the middle the origin is the toggle in viewport coordinates, not document coordinates', async ({ visit }) => {
    const { page, errors } = await open(visit, {}, ARTICLE);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    const box = (await toggle(page).boundingBox())!;
    expect(box.y, 'sticky header keeps the toggle in the viewport').toBeGreaterThanOrEqual(0);
    await toggle(page).click();
    await settled(page);
    const done = await state(page);
    expect(done.calls.length).toBe(1);
    expectReveal(done.anims[0], centre(box), 'scrolled');
    await expectTheme(page, 'dark');
    expect(errors).toEqual([]);
  });
});

test.describe('season picker reveals from the season trigger (FR-002)', () => {
  test('choosing a season by mouse: reveal from the trigger centre, data-season set in the callback, end state matches an instant switch', async ({ visit }) => {
    const { page, errors } = await open(visit);
    await expect(html(page)).toHaveAttribute('data-season', 'dry');
    const origin = centre((await seasonButton(page).boundingBox())!);
    await seasonButton(page).click();
    await expect(seasonMenu(page)).toBeVisible();
    expect((await state(page)).calls.length, 'opening the menu does not animate').toBe(0);
    await seasonRow(page, SEASON_LABELS.winter).click();

    await page.waitForTimeout(200);
    const mid = await state(page);
    expect(mid.calls.length).toBe(1);
    expect(mid.calls[0].finished, 'reveal still running at 200 ms').toBe(false);
    expect(mid.calls[0].callbackRan).toBe(true);
    expect(mid.calls[0].seasonAtCall).toBe('dry');
    expect(mid.calls[0].seasonAtReturn, 'data-season when the callback returned').toBe('winter');
    expect(await stored(page, 'season')).toBe('winter');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    await expect(seasonButton(page)).toBeFocused();

    await settled(page);
    const done = await state(page);
    expect(done.calls.length).toBe(1);
    expect(done.calls[0].finishedRejected).toBe(false);
    expect(done.anims.length).toBe(1);
    expectReveal(done.anims[0], origin, 'season mouse');
    await expect(html(page)).toHaveAttribute('data-season', 'winter');
    await expect(seasonMenu(page)).toHaveCount(0);
    await expectTheme(page, 'light'); // the theme is untouched
    await expectHittable(page, SEASON);
    expect(errors).toEqual([]);
  });

  test('choosing a season by keyboard: same origin, focus returns to the trigger', async ({ visit }) => {
    const { page, errors } = await open(visit);
    const origin = centre((await seasonButton(page).boundingBox())!);
    await seasonButton(page).focus();
    await page.keyboard.press('ArrowDown'); // opens the menu with focus on the checked row (the detected dry season)
    await expect(seasonMenu(page)).toBeVisible();
    await page.keyboard.press('Home'); // first row: Spring
    await page.keyboard.press('Enter');

    await expect(html(page)).toHaveAttribute('data-season', 'spring');
    await settled(page);
    const done = await state(page);
    expect(done.calls.length).toBe(1);
    expect(done.calls[0].seasonAtReturn).toBe('spring');
    expectReveal(done.anims[0], origin, 'season keyboard');
    expect(await stored(page, 'season')).toBe('spring');
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Spring');
    await expect(seasonButton(page)).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('choosing the season already shown does not start a transition (manual choice)', async ({ visit }) => {
    const { page, errors } = await open(visit, { storage: { season: 'winter' } });
    await expect(html(page)).toHaveAttribute('data-season', 'winter');
    await seasonButton(page).click();
    await seasonRow(page, SEASON_LABELS.winter).click();
    await expect(seasonMenu(page)).toHaveCount(0);
    await expect(seasonButton(page)).toBeFocused();
    await page.waitForTimeout(150);
    const done = await state(page);
    expect(done.calls.length).toBe(0);
    expect(done.anims.length).toBe(0);
    await expect(html(page)).toHaveAttribute('data-season', 'winter');
    expect(await stored(page, 'season')).toBe('winter');
    expect(errors).toEqual([]);
  });

  test('choosing the automatically detected season while on Auto does not start a transition', async ({ visit }) => {
    const { page, errors } = await open(visit);
    await expect(html(page)).toHaveAttribute('data-season', 'dry');
    await seasonButton(page).click();
    await seasonRow(page, SEASON_LABELS.dry).click();
    await expect(seasonMenu(page)).toHaveCount(0);
    await page.waitForTimeout(150);
    const done = await state(page);
    expect(done.calls.length).toBe(0);
    expect(done.anims.length).toBe(0);
    await expect(html(page)).toHaveAttribute('data-season', 'dry');
    expect(errors).toEqual([]);
  });

  test('every season change in a row reveals from the trigger and ends on the last choice', async ({ visit }) => {
    const { page, errors } = await open(visit);
    const origin = centre((await seasonButton(page).boundingBox())!);
    for (const season of ['spring', 'summer', 'autumn'] as const) {
      await seasonButton(page).click();
      await seasonRow(page, SEASON_LABELS[season]).click();
      await settled(page);
      await expect(html(page)).toHaveAttribute('data-season', season);
    }
    const done = await state(page);
    expect(done.calls.length).toBe(3);
    done.anims.forEach((anim, index) => expectReveal(anim, origin, `season change ${index + 1}`));
    expect(done.anims.length).toBe(3);
    expect(errors).toEqual([]);
  });
});

test.describe('no animation without motion or support (FR-005, SC-003)', () => {
  test('prefers-reduced-motion: reduce switches theme and season instantly without startViewTransition', async ({ visit }) => {
    const { page, errors } = await open(visit, { reducedMotion: 'reduce' });
    // The theme class lands in the frame of the press: read after one animation frame, not after a settle wait.
    const result = await page.evaluate(async () => {
      (document.querySelector('.theme-toggle') as HTMLButtonElement).click();
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      return { cls: document.documentElement.className, mode: localStorage.getItem('theme-mode') };
    });
    expect(hasTheme(result.cls, 'dark'), `class one frame after the press: "${result.cls}"`).toBe(true);
    expect(result.mode).toBe('dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);

    await seasonButton(page).click();
    await seasonRow(page, SEASON_LABELS.autumn).click();
    await expect(html(page)).toHaveAttribute('data-season', 'autumn');
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expectTheme(page, 'light');
    await expect(toggle(page)).toBeFocused();

    const done = await state(page);
    expect(done.calls.length, 'startViewTransition calls').toBe(0);
    expect(done.anims.length, 'view-transition animations').toBe(0);
    expect(errors).toEqual([]);
  });

  for (const vt of ['undefined', 'deleted'] as const) {
    test(`document.startViewTransition ${vt === 'undefined' ? 'set to undefined' : 'removed'}: instant switch for theme and season, no errors`, async ({ visit }) => {
      const { page, errors } = await open(visit, { vt });
      expect(await page.evaluate(() => typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition)).toBe('undefined');

      await toggle(page).click();
      await expectTheme(page, 'dark');
      await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);
      expect(await stored(page, 'theme-mode')).toBe('dark');
      await expect(toggle(page)).toBeFocused();

      await seasonButton(page).click();
      await seasonRow(page, SEASON_LABELS.wet).click();
      await expect(html(page)).toHaveAttribute('data-season', 'wet');
      expect(await stored(page, 'season')).toBe('wet');

      await toggle(page).focus();
      await page.keyboard.press('Enter');
      await expectTheme(page, 'light');
      await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('automatic changes never animate (FR-004, SC-001)', () => {
  const expectQuiet = async (page: Page, label: string) => {
    const done = await state(page);
    expect(done.calls.length, `${label}: startViewTransition calls`).toBe(0);
    expect(done.anims.length, `${label}: view-transition animations`).toBe(0);
  };

  test('first load and hydration, with stored manual choices, are instant', async ({ visit }) => {
    const { page, errors } = await open(visit, { storage: { ...MODE_STORAGE('dark'), season: 'summer' } });
    await expectTheme(page, 'dark');
    await expect(html(page)).toHaveAttribute('data-season', 'summer');
    await page.waitForTimeout(700); // longer than a whole reveal
    await expectQuiet(page, 'load');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(toggle(page)).toBeEnabled();
    await page.waitForTimeout(700);
    await expectQuiet(page, 'reload');
    expect(errors).toEqual([]);
  });

  test('client-side navigation is instant', async ({ visit }) => {
    const { page, errors } = await open(visit, { storage: { ...MODE_STORAGE('dark') } });
    await page.getByRole('link', { name: 'Blog', exact: true }).first().click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(toggle(page)).toBeEnabled();
    await page.waitForTimeout(700);
    await expectTheme(page, 'dark');
    await expectQuiet(page, 'navigation');
    expect(errors).toEqual([]);
  });

  test('Auto crossing 18:00 and 06:00 (timer, visibility and focus re-syncs) changes the theme with no transition', async ({ visit }) => {
    const { page, errors } = await open(visit, { clock: 'install', time: '17:55:00' });
    await page.clock.pauseAt(instant('17:59:50'));
    await expectTheme(page, 'light');
    await page.clock.runFor(11_000); // 18:00:01
    await expectTheme(page, 'dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoDark);
    await expectQuiet(page, 'timer boundary to dark');

    // A slept tab: the clock jumps across 06:00 without timers firing, then focus and visibility re-sync.
    await page.clock.setSystemTime(instant('06:30:00') + 24 * 3600 * 1000);
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await expectTheme(page, 'light');
    await expectQuiet(page, 'visibility/focus re-sync to light');
    await page.clock.runFor(1_000);
    await expectQuiet(page, 'after the sweep time');
    expect(errors).toEqual([]);
  });

  test("another tab's theme and season change are applied here instantly", async ({ visit }) => {
    const { page: first, errors } = await open(visit);
    const second = await first.context().newPage();
    const secondErrors = watchErrors(second);
    await goto(second, '/');
    await second.bringToFront();

    await toggle(second).click();
    await seasonButton(second).click();
    await seasonRow(second, SEASON_LABELS.winter).click();
    await expect.poll(() => second.evaluate(() => (window as unknown as VTWindow).__vt!.calls.length), 'the acting tab does reveal').toBe(2);

    await expectTheme(first, 'dark');
    await expect(first.locator('html')).toHaveAttribute('data-season', 'winter');
    await expect(toggle(first)).toHaveAccessibleName(NAMES.dark);
    await first.waitForTimeout(700);
    await expectQuiet(first, 'receiving tab');
    expect(errors).toEqual([]);
    expect(secondErrors).toEqual([]);
  });
});

test.describe('rapid and combined presses (FR-006, SC-004)', () => {
  for (const gap of [40, 120]) {
    test(`five presses ${gap} ms apart: the shown theme matches the stored mode, nothing is left stuck, the next press works`, async ({ visit }) => {
      const { page, errors } = await open(visit);
      const origin = centre((await toggle(page).boundingBox())!);
      await page.evaluate(async (delay) => {
        const button = document.querySelector('.theme-toggle') as HTMLButtonElement;
        for (let i = 0; i < 5; i++) {
          button.click();
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }, gap);

      let mode: Mode = 'auto';
      for (let i = 0; i < 5; i++) mode = flip(mode, 'light'); // auto -> dark -> auto -> dark -> auto -> dark
      expect(mode).toBe('dark');
      await settled(page);
      await expectTheme(page, 'dark');
      expect(await stored(page, 'theme-mode')).toBe('dark');
      expect(await stored(page, 'theme')).toBe('dark');
      await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);
      await expectHittable(page, THEME);
      await expect(toggle(page)).toBeEnabled();

      const rapid = await state(page);
      expect(rapid.calls.length, 'one transition request per press').toBe(5);
      expect(rapid.calls.every((call) => call.callbackRan), 'every update callback ran, including skipped transitions').toBe(true);
      expect(rapid.anims.length).toBeGreaterThanOrEqual(1);
      rapid.anims.forEach((anim, index) => expectReveal(anim, origin, `rapid reveal ${index + 1}`));

      // The page still responds: a sixth press (Dark -> Auto/light) reveals normally.
      await toggle(page).click();
      await settled(page);
      await expectTheme(page, 'light');
      expect(await stored(page, 'theme-mode')).toBe('auto');
      await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
      const after = await state(page);
      expect(after.calls.length).toBe(6);
      expectReveal(after.anims[after.anims.length - 1], origin, 'press after the burst');
      expect(after.anims[after.anims.length - 1].call).toBe(5);
      expect(errors).toEqual([]);
    });
  }

  /*
   * Real pointer input. locator.click() waits for actionability and sees "<html> intercepts pointer events" while a view
   * transition is running, so it quietly retries until the reveal ends and would hide clicks swallowed by <html>.
   * page.mouse.click(x, y) fires at the coordinates regardless, as a visitor's second tap would.
   */
  test('five real mouse clicks ~80 ms apart at the toggle centre: none is swallowed during the reveal; final theme and stored mode match five flips', async ({ visit }) => {
    const { page, errors } = await open(visit);
    const origin = centre((await toggle(page).boundingBox())!);
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(origin.x, origin.y);
      await page.waitForTimeout(80);
    }
    let mode: Mode = 'auto';
    for (let i = 0; i < 5; i++) mode = flip(mode, 'light');
    expect(mode).toBe('dark');
    await settled(page);
    await expectTheme(page, shownIn(mode, 'light'));
    expect(await stored(page, 'theme-mode'), 'stored mode after 5 real clicks').toBe(mode);
    expect(await stored(page, 'theme')).toBe(shownIn(mode, 'light'));
    await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, 'light'));
    await expectHittable(page, THEME);

    // The page responds normally afterwards.
    await page.mouse.click(origin.x, origin.y);
    await settled(page);
    await expectTheme(page, 'light');
    expect(await stored(page, 'theme-mode')).toBe('auto');
    expect(errors).toEqual([]);
  });

  test('five Enter presses on the focused toggle with no waits: final theme and stored mode match five flips', async ({ visit }) => {
    const { page, errors } = await open(visit);
    await toggle(page).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('Enter');
    let mode: Mode = 'auto';
    for (let i = 0; i < 5; i++) mode = flip(mode, 'light');
    await settled(page);
    await expectTheme(page, shownIn(mode, 'light'));
    expect(await stored(page, 'theme-mode'), 'stored mode after 5 Enter presses').toBe(mode);
    expect(await stored(page, 'theme')).toBe(shownIn(mode, 'light'));
    await expect(toggle(page)).toHaveAccessibleName(nameFor(mode, 'light'));
    await expect(toggle(page)).toBeFocused();
    await expectHittable(page, THEME);
    expect(errors).toEqual([]);
  });

  test('a header nav link clicked with the mouse 100 ms into a reveal still navigates', async ({ visit }) => {
    const { page, errors } = await open(visit);
    const link = page.locator('.site-header').getByRole('link', { name: 'Contact', exact: true });
    const linkBox = (await link.boundingBox())!;
    const start = centre((await toggle(page).boundingBox())!);
    await page.mouse.click(start.x, start.y);
    await page.waitForTimeout(100);
    const during = await state(page);
    expect(during.calls.length).toBe(1);
    expect(during.calls[0].finished, 'the click lands while the reveal is still running').toBe(false);
    const target = centre(linkBox);
    await page.mouse.click(target.x, target.y);
    await expect(page, 'the nav click took effect').toHaveURL(/#contact$/);
    await expect.poll(() => page.evaluate(() => window.scrollY), 'the page scrolled to the section').toBeGreaterThan(200);
    await settled(page);
    await expectTheme(page, 'dark');
    expect(await stored(page, 'theme-mode')).toBe('dark');
    expect(errors).toEqual([]);
  });

  test('four rapid presses end on the matching mode too (even count)', async ({ visit }) => {
    const { page, errors } = await open(visit);
    await page.evaluate(async () => {
      const button = document.querySelector('.theme-toggle') as HTMLButtonElement;
      for (let i = 0; i < 4; i++) {
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    });
    await settled(page);
    await expectTheme(page, 'light');
    expect(await stored(page, 'theme-mode')).toBe('auto');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.autoLight);
    expect(errors).toEqual([]);
  });

  test('theme and season changed back to back both land, and neither reveal leaves the page stuck', async ({ visit }) => {
    const { page, errors } = await open(visit);
    await toggle(page).click();
    await seasonButton(page).click();
    await seasonRow(page, SEASON_LABELS.winter).click();
    await settled(page);
    await expectTheme(page, 'dark');
    await expect(html(page)).toHaveAttribute('data-season', 'winter');
    expect(await stored(page, 'theme-mode')).toBe('dark');
    expect(await stored(page, 'season')).toBe('winter');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);
    await expect(seasonButton(page)).toHaveAccessibleName('Season: Winter');
    await expectHittable(page, THEME);
    await expectHittable(page, SEASON);
    const done = await state(page);
    expect(done.calls.length).toBe(2);
    expect(errors).toEqual([]);
  });
});

test.describe('viewport coverage (FR-008, SC-002)', () => {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`${width}px: both reveals cover the farthest corner, finish within 600 ms and leave no horizontal overflow`, async ({ visit }) => {
      const { page, errors } = await open(visit, { viewport: { width, height } });
      await noOverflow(page);

      const themeOrigin = centre((await toggle(page).boundingBox())!);
      await toggle(page).click();
      await settled(page);
      await noOverflow(page);
      await expectTheme(page, 'dark');

      const seasonOrigin = centre((await seasonButton(page).boundingBox())!);
      await seasonButton(page).click();
      await seasonRow(page, SEASON_LABELS.spring).click();
      await settled(page);
      await noOverflow(page);
      await expect(html(page)).toHaveAttribute('data-season', 'spring');

      const done = await state(page);
      expect(done.calls.length).toBe(2);
      expect(done.anims.length).toBe(2);
      expect(done.anims[0].innerWidth).toBe(width);
      expect(done.anims[0].innerHeight).toBe(height);
      expectReveal(done.anims[0], themeOrigin, `${width}px theme`);
      expectReveal(done.anims[1], seasonOrigin, `${width}px season`);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('real, un-instrumented transition (FR-003, FR-007)', () => {
  test('the browser actually runs the reveal to completion: expanding circle, ~500 ms, no console errors, clean end state', async ({ visit }) => {
    const { page, errors } = await open(visit, { vt: 'none', realSampler: true });
    const origin = centre((await toggle(page).boundingBox())!);
    await toggle(page).click();

    await expect.poll(() => page.evaluate(() => (window as unknown as VTWindow).__real!.length), { timeout: 3_000 }).toBeGreaterThan(0);
    await page.waitForFunction(() => document.getAnimations().every((animation) => !String((animation.effect as unknown as { pseudoElement?: string } | null)?.pseudoElement ?? '').startsWith('::view-transition')), undefined, { timeout: 3_000 });
    await expectTheme(page, 'dark');
    expect(await stored(page, 'theme-mode')).toBe('dark');
    await expect(toggle(page)).toHaveAccessibleName(NAMES.dark);
    await expect(toggle(page)).toBeFocused();
    await expectHittable(page, THEME);

    const samples = await page.evaluate(() => (window as unknown as VTWindow).__real!);
    expect(samples.length, 'frames seen with a running view-transition animation').toBeGreaterThanOrEqual(5);
    const span = samples[samples.length - 1].t - samples[0].t;
    expect(span, `reveal visible for ${span.toFixed(0)} ms`).toBeGreaterThan(300);
    expect(span).toBeLessThan(800);

    const circles = samples.map((sample) => CIRCLE.exec(sample.clip)).filter((match): match is RegExpExecArray => !!match);
    expect(circles.length, `computed ::view-transition-new(root) clip-path was a circle in ${circles.length}/${samples.length} frames (e.g. "${samples[1]?.clip}")`).toBeGreaterThanOrEqual(5);
    const radii = circles.map((match) => Number(match[1]));
    radii.forEach((r, index) => {
      if (index) expect(r, `radius at frame ${index}`).toBeGreaterThanOrEqual(radii[index - 1] - 0.01);
    });
    expect(radii[radii.length - 1]).toBeGreaterThan(radii[0]);
    const farthest = Math.hypot(Math.max(origin.x, 1440 - origin.x), Math.max(origin.y, 900 - origin.y));
    expect(radii[radii.length - 1]).toBeLessThanOrEqual(farthest + 2);
    expect(Math.abs(Number(circles[0][2]) - origin.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(Number(circles[0][3]) - origin.y)).toBeLessThanOrEqual(2);

    // A second, interrupted reveal also completes cleanly in the real browser.
    await toggle(page).click();
    await toggle(page).click();
    await page.waitForTimeout(900);
    await expectTheme(page, 'dark'); // dark -> auto(light) -> dark
    expect(await stored(page, 'theme-mode')).toBe('dark');
    await expectHittable(page, THEME);
    expect(errors).toEqual([]);
  });
});
