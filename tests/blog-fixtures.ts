import { spawn, type ChildProcess } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

const sourceRoot = path.resolve(__dirname, '..');
export const fixtureOrigin = 'https://blog-fixture.example.test';
export const fixturePort = 3137;
const fixtureControlFile = path.join(tmpdir(), `portfolio-blog-playwright-${process.env.USER ?? 'local'}.json`);
const appEntries = [
  'app',
  'public',
  'scripts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next-env.d.ts',
  'next.config.js',
  'postcss.config.js',
  '.eslintrc.json',
  '.eslintignore',
];

export type FixturePost = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  status: 'draft' | 'published';
  topics?: string[];
  body: string;
};

type FixtureState = { projectRoot: string; serverPid: number; port: number };

type OriginEnvironment = { siteOrigin?: string; vercelOrigin?: string };

export const blogFixtures: FixturePost[] = [
  {
    slug: 'fixture-newest',
    title: ('Fixture Newest: ' + 'A deliberately long supplied title for responsive reading '.repeat(3)).trim(),
    summary: 'Newest fixture summary.',
    publishedAt: '2026-11-06',
    status: 'published',
    topics: ['Portfolio', 'Learning'],
    body: [
      'A paragraph with **bold text**, [a reference link][guide], and `inline code`.',
      '',
      '## Overview',
      '',
      '- First item',
      '- Second item',
      '',
      '1. Ordered one',
      '2. Ordered two',
      '',
      '![Fixture illustration](/images/blog/fixture.svg)',
      '',
      '```text',
      `A code sample that preserves spaces:    keep these spaces. ${'a long code sample that must overflow its own scroll container '.repeat(5)}`,
      '```',
      '',
      '[guide]: https://example.test/guide',
      '',
      `[${'long-unbroken-link-label'.repeat(15)}](https://example.test/long-link)`,
    ].join('\n'),
  },
  {
    slug: 'fixture-tie-alpha',
    title: 'Fixture Tie Alpha',
    summary: 'The earlier alphabetical tied fixture.',
    publishedAt: '2026-11-05',
    status: 'published',
    body: '## Alpha\n\nA shorter article.',
  },
  {
    slug: 'fixture-tie-beta',
    title: 'Fixture Tie Beta',
    summary: 'The later alphabetical tied fixture.',
    publishedAt: '2026-11-05',
    status: 'published',
    topics: [],
    body: '## Beta\n\nA second tied article.',
  },
  {
    slug: 'fixture-future',
    title: 'Fixture Future',
    summary: 'An explicitly published future-dated fixture.',
    publishedAt: '2999-01-01',
    status: 'published',
    body: '## Future\n\nPublished status makes this visible.',
  },
  {
    slug: 'draft-sentinel-7f4d2',
    title: 'Draft Sentinel Title 7f4d2',
    summary: 'Draft Sentinel Summary 7f4d2.',
    publishedAt: '2026-11-07',
    status: 'draft',
    body: '## Private\n\nDraft Sentinel Body 7f4d2.',
  },
];

function toMarkdown(post: FixturePost): string {
  const { body, ...metadata } = post;
  return `---json\n${JSON.stringify(metadata, null, 2)}\n---\n\n${body}\n`;
}

async function populateProject(projectRoot: string, posts: FixturePost[]): Promise<void> {
  for (const entry of appEntries) {
    await cp(path.join(sourceRoot, entry), path.join(projectRoot, entry), {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}.next${path.sep}`),
    });
  }

  await symlink(path.join(sourceRoot, 'node_modules'), path.join(projectRoot, 'node_modules'), 'dir');

  await writePosts(projectRoot, posts);
  const imagesDirectory = path.join(projectRoot, 'public/images/blog');
  await mkdir(imagesDirectory, { recursive: true });
  await writeFile(
    path.join(imagesDirectory, 'fixture.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="#087f5b"/></svg>',
    'utf8',
  );
}

async function writePosts(projectRoot: string, posts: FixturePost[]): Promise<void> {
  const postsDirectory = path.join(projectRoot, 'app/data/blog');
  await rm(postsDirectory, { recursive: true, force: true });
  if (posts.length) await mkdir(postsDirectory, { recursive: true });
  for (const post of posts) {
    await writeFile(path.join(postsDirectory, `${post.slug}.md`), toMarkdown(post), 'utf8');
  }
}

export async function createIsolatedProject(posts: FixturePost[] = blogFixtures): Promise<string> {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'portfolio-blog-'));
  try {
    await populateProject(projectRoot, posts);
    return projectRoot;
  } catch (error) {
    await rm(projectRoot, { recursive: true, force: true });
    throw error;
  }
}

let activeBuild: ChildProcess | undefined;

async function terminateActiveBuild(): Promise<void> {
  const child = activeBuild;
  if (!child?.pid || child.pid <= 1 || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timeout = setTimeout(() => {
      if (child.pid && child.pid > 1) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
      }
      resolve();
    }, 10_000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', detached: process.platform !== 'win32' });
    activeBuild = child;
    const onSignal = () => { void terminateActiveBuild(); };
    const onExit = () => {
      if (child.pid && child.pid > 1 && child.exitCode === null && child.signalCode === null) {
        try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch { /* Already exited. */ }
      }
    };
    const cleanup = () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
      process.off('exit', onExit);
      activeBuild = undefined;
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    process.once('exit', onExit);
    child.once('error', (error) => { cleanup(); reject(error); });
    child.once('exit', (code, signal) => {
      cleanup();
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed (${signal ?? code})`));
    });
  });
}

export async function buildIsolatedProject(
  projectRoot: string,
  posts: FixturePost[] = blogFixtures,
  origins: OriginEnvironment = { siteOrigin: fixtureOrigin },
): Promise<void> {
  await writePosts(projectRoot, posts);
  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    ...(origins.siteOrigin ? { NEXT_PUBLIC_SITE_URL: origins.siteOrigin } : { NEXT_PUBLIC_SITE_URL: '' }),
    ...(origins.vercelOrigin
      ? { VERCEL_PROJECT_PRODUCTION_URL: origins.vercelOrigin }
      : { VERCEL_PROJECT_PRODUCTION_URL: '' }),
  };
  await run('npm', ['run', 'build'], projectRoot, env);
}

async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (error) => reject(new Error(`Fixture port ${port} is already in use: ${error.message}`)));
    server.listen(port, () => server.close((error) => (error ? reject(error) : resolve())));
  });
}

async function waitForReady(child: ChildProcess, port: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Fixture server exited early (${child.signalCode ?? child.exitCode})`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/blog`);
      if (response.status >= 200 && response.status < 400) return;
      lastError = new Error(`Fixture server returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Fixture server did not become ready on ${port}: ${String(lastError)}`);
}

async function waitForExit(childPid: number): Promise<void> {
  if (!Number.isSafeInteger(childPid) || childPid <= 1) return;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      process.kill(childPid, 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try {
    process.kill(childPid, 'SIGKILL');
  } catch {
    // The child already exited.
  }
}

async function startServer(projectRoot: string, port = fixturePort): Promise<number> {
  await assertPortFree(port);
  const env = {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    PORT: String(port),
  };
  const child = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let serverError = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    serverError += chunk.toString();
  });
  child.once('error', (error) => {
    serverError += error.message;
  });
  await waitForReady(child, port).catch(async (error: unknown) => {
    if (child.exitCode === null) child.kill('SIGTERM');
    if (child.pid && child.pid > 1) await waitForExit(child.pid);
    throw new Error(`${String(error)}\n${serverError}`);
  });
  if (!child.pid || child.pid <= 1) throw new Error('Fixture server started without a valid process id');
  return child.pid;
}

async function readState(): Promise<FixtureState> {
  return JSON.parse(await readFile(fixtureControlFile, 'utf8')) as FixtureState;
}

async function writeState(state: FixtureState): Promise<void> {
  await writeFile(fixtureControlFile, JSON.stringify(state), 'utf8');
}

async function stopServer(serverPid: number): Promise<void> {
  if (!Number.isSafeInteger(serverPid) || serverPid <= 1) return;
  try {
    process.kill(serverPid, 'SIGTERM');
  } catch {
    return;
  }
  await waitForExit(serverPid);
}

export async function restartFixtureServer(
  posts: FixturePost[],
  origins: OriginEnvironment = { siteOrigin: fixtureOrigin },
): Promise<void> {
  const state = await readState();
  await stopServer(state.serverPid);
  await buildIsolatedProject(state.projectRoot, posts, origins);
  const serverPid = await startServer(state.projectRoot, state.port);
  await writeState({ ...state, serverPid });
}

export async function fixtureProjectPath(): Promise<string> {
  return (await readState()).projectRoot;
}

export async function setup(): Promise<() => Promise<void>> {
  await assertPortFree(fixturePort);
  const projectRoot = await createIsolatedProject();
  let serverPid: number | undefined;
  try {
    await buildIsolatedProject(projectRoot);
    serverPid = await startServer(projectRoot);
    await writeState({ projectRoot, serverPid, port: fixturePort });
  } catch (error) {
    await terminateActiveBuild();
    if (serverPid !== undefined) await stopServer(serverPid);
    await rm(projectRoot, { recursive: true, force: true });
    throw error;
  }
  return async () => {
    try {
      const state = await readState();
      await stopServer(state.serverPid);
      await rm(state.projectRoot, { recursive: true, force: true });
    } finally {
      await rm(fixtureControlFile, { force: true });
      }
  };
}

export default setup;
