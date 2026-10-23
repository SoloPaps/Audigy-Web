import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TestCerts {
  caCert: string;
  leafKey: string;
  leafCert: string;
  selfKey: string;
  selfCert: string;
}

/** Génère une AC de test, un certificat feuille signé (SAN audigy.test) et un autosigné. */
export function generateTestCerts(): TestCerts {
  const dir = mkdtempSync(join(tmpdir(), 'audigy-net-'));
  const p = (f: string) => join(dir, f);
  const ssl = (...args: string[]) =>
    execFileSync('openssl', args, { stdio: 'pipe' });
  const ec = ['-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes'];
  try {
    ssl(
      'req',
      '-x509',
      ...ec,
      '-keyout',
      p('ca.key'),
      '-out',
      p('ca.crt'),
      '-days',
      '30',
      '-subj',
      '/CN=Audigy Test CA',
      '-addext',
      'basicConstraints=critical,CA:TRUE',
      '-addext',
      'keyUsage=critical,keyCertSign',
    );
    ssl(
      'req',
      ...ec,
      '-keyout',
      p('leaf.key'),
      '-out',
      p('leaf.csr'),
      '-subj',
      '/CN=audigy.test',
    );
    writeFileSync(
      p('leaf.ext'),
      'subjectAltName=DNS:audigy.test,DNS:www.audigy.test\n',
    );
    ssl(
      'x509',
      '-req',
      '-in',
      p('leaf.csr'),
      '-CA',
      p('ca.crt'),
      '-CAkey',
      p('ca.key'),
      '-set_serial',
      '2',
      '-days',
      '30',
      '-extfile',
      p('leaf.ext'),
      '-out',
      p('leaf.crt'),
    );
    ssl(
      'req',
      '-x509',
      ...ec,
      '-keyout',
      p('self.key'),
      '-out',
      p('self.crt'),
      '-days',
      '30',
      '-subj',
      '/CN=audigy.test',
      '-addext',
      'subjectAltName=DNS:audigy.test',
    );
    const read = (f: string) => readFileSync(p(f), 'utf8');
    return {
      caCert: read('ca.crt'),
      leafKey: read('leaf.key'),
      leafCert: read('leaf.crt'),
      selfKey: read('self.key'),
      selfCert: read('self.crt'),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
