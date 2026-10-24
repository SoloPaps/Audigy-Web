import type { Check } from '../../src/types.js';
import { BROWSER_KEY, loadBrowser, loadLegal } from './facts.js';
import {
  judgeCmp,
  judgeElements,
  judgeMentions,
  judgePrivacy,
  judgeReject,
  judgeThirdParty,
  judgeTrackers,
} from './judge.js';

export { BROWSER_KEY };

/** Les pages légales peuvent attendre le rythme d’une requête par seconde. */
export const VIE_PRIVEE_TIMEOUT_MS = 45_000;

function hostOf(ctx: { target: { url: URL } }): string {
  return ctx.target.url.hostname;
}

/** Checks passifs du domaine Vie privée (PART-14). */
export const VIE_PRIVEE_CHECKS: readonly Check[] = [
  {
    id: 'vie_privee.cmp',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['browser'],
    weight: 2,
    async run(ctx) {
      return judgeCmp(await loadBrowser(ctx), hostOf(ctx));
    },
  },
  {
    id: 'vie_privee.confidentialite',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['http'],
    weight: 2,
    timeoutMs: VIE_PRIVEE_TIMEOUT_MS,
    async run(ctx) {
      return judgePrivacy(await loadLegal(ctx));
    },
  },
  {
    id: 'vie_privee.elements',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['http'],
    weight: 1,
    timeoutMs: VIE_PRIVEE_TIMEOUT_MS,
    async run(ctx) {
      return judgeElements(await loadLegal(ctx));
    },
  },
  {
    id: 'vie_privee.mentions',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['http'],
    weight: 2,
    timeoutMs: VIE_PRIVEE_TIMEOUT_MS,
    async run(ctx) {
      return judgeMentions(await loadLegal(ctx));
    },
  },
  {
    id: 'vie_privee.refus',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['browser'],
    weight: 3,
    async run(ctx) {
      return judgeReject(await loadBrowser(ctx), hostOf(ctx));
    },
  },
  {
    id: 'vie_privee.tiers',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['browser'],
    weight: 2,
    async run(ctx) {
      return judgeThirdParty(await loadBrowser(ctx), hostOf(ctx));
    },
  },
  {
    id: 'vie_privee.traceurs',
    domain: 'vie_privee',
    mode: 'passive',
    needs: ['browser'],
    weight: 3,
    async run(ctx) {
      return judgeTrackers(await loadBrowser(ctx), hostOf(ctx));
    },
  },
];
