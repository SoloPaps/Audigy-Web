import { canonicaliser } from './jcs.js';
import type { Manifeste } from './types.js';

const NOM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const HEX64 = /^[0-9a-f]{64}$/;

/** JCS du manifeste. L’ordre des fichiers est fixé par le nom. */
export function manifesteCanonique(manifeste: Manifeste): string {
  if (!HEX64.test(manifeste.resultsSha256)) {
    throw new Error('empreinte de results.json illisible');
  }
  const fichiers = [...manifeste.fichiers].sort((a, b) =>
    a.fichier < b.fichier ? -1 : a.fichier > b.fichier ? 1 : 0,
  );
  return canonicaliser({
    fichiers: fichiers.map((fichier) => {
      if (!NOM.test(fichier.fichier) || !HEX64.test(fichier.sha256)) {
        throw new Error('entrée de manifeste illisible');
      }
      if (!Number.isInteger(fichier.octets) || fichier.octets < 0) {
        throw new Error('taille de fichier illisible');
      }
      return {
        fichier: fichier.fichier,
        octets: fichier.octets,
        sha256: fichier.sha256,
      };
    }),
    resultsSha256: manifeste.resultsSha256,
  });
}
