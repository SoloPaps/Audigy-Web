import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 4322;
const host = '127.0.0.1';
const pages = [
  `http://${host}:${port}/?theme=light`,
  `http://${host}:${port}/?theme=dark`,
  `http://${host}:${port}/dev/composants?theme=light`,
  `http://${host}:${port}/dev/composants?theme=dark`,
  `http://${host}:${port}/connexion?theme=light`,
  `http://${host}:${port}/connexion?theme=dark`,
  `http://${host}:${port}/sites?theme=light`,
  `http://${host}:${port}/sites?theme=dark`,
  `http://${host}:${port}/verifier?theme=light`,
  `http://${host}:${port}/verifier?theme=dark`,
  `http://${host}:${port}/search-console?theme=light`,
  `http://${host}:${port}/search-console?theme=dark`,
];

function waitForPort(timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, host, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs)
          reject(new Error(`astro dev muet sur le port ${port}`));
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

const server = spawn(
  'pnpm',
  [
    '--filter',
    '@audigy/web',
    'exec',
    'astro',
    'dev',
    '--host',
    host,
    '--port',
    String(port),
  ],
  {
    stdio: 'inherit',
    detached: true,
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  },
);

try {
  await waitForPort(120_000);
  await delay(300);
  const dir = await mkdtemp(path.join(tmpdir(), 'audigy-lh-'));
  const failures = [];
  for (const [index, url] of pages.entries()) {
    const output = path.join(dir, `${index}.json`);
    const child = spawn(
      'pnpm',
      [
        'exec',
        'lighthouse',
        url,
        '--only-categories=accessibility',
        '--quiet',
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        `--output-path=${output}`,
        '--output=json',
      ],
      { stdio: 'inherit' },
    );
    const code = await new Promise((resolve) => child.on('exit', resolve));
    if (code !== 0) failures.push(`${url} lighthouse a quitté ${code}`);
    const report = JSON.parse(await readFile(output, 'utf8'));
    const score = report.categories?.accessibility?.score;
    if (score !== 1) {
      const audits = Object.values(report.audits ?? {})
        .filter((audit) => audit.score !== null && audit.score < 1)
        .map((audit) => audit.id);
      failures.push(`${url} score ${score} : ${audits.join(', ')}`);
    }
  }
  await rm(dir, { recursive: true, force: true });
  if (failures.length > 0) {
    throw new Error(failures.join('\n'));
  }
} finally {
  if (server.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
}
