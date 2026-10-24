import { describe, expect, it, vi } from 'vitest';
import {
  BROWSER_WORKFLOW,
  createGithubDispatcher,
  createLogger,
  createTrigger,
  RUN_FUNCTION_PATH,
  signTrigger,
  TRIGGER_HEADER,
  verifyTrigger,
} from '../src/index.js';

const KEY = 'cle-de-test-service-role-0123456789';
const TOKEN = 'ghp_jetonDeTest0123456789abcdef';
const AUDIT = '6f1c1f52-6a43-4d55-9d0c-3c2b1f6e7a10';

function capture() {
  const lines: string[] = [];
  return {
    lines,
    logger: createLogger({ secrets: [TOKEN], sink: (l) => lines.push(l) }),
  };
}

describe('réveil signé', () => {
  it('accepte sa signature pendant 5 min, refuse le reste', () => {
    const now = 1_800_000_000_000;
    const header = signTrigger(KEY, now);
    expect(verifyTrigger(KEY, header, now + 60_000)).toBe(true);
    expect(verifyTrigger(KEY, header, now + 6 * 60_000)).toBe(false);
    expect(verifyTrigger('autre-cle-0123456789', header, now)).toBe(false);
    expect(verifyTrigger(KEY, null, now)).toBe(false);
    expect(verifyTrigger('', header, now)).toBe(false);
    expect(verifyTrigger(KEY, `${now}.zz`, now)).toBe(false);
    const [ts, mac] = header.split('.');
    expect(verifyTrigger(KEY, `${Number(ts) + 1}.${mac}`, now)).toBe(false);
  });

  it('appelle la fonction background avec l’en-tête', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    await createTrigger({ origin: 'http://localhost:8888', key: KEY, fetch })();
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe(`http://localhost:8888${RUN_FUNCTION_PATH}`);
    const header = new Headers(init.headers).get(TRIGGER_HEADER);
    expect(verifyTrigger(KEY, header)).toBe(true);
    const refused = createTrigger({
      origin: 'http://localhost:8888',
      key: KEY,
      fetch: async () => new Response(null, { status: 401 }),
    });
    await expect(refused()).rejects.toThrow('trigger_rejected');
  });
});

describe('déclenchement du runner GitHub', () => {
  it('sans jeton : aucun appel', async () => {
    const fetch = vi.fn();
    const { logger, lines } = capture();
    const result = await createGithubDispatcher({
      token: ' ',
      logger,
      fetch,
    }).dispatch(AUDIT);
    expect(result).toEqual({ ok: false, reason: 'not_configured' });
    expect(fetch).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain('runner_dispatch_skipped');
  });

  it('204 : workflow_dispatch avec l’identifiant d’audit', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const { logger, lines } = capture();
    const result = await createGithubDispatcher({
      token: TOKEN,
      logger,
      fetch,
    }).dispatch(AUDIT);
    expect(result).toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      `https://api.github.com/repos/${BROWSER_WORKFLOW.owner}/${BROWSER_WORKFLOW.repo}/actions/workflows/${BROWSER_WORKFLOW.workflow}/dispatches`,
    );
    expect(JSON.parse(String(init.body))).toEqual({
      ref: 'main',
      inputs: { auditId: AUDIT },
    });
    expect(new Headers(init.headers).get('authorization')).toBe(
      `Bearer ${TOKEN}`,
    );
    expect(lines.join('\n')).not.toContain(TOKEN);
  });

  it('refus ou panne réseau : pas de jeton dans le journal', async () => {
    const { logger, lines } = capture();
    const rejected = await createGithubDispatcher({
      token: TOKEN,
      logger,
      fetch: async () => new Response('Bad credentials', { status: 401 }),
    }).dispatch(AUDIT);
    expect(rejected).toEqual({ ok: false, reason: 'rejected' });
    const failed = await createGithubDispatcher({
      token: TOKEN,
      logger,
      fetch: async () => {
        throw new Error(`échec ${TOKEN}`);
      },
    }).dispatch(AUDIT);
    expect(failed).toEqual({ ok: false, reason: 'network' });
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).not.toContain(TOKEN);
  });
});
