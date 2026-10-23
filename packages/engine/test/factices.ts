import type { Check } from '../src/index.js';

/** Check passif factice : la page d'accueil répond 200 avec un `<title>` non vide. */
export const facticePassif: Check = {
  id: 'qualite.factice_passif',
  domain: 'qualite',
  mode: 'passive',
  needs: ['http'],
  weight: 2,
  async run(ctx) {
    const home = await ctx.shared.get('home', () =>
      ctx.net.fetch(ctx.target.url, { signal: ctx.signal }),
    );
    const title = /<title>([^<]*\S[^<]*)<\/title>/i.exec(home.text());
    const ok = home.status === 200 && title !== null;
    return {
      status: ok ? 'pass' : 'fail',
      severity: ok ? 1 : 2,
      impact: 2,
      measured: { status: home.status, hasTitle: title !== null },
      messageKey: ok ? 'test.factice_passif.pass' : 'test.factice_passif.fail',
      fixKey: 'qualite.factice_passif',
    };
  },
};

/** Check actif factice : un chemin non lié ne doit pas être exposé. */
export const FACTICE_PATH = '/.audigy-factice';
export const facticeActif: Check = {
  id: 'securite.factice_actif',
  domain: 'securite',
  mode: 'active',
  needs: ['http'],
  weight: 3,
  async run(ctx) {
    const res = await ctx.net.fetch(new URL(FACTICE_PATH, ctx.target.url), {
      signal: ctx.signal,
    });
    const exposed = res.status === 200;
    return {
      status: exposed ? 'fail' : 'pass',
      severity: exposed ? 4 : 1,
      impact: 3,
      measured: { status: res.status },
      messageKey: exposed
        ? 'test.factice_actif.fail'
        : 'test.factice_actif.pass',
      fixKey: 'securite.factice_actif',
    };
  },
};
