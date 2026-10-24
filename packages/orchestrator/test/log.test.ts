import { describe, expect, it } from 'vitest';
import {
  createLogger,
  errorCode,
  redact,
  SECRET_ENV_NAMES,
  secretsFromEnv,
} from '../src/index.js';

const SERVICE = 'service-role-value-1234567890';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZSJ9.c2lnbmF0dXJl';

describe('journal', () => {
  it('lit les secrets §9 présents, ignore les valeurs courtes', () => {
    expect(SECRET_ENV_NAMES).toContain('GH_DISPATCH_TOKEN');
    expect(
      secretsFromEnv({
        SUPABASE_SERVICE_ROLE_KEY: ` ${SERVICE} `,
        GOOGLE_API_KEY: 'court',
        APP_BASE_URL: 'https://audigy.example',
      }),
    ).toEqual([SERVICE]);
  });

  it('masque valeurs connues, JWT, clés sb_, jetons GitHub, clés Google, Bearer', () => {
    const text = [
      SERVICE,
      JWT,
      'sb_secret_abcDEF123',
      'ghp_abcdefABCDEF0123456789',
      'github_pat_11ABCDEF_xyz',
      'AIzaSyA-0123456789abcdefghijk',
      'Bearer opaque.token',
    ].join(' ');
    const out = redact(text, [SERVICE]);
    expect(out).not.toMatch(/service-role|eyJ|sb_secret|ghp_|github_pat|AIza/);
    expect(out).not.toContain('opaque.token');
    expect(out.match(/\[masqué\]/g)?.length).toBe(7);
  });

  it('masque un jeton Google de rafraîchissement et d’accès', () => {
    const refresh = '1//0refresh-token-sentinel';
    const access = 'ya29.access-token-sentinel';
    const out = redact(`${refresh} ${access}`, []);
    expect(out).not.toContain('refresh-token-sentinel');
    expect(out).not.toContain('access-token-sentinel');
  });

  it('écrit une ligne JSON masquée', () => {
    const lines: string[] = [];
    const log = createLogger({
      secrets: [SERVICE, undefined, 'abc'],
      sink: (line) => lines.push(line),
    });
    log.warn('dispatch', { auditId: 'x', detail: `clé ${SERVICE}`, n: 2 });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toEqual({
      level: 'warn',
      event: 'dispatch',
      auditId: 'x',
      detail: 'clé [masqué]',
      n: 2,
    });
  });

  it('ne garde d’une erreur qu’un code sûr', () => {
    expect(errorCode({ code: '23505' })).toBe('23505');
    expect(errorCode(new Error('site_lookup_failed'))).toBe(
      'site_lookup_failed',
    );
    expect(errorCode(new Error(`échec avec ${SERVICE}`))).toBe('unknown');
    expect(errorCode({ code: 'a b' })).toBe('unknown');
    expect(errorCode('texte')).toBe('unknown');
  });
});
