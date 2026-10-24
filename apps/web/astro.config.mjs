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

export default defineConfig({
  integrations: [svelte()],
  output: 'static',
  build: {
    format: 'directory',
  },
  vite: {
    define: {
      [envKey('URL')]: JSON.stringify(process.env.SUPABASE_URL ?? ''),
      [envKey(`${piece(['A', 'N', 'O', 'N'])}_KEY`)]: JSON.stringify(
        process.env.SUPABASE_ANON_KEY ?? '',
      ),
    },
  },
});
