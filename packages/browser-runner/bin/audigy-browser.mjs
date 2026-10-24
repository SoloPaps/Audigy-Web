#!/usr/bin/env node
// Node 22 exécute le TypeScript du dépôt (suppression des types). Les imports relatifs
// en `.js` (convention NodeNext) sont redirigés vers le fichier `.ts` voisin.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const relative =
        specifier.startsWith('./') || specifier.startsWith('../');
      if (
        error?.code === 'ERR_MODULE_NOT_FOUND' &&
        relative &&
        specifier.endsWith('.js')
      )
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      throw error;
    }
  },
});

const { main } = await import('../src/cli.ts');
process.exitCode = await main(process.argv.slice(2), {
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  env: process.env,
  cwd: process.env.INIT_CWD ?? process.cwd(),
});
