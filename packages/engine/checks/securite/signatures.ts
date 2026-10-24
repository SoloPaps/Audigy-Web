import { createHash } from 'node:crypto';
import { looksLikeHtml } from '../../src/ownership.js';

export const EXPOSED_FILES = [
  { path: '.git/HEAD', kind: 'git_head' },
  { path: '.git/config', kind: 'git_config' },
  { path: '.env', kind: 'dotenv' },
  { path: '.env.local', kind: 'dotenv' },
  { path: '.env.production', kind: 'dotenv' },
  { path: '.env.bak', kind: 'dotenv' },
  { path: '.env.old', kind: 'dotenv' },
  { path: 'wp-config.php', kind: 'wp_config' },
  { path: 'wp-config.php.bak', kind: 'wp_config' },
  { path: 'wp-config.php.old', kind: 'wp_config' },
  { path: 'wp-config.php.save', kind: 'wp_config' },
  { path: 'config.php', kind: 'php_config' },
  { path: 'configuration.php', kind: 'php_config' },
  { path: 'web.config', kind: 'web_config' },
  { path: '.htpasswd', kind: 'htpasswd' },
  { path: 'backup.sql', kind: 'sql_dump' },
  { path: 'dump.sql', kind: 'sql_dump' },
  { path: 'database.sql', kind: 'sql_dump' },
  { path: 'db.sql', kind: 'sql_dump' },
  { path: 'backup.zip', kind: 'zip' },
  { path: 'site.zip', kind: 'zip' },
  { path: 'backup.tar.gz', kind: 'gzip' },
  { path: 'id_rsa', kind: 'private_key' },
  { path: '.ssh/id_rsa', kind: 'private_key' },
  { path: 'phpinfo.php', kind: 'phpinfo' },
  { path: 'info.php', kind: 'phpinfo' },
  { path: '.aws/credentials', kind: 'aws' },
  { path: '.svn/entries', kind: 'svn' },
  { path: '.svn/wc.db', kind: 'svn_db' },
  { path: '.npmrc', kind: 'npmrc' },
  { path: 'appsettings.json', kind: 'appsettings' },
  { path: 'secrets.json', kind: 'secret_json' },
] as const;

export type ExposedKind = (typeof EXPOSED_FILES)[number]['kind'];

/** Dossiers souvent laissés en liste automatique. */
export const LISTING_DIRS = [
  '',
  'images/',
  'uploads/',
  'files/',
  'backup/',
  'assets/',
  'static/',
  'media/',
  'wp-content/uploads/',
] as const;

export const TLS_VERSIONS = [
  { id: 'TLSv1', label: '1.0' },
  { id: 'TLSv1.1', label: '1.1' },
  { id: 'TLSv1.2', label: '1.2' },
  { id: 'TLSv1.3', label: '1.3' },
] as const;

const SECRET_LINE =
  /^(?:export\s+)?[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|KEY|DATABASE)[A-Z0-9_]*=\S/m;

export function sameBody(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return left.equals(right);
}

export function decodeBody(body: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(
    body.subarray(0, 65_536),
  );
}

/**
 * Vrai seulement si le corps a la forme attendue pour ce chemin.
 * Une page HTML (repli d’application) ne compte pas, sauf phpinfo.
 */
export function matchesExposed(kind: ExposedKind, body: Uint8Array): boolean {
  if (kind === 'zip') {
    return (
      body.length >= 4 &&
      body[0] === 0x50 &&
      body[1] === 0x4b &&
      body[2] === 0x03 &&
      body[3] === 0x04
    );
  }
  if (kind === 'gzip')
    return body.length >= 2 && body[0] === 0x1f && body[1] === 0x8b;
  const text = decodeBody(body);
  if (kind === 'svn_db') return text.startsWith('SQLite format 3');
  if (looksLikeHtml(text) && kind !== 'phpinfo') return false;
  switch (kind) {
    case 'git_head':
      return (
        /^ref: refs\/[^\s]+\s*$/.test(text.trim()) ||
        /^[0-9a-f]{40}\s*$/i.test(text.trim())
      );
    case 'git_config':
      return /\[core\]/.test(text) && /repositoryformatversion/i.test(text);
    case 'dotenv':
      return SECRET_LINE.test(text);
    case 'wp_config':
      return /<\?php/.test(text) && /DB_(?:NAME|PASSWORD|USER)/.test(text);
    case 'php_config':
      return /<\?php/.test(text) && /password|database|db_pass/i.test(text);
    case 'web_config':
      return /<configuration/i.test(text) && /connectionString/i.test(text);
    case 'htpasswd':
      return /^[^:\s]{1,64}:(?:\$2[aby]\$|\$apr1\$|\{SHA\}|[A-Za-z0-9./]{13})\S*$/m.test(
        text,
      );
    case 'sql_dump':
      return /CREATE TABLE|INSERT INTO|mysqldump|PostgreSQL database dump/i.test(
        text,
      );
    case 'private_key':
      return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text);
    case 'phpinfo':
      return /phpinfo\(\)/i.test(text) || /<title[^>]*>\s*phpinfo/i.test(text);
    case 'aws':
      return /aws_(?:access_key_id|secret_access_key)/.test(text);
    case 'svn':
      return (
        /svn/i.test(text) && (/^\d+\s*$/m.test(text) || /wc-entries/.test(text))
      );
    case 'npmrc':
      return /_authToken|_auth=|\/\/registry\.npmjs\.org\//.test(text);
    case 'appsettings':
      return /"ConnectionStrings"|"Password"/.test(text);
    case 'secret_json':
      return /"(?:private_key|client_secret|api_key|api_secret)"/.test(text);
  }
}

/** Liste automatique Apache, nginx ou IIS. */
export function isDirectoryListing(text: string): boolean {
  return (
    /<title[^>]*>\s*index of\s+\//i.test(text) ||
    /<h1[^>]*>\s*index of\s+\//i.test(text) ||
    /\[to parent directory\]/i.test(text)
  );
}
