/** Noms §9 dont la valeur ne doit jamais sortir dans un journal. */
export const SECRET_ENV_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'TOKEN_ENC_KEY',
  'SIGNING_PRIVATE_KEY',
  'BREVO_API_KEY',
  'GH_DISPATCH_TOKEN',
  'NVD_API_KEY',
  'PLACES_API_KEY',
] as const;

const PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]+/g,
  /\bAIza[0-9A-Za-z_-]{20,}/g,
  /\bBearer\s+[^\s"']+/gi,
];

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Record<string, string | number | boolean | null>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export interface LoggerOptions {
  /** Valeurs à masquer (en plus des motifs connus). */
  secrets?: readonly (string | undefined)[];
  sink?: (line: string) => void;
}

export function secretsFromEnv(env: NodeJS.ProcessEnv): string[] {
  return SECRET_ENV_NAMES.map((name) => env[name]?.trim() ?? '').filter(
    (value) => value.length >= 8,
  );
}

export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) out = out.split(secret).join('[masqué]');
  for (const pattern of PATTERNS) out = out.replace(pattern, '[masqué]');
  return out;
}

/**
 * Journal JSON d'une ligne. Champs simples seulement, jamais d'objet d'erreur
 * (une pile ou un message tiers peut contenir un secret). Tout passe par `redact`.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const secrets = (options.secrets ?? []).filter(
    (value): value is string => typeof value === 'string' && value.length >= 8,
  );
  const sink = options.sink ?? ((line: string) => console.log(line));
  const write = (level: LogLevel, event: string, fields: LogFields = {}) => {
    sink(redact(JSON.stringify({ level, event, ...fields }), secrets));
  };
  return {
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
  };
}

/** Code d'erreur sûr à journaliser : jamais le message ni la pile. */
export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(code))
      return code;
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && /^[a-z0-9_]{1,64}$/.test(message))
      return message;
  }
  return 'unknown';
}
