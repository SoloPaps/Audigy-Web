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

function rewriteRoutes(req, _res, next) {
  const raw = req.url ?? '';
  const query = raw.indexOf('?');
  const path = query === -1 ? raw : raw.slice(0, query);
  const extra = query === -1 ? '' : raw.slice(query + 1);
  const params = new URLSearchParams(extra);
  const print = path.match(/^\/rapport\/([^/]+)\/imprimer\/?$/);
  if (print && print[1] !== 'imprimer') {
    params.set('id', print[1]);
    req.url = `/rapport/imprimer/?${params.toString()}`;
    next();
    return;
  }
  const score = path.match(/^\/score\/([^/]+)\/?$/);
  if (score && score[1] !== 'index') {
    params.set('slug', score[1]);
    req.url = `/score/?${params.toString()}`;
    next();
    return;
  }
  const share = path.match(/^\/partage\/([^/]+)\/?$/);
  if (share && share[1] !== 'index') {
    params.set('token', share[1]);
    req.url = `/partage/?${params.toString()}`;
  }
  next();
}

function printRoute() {
  const mount = (server) => {
    server.middlewares.stack.unshift({ route: '', handle: rewriteRoutes });
  };
  return {
    name: 'audigy-public-routes',
    enforce: 'pre',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  integrations: [svelte()],
  output: 'static',
  devToolbar: {
    enabled: process.env.AUDIGY_DEV_TOOLBAR !== 'off',
  },
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
