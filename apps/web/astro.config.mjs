import svelte from '@astrojs/svelte';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [svelte()],
  output: 'static',
  build: {
    format: 'directory',
  },
});
