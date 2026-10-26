import { spawn } from 'node:child_process';
import { access, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandOptions, loadRootEnv } from './dev-env.mjs';
import { pruneUnreferenced } from './prune-dist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = 'apps/web/dist';
const devPage = path.join(dist, 'dev/composants/index.html');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, commandOptions());
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `${command} ${args.join(' ')} a échoué (${code ?? 'signal'})`,
          ),
        );
    });
  });
}

await loadRootEnv(root);
await run('pnpm', ['--filter', '@audigy/web', 'build']);
await run('node', ['scripts/build-functions.ts']);
await rm(path.join(dist, 'dev'), { recursive: true, force: true });

let leaked = true;
try {
  await access(devPage);
} catch (error) {
  if (error && error.code === 'ENOENT') leaked = false;
  else throw error;
}
if (leaked) {
  throw new Error(
    'La page /dev/composants est présente dans le build de production.',
  );
}

await pruneUnreferenced(dist);
await access(path.join(dist, 'index.html'));
await access(path.join(dist, 'dictionnaire-en.json'));
await access(path.join(dist, '.well-known', 'audigy-signing-key'));
const preuves = await readdir(path.join(dist, 'preuves'));
if (!preuves.some((name) => name.endsWith('.json'))) {
  throw new Error('dossier de preuve absent du build');
}

let stillThere = true;
try {
  await access(devPage);
} catch (error) {
  if (error && error.code === 'ENOENT') stillThere = false;
  else throw error;
}
if (stillThere)
  throw new Error(
    'La page /dev/composants est présente dans le build de production.',
  );

await run('pnpm', ['exec', 'tsx', 'scripts/publish-policy.ts']);
