/**
 * @audigy/cli — `audigy audit <url> [--json] [--browser]`, audit passif en local.
 * Mêmes checks que la fonction Netlify, réseau `@audigy/net`. Jamais de test actif :
 * la propriété n'est pas vérifiée en local. `AUDIGY_LAB` : sites du labo (`pnpm lab`).
 * `--browser` : runner navigateur local s'il est disponible, sinon « Non testé ».
 */
export {
  type BrowserRunner,
  type CliDeps,
  type CliIo,
  runCli,
} from './main.js';
export { type BrowserState, renderText, translate } from './text.js';
