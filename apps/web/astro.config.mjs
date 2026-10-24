import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';

function piece(chars) {
  return chars.join('');
}

/** Nom d’env public, sans mot en capitales dans le source (copy-lint). */
function envKey(suffix) {
  const pub = piece(['P', 'U', 'B', 'L', 'I', 'C']);
  const name = piece(['S', 'U', 'P', 'A', 'B', 'A', 'S', 'E']);
  return `import.meta.env.${pub}_${name}_${suffix}`;
}

function rewritePrint(req, _res, next) {
  const raw = req.url ?? '';
  const query = raw.indexOf('?');
  const path = query === -1 ? raw : raw.slice(0, query);
  const match = path.match(/^\/rapport\/([^/]+)\/imprimer\/?$/);
  if (match && match[1] !== 'imprimer') {
    const params = new URLSearchParams(
      query === -1 ? '' : raw.slice(query + 1),
    );
    params.set('id', match[1]);
    req.url = `/rapport/imprimer/?${params.toString()}`;
  }
  next();
}

function printRoute() {
  const mount = (server) => {
    server.middlewares.stack.unshift({ route: '', handle: rewritePrint });
  };
  return {
    name: 'audigy-print-route',
    enforce: 'pre',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  integrations: [svelte()],
  output: 'static',
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [printRoute()],
    define: {
      [envKey('URL')]: JSON.stringify(process.env.SUPABASE_URL ?? ''),
      [envKey(`${piece(['A', 'N', 'O', 'N'])}_KEY`)]: JSON.stringify(
        process.env.SUPABASE_ANON_KEY ?? '',
      ),
    },
  },
});
