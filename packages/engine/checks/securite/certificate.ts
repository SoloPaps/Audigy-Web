import type { TlsProbeResult } from '@audigy/net';
import type { Check, CheckResult } from '../../src/types.js';
import { CERT_SOON_DAYS, finding, hostName } from './shared.js';

const ID = 'securite.certificate';

export function judgeCertificate(probe: TlsProbeResult): CheckResult {
  const { certificate } = probe;
  const measured = {
    daysRemaining: certificate.daysRemaining,
    authorized: probe.authorized,
    hostnameMatches: probe.hostnameMatches,
    validTo: certificate.validTo,
    protocol: probe.protocol,
  };
  if (certificate.expired || certificate.daysRemaining < 0) {
    return finding(ID, 'fail', 4, 3, 'securite.certificate.fail_expired', {
      measured,
    });
  }
  if (certificate.notYetValid) {
    return finding(ID, 'fail', 4, 3, 'securite.certificate.fail_not_yet', {
      measured,
    });
  }
  if (!probe.hostnameMatches) {
    return finding(ID, 'fail', 4, 3, 'securite.certificate.fail_hostname', {
      measured,
    });
  }
  if (!probe.authorized) {
    return finding(ID, 'fail', 4, 3, 'securite.certificate.fail_chain', {
      measured,
    });
  }
  if (certificate.daysRemaining === 0) {
    return finding(ID, 'warn', 2, 2, 'securite.certificate.warn_today', {
      measured,
    });
  }
  if (certificate.daysRemaining < CERT_SOON_DAYS) {
    return finding(ID, 'warn', 2, 2, 'securite.certificate.warn_soon', {
      measured,
      params: { jours: certificate.daysRemaining },
    });
  }
  return finding(ID, 'pass', 1, 1, 'securite.certificate.pass', {
    measured,
    params: { jours: certificate.daysRemaining },
  });
}

export const certificateCheck: Check = {
  id: ID,
  domain: 'securite',
  mode: 'passive',
  needs: ['tls'],
  weight: 3,
  async run(ctx) {
    return judgeCertificate(
      await ctx.net.tls(hostName(ctx.target.url.hostname)),
    );
  },
};
