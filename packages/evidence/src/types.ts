/** Manifeste public (PLAN §12.3). Les clés JSON sont stables. */
export interface FichierManifeste {
  fichier: string;
  sha256: string;
  octets: number;
}

export interface Manifeste {
  fichiers: FichierManifeste[];
  resultsSha256: string;
}

/** Horodatage affiché sur `/verifier/<id>`. Le jeton n’est pas un secret. */
export interface HorodatagePublic {
  service: string;
  emetteur: string;
  genTime: string;
  jetonBase64: string;
  chainePem: string;
}

/**
 * Dossier lu par la page. Le fichier déposé par la personne n’y figure pas :
 * seulement les empreintes, les jetons et la signature.
 */
export interface DossierPublic {
  id: string;
  date: string;
  empreinte: string;
  manifeste: Manifeste;
  horodatages: HorodatagePublic[];
  signature: string | null;
}

/** Identifiant du dossier d’exemple servi en statique. */
export const EXEMPLE_DOSSIER_ID = '00000000-0000-4000-8000-000000000019';
