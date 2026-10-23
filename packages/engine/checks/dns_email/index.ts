import type { Check } from '../../src/types.js';
import { caaCheck } from './caa.js';
import { dkimCheck } from './dkim.js';
import { dmarcCheck } from './dmarc.js';
import { dnssecCheck } from './dnssec.js';
import { mtaStsCheck } from './mta-sts.js';
import { mxCheck } from './mx.js';
import { spfCheck } from './spf.js';
import { tlsRptCheck } from './tls-rpt.js';

export { DKIM_SELECTORS } from './dkim.js';

/** Checks passifs du domaine DNS et e-mail (PART-09). Triés par identifiant. */
export const DNS_EMAIL_CHECKS: readonly Check[] = [
  caaCheck,
  dkimCheck,
  dmarcCheck,
  dnssecCheck,
  mtaStsCheck,
  mxCheck,
  spfCheck,
  tlsRptCheck,
];
