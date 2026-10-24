import { t } from '../i18n/index.js';
import { translate } from './translate.js';

export interface VerificationView {
  id: string;
  status: string;
  method: string;
  token: string;
  dnsName: string;
  dnsValue: string;
  fileUrl: string;
  pageUrl: string;
  metaTag: string;
  found?: boolean;
  inconclusive?: boolean;
}

function messageFromBody(body: unknown): string {
  if (!body || typeof body !== 'object') return t('verify.error');
  const key = (body as { messageKey?: unknown }).messageKey;
  if (typeof key !== 'string') return t('verify.error');
  return translate(key) ?? t('verify.error');
}

async function post(
  path: string,
  token: string,
  body: unknown,
): Promise<VerificationView | { error: string }> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'post'.toUpperCase(),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: t('verify.error') };
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== 'object') {
    return { error: messageFromBody(payload) };
  }
  const row = payload as Partial<VerificationView>;
  if (typeof row.id !== 'string' || typeof row.token !== 'string') {
    return { error: t('verify.error') };
  }
  return row as VerificationView;
}

export async function createVerification(
  token: string,
  siteId: string,
  method: string,
): Promise<VerificationView | { error: string }> {
  return post('/api/verifications', token, { siteId, method });
}

export async function checkVerification(
  token: string,
  verificationId: string,
): Promise<VerificationView | { error: string }> {
  return post('/api/verifications/check', token, { verificationId });
}

export function isVerificationError(
  value: VerificationView | { error: string },
): value is { error: string } {
  return 'error' in value;
}
