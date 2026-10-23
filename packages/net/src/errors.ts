export type NetErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_SCHEME'
  | 'BLOCKED_PORT'
  | 'BLOCKED_CREDENTIALS'
  | 'BLOCKED_ADDRESS'
  | 'BLOCKED_METHOD'
  | 'DNS_FAILURE'
  | 'TOO_MANY_REDIRECTS'
  | 'RESPONSE_TOO_LARGE'
  | 'TIMEOUT'
  | 'BUDGET_EXCEEDED'
  | 'TLS_HANDSHAKE_FAILED'
  | 'NETWORK';

/** Erreur réseau typée. `code` est stable ; `message` est destiné aux journaux techniques. */
export class NetError extends Error {
  override readonly name = 'NetError';
  readonly code: NetErrorCode;

  constructor(
    code: NetErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.code = code;
  }
}

export function isNetError(
  value: unknown,
  code?: NetErrorCode,
): value is NetError {
  return (
    value instanceof NetError && (code === undefined || value.code === code)
  );
}
