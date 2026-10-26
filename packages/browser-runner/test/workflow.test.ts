import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { violationsInText } from '../../../scripts/guard-no-deploy.js';

const file = new URL(
  '../../../.github/workflows/browser-audit.yml',
  import.meta.url,
);
const text = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
const OPEN = `$\{{`;
const expr = (inner: string) => `${OPEN} ${inner} }}`;

/** Contenu des clés `run:` (ligne simple ou bloc `|`). */
function runScripts(yaml: string): string[] {
  const lines = yaml.split('\n');
  const scripts: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(\s*)(?:- )?run: (.*)$/.exec(lines[i] ?? '');
    if (!match) continue;
    const indent = match[1]?.length ?? 0;
    if (match[2] !== '|') {
      scripts.push(match[2] ?? '');
      continue;
    }
    const block: string[] = [];
    while (i + 1 < lines.length) {
      const next = lines[i + 1] ?? '';
      if (next.trim() !== '' && next.search(/\S/) <= indent) break;
      block.push(next);
      i += 1;
    }
    scripts.push(block.join('\n'));
  }
  return scripts;
}

describe('workflow browser-audit.yml', () => {
  it('ne se déclenche qu’à la demande, avec un auditId obligatoire', () => {
    expect(text).toMatch(
      /^on:\n {2}workflow_dispatch:\n {4}inputs:\n {6}auditId:/m,
    );
    expect(text).toMatch(/auditId:[\s\S]*?required: true[\s\S]*?type: string/);
    expect(text).not.toMatch(/^\s+(push|pull_request|schedule):/m);
  });

  it('borne les droits et la durée', () => {
    expect(text).toMatch(/^permissions:\n {2}contents: read$/m);
    expect(text).toContain('timeout-minutes: 15');
    expect(text).toContain('persist-credentials: false');
  });

  it("n'injecte jamais l'entrée dans un script : variable d'environnement validée", () => {
    const scripts = runScripts(text);
    expect(scripts.length).toBeGreaterThanOrEqual(3);
    for (const script of scripts) expect(script).not.toContain(OPEN);
    expect(text).toContain(`AUDIT_ID: ${expr('inputs.auditId')}`);
    expect(text).toMatch(/\[\[ "\$AUDIT_ID" =~ \^\[0-9a-fA-F\]\{8\}-/);
    expect(text).toContain('run job "$AUDIT_ID"');
  });

  it('lit les scripts même si le checkout est en CRLF', () => {
    const crlf = text.replace(/\n/g, '\r\n');
    expect(crlf).toContain('\r\n');
    const scripts = runScripts(crlf.replace(/\r\n/g, '\n'));
    expect(scripts.length).toBeGreaterThanOrEqual(3);
    expect(
      scripts.some((script) => script.includes('run job "$AUDIT_ID"')),
    ).toBe(true);
  });

  it('lit les secrets par leur nom seulement, sans déploiement', () => {
    expect(text).toContain(expr('secrets.SUPABASE_SERVICE_ROLE_KEY'));
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    expect(violationsInText(text, 'browser-audit.yml')).toEqual([]);
  });
});
