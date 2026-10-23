import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scan } from './guard-no-deploy.js';

async function withFixture(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'audigy-guard-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('guard-no-deploy', () => {
  it('accepte ce dépôt', async () => {
    expect(await scan(process.cwd())).toEqual([]);
  });

  it('échoue sur un workflow qui contient netlify deploy', async () => {
    await withFixture(async (dir) => {
      const workflow = path.join(dir, '.github', 'workflows');
      await mkdir(workflow, { recursive: true });
      await writeFile(
        path.join(workflow, 'deploy.yml'),
        'name: bad\non: push\njobs:\n  d:\n    runs-on: ubuntu-latest\n    steps:\n      - run: netlify deploy --build --prod\n',
      );
      const hits = await scan(dir);
      expect(hits).toEqual([
        {
          file: path.join('.github', 'workflows', 'deploy.yml'),
          rule: 'netlify-deploy',
        },
      ]);
    });
  });

  it('échoue sur l’action nwtgck, un jeton, un build hook, un contexte et une liaison', async () => {
    await withFixture(async (dir) => {
      const workflow = path.join(dir, '.github', 'workflows');
      await mkdir(workflow, { recursive: true });
      await writeFile(
        path.join(workflow, 'bad.yml'),
        'uses: nwtgck/actions-netlify@v3\nenv:\n  NETLIFY_AUTH_TOKEN: x\n',
      );
      await writeFile(
        path.join(dir, 'netlify.toml'),
        '[context.deploy-preview]\ncommand = "curl https://api.netlify.com/build_hooks/abc"\n',
      );
      await writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({
          scripts: { link: 'netlify link', ship: 'netlify deploy' },
        }),
      );
      const rules = new Set((await scan(dir)).map((hit) => hit.rule));
      expect(rules).toEqual(
        new Set([
          'actions-netlify',
          'auth-token',
          'build-hook',
          'deploy-context',
          'netlify-link',
          'netlify-deploy',
        ]),
      );
    });
  });

  it('accepte un workflow, un toml de dev et des scripts sans déploiement', async () => {
    await withFixture(async (dir) => {
      const workflow = path.join(dir, '.github', 'workflows');
      await mkdir(workflow, { recursive: true });
      await writeFile(
        path.join(workflow, 'ci.yml'),
        'name: ci\non: push\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm test\n',
      );
      await writeFile(
        path.join(dir, 'netlify.toml'),
        '[build]\ncommand = "pnpm build"\npublish = "apps/web/dist"\n\n[dev]\nport = 8888\n\n[context.dev]\ncommand = "pnpm build"\n',
      );
      await writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ scripts: { check: 'pnpm test' } }),
      );
      expect(await scan(dir)).toEqual([]);
    });
  });
});
