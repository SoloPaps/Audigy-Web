import type { Check } from '../../src/types.js';
import { certificateCheck } from './certificate.js';
import { cookiesCheck } from './cookies.js';
import { cspCheck } from './csp.js';
import { framesCheck } from './frames.js';
import { hstsCheck } from './hsts.js';
import { httpsCheck } from './https.js';
import { mixedCheck } from './mixed.js';
import { permissionsCheck } from './permissions.js';
import { referrerCheck } from './referrer.js';
import { securityTxtCheck } from './security-txt.js';
import { xctoCheck } from './xcto.js';

/** Checks passifs du domaine Sécurité (PART-06). Triés par identifiant. */
export const SECURITE_CHECKS: readonly Check[] = [
  certificateCheck,
  cookiesCheck,
  cspCheck,
  framesCheck,
  hstsCheck,
  httpsCheck,
  mixedCheck,
  permissionsCheck,
  referrerCheck,
  securityTxtCheck,
  xctoCheck,
];
