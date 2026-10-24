import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { memesOctets, octetsEgaux, versHex, vue } from './bytes.js';
import './pki.js';
import { EvidenceError } from './errors.js';
import { sha256Hex } from './hash.js';
import { derVersPem } from './local-tsa.js';

const SHA256 = '2.16.840.1.101.3.4.2.1';
const EKU_HORODATAGE = '1.3.6.1.5.5.7.3.8';
const CN = '2.5.4.3';
const MAX_REPONSE = 1024 * 1024;
const DELAI_MS = 15_000;

/**
 * Deux TSA indépendantes, gratuites, non qualifiées eIDAS (PLAN §12.4, Q9).
 * FreeTSA en HTTPS. DigiCert publie son service en HTTP : le jeton est signé,
 * l’empreinte envoyée n’est pas le rapport.
 */
export const TSA_DEFAUT = [
  {
    id: 'freetsa',
    nom: 'FreeTSA',
    url: 'https://freetsa.org/tsr',
    policy: '1.2.3.4.1',
  },
  {
    id: 'digicert',
    nom: 'DigiCert',
    url: 'http://timestamp.digicert.com',
  },
] as const;

export interface TsaCible {
  id: string;
  nom: string;
  url: string;
  policy?: string;
}

export interface TsaEnvoi {
  url: string;
  corps: Uint8Array;
}

export type TsaPost = (envoi: TsaEnvoi) => Promise<Uint8Array>;

export interface JetonVerifie {
  genTime: Date;
  emetteur: string;
  politique: string;
  empreinte: string;
  chainePem: string;
}

export interface VerificationJeton {
  /** Octets canoniques du manifeste, ceux dont le SHA-256 est l’empreinte. */
  manifeste: Uint8Array;
  nonce?: Uint8Array;
  /** Certificat d’ancre (DER) exigé pour une vérification hors ligne. */
  ancreDer?: Uint8Array;
}

export interface HorodatageOk {
  ok: true;
  tsa: TsaCible;
  jeton: Uint8Array;
  genTime: Date;
  emetteur: string;
  nonce: string;
  chainePem: string;
}

export interface HorodatageEchec {
  ok: false;
  tsa: TsaCible;
  message: string;
}

export type Horodatage = HorodatageOk | HorodatageEchec;

/**
 * Horodate l’empreinte du manifeste auprès de chaque TSA.
 * Le nonce est tiré par requête et doit revenir à l’identique.
 * L’empreinte du jeton est comparée à celle envoyée avant d’accepter.
 */
export async function horodater(
  manifeste: Uint8Array,
  options: {
    tsas?: readonly TsaCible[];
    post?: TsaPost;
    ancres?: ReadonlyMap<string, Uint8Array>;
  } = {},
): Promise<Horodatage[]> {
  const tsas: readonly TsaCible[] = options.tsas ?? tsaParDefaut();
  const post = options.post ?? posteParDefaut(tsas);
  const empreinte = depuisHexEmpreinte(sha256Hex(manifeste));
  const resultats: Horodatage[] = [];
  for (const tsa of tsas) {
    const nonce = nouveauNonce();
    try {
      const corps = requeteHorodatage(empreinte, nonce, tsa.policy);
      const jeton = await post({ url: tsa.url, corps });
      const ancre = options.ancres?.get(tsa.id);
      const verifie = await verifierJeton(jeton, {
        manifeste,
        nonce,
        ...(ancre ? { ancreDer: ancre } : {}),
      });
      resultats.push({
        ok: true,
        tsa,
        jeton,
        genTime: verifie.genTime,
        emetteur: verifie.emetteur,
        nonce: versHex(nonce),
        chainePem: verifie.chainePem,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'horodatage refusé';
      resultats.push({ ok: false, tsa, message });
    }
  }
  return resultats;
}

export function nouveauNonce(): Uint8Array {
  const octets = crypto.getRandomValues(new Uint8Array(16));
  const premier = octets[0] ?? 0;
  octets[0] = premier & 0x7f;
  if (octets.every((byte) => byte === 0)) octets[15] = 1;
  return octets;
}

export function requeteHorodatage(
  empreinte: Uint8Array,
  nonce: Uint8Array,
  policy?: string,
): Uint8Array {
  if (empreinte.byteLength !== 32) {
    throw new EvidenceError('EMPREINTE', 'empreinte SHA-256 attendue');
  }
  const demande = new pkijs.TimeStampReq({
    version: 1,
    messageImprint: new pkijs.MessageImprint({
      hashAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: SHA256,
        algorithmParams: new asn1js.Null(),
      }),
      hashedMessage: new asn1js.OctetString({ valueHex: vue(empreinte) }),
    }),
    certReq: true,
    nonce: new asn1js.Integer({ valueHex: vue(nonce) }),
    ...(policy ? { reqPolicy: policy } : {}),
  });
  return new Uint8Array(demande.toSchema().toBER(false));
}

/**
 * Vérifie un jeton hors ligne : statut, empreinte, nonce, signature CMS,
 * usage d’horodatage, et ancre si elle est fournie.
 */
export async function verifierJeton(
  jeton: Uint8Array,
  attendu: VerificationJeton,
): Promise<JetonVerifie> {
  const asn1 = asn1js.fromBER(jeton);
  if (asn1.offset === -1) throw new EvidenceError('JETON', 'jeton illisible');
  const reponse = new pkijs.TimeStampResp({ schema: asn1.result });
  const statut = reponse.status.status;
  if (
    statut !== pkijs.PKIStatus.granted &&
    statut !== pkijs.PKIStatus.grantedWithMods
  ) {
    throw new EvidenceError('JETON', 'horodatage refusé');
  }
  if (!reponse.timeStampToken) throw new EvidenceError('JETON', 'jeton absent');
  const signe = new pkijs.SignedData({
    schema: reponse.timeStampToken.content,
  });
  reparerEmpreinte(signe);
  const tst = lireTst(signe);
  const empreinteAttendue = depuisHexEmpreinte(sha256Hex(attendu.manifeste));
  const empreinteJeton = new Uint8Array(
    tst.messageImprint.hashedMessage.valueBlock.valueHexView,
  );
  if (tst.messageImprint.hashAlgorithm.algorithmId !== SHA256) {
    throw new EvidenceError('EMPREINTE', 'algorithme d’empreinte inattendu');
  }
  if (!octetsEgaux(empreinteJeton, empreinteAttendue)) {
    throw new EvidenceError('EMPREINTE', 'l’empreinte ne correspond pas');
  }
  if (attendu.nonce) {
    if (!tst.nonce) throw new EvidenceError('NONCE', 'nonce absent du jeton');
    const recu = new Uint8Array(tst.nonce.valueBlock.valueHexView);
    if (!memesOctets(recu, attendu.nonce)) {
      throw new EvidenceError('NONCE', 'le nonce ne correspond pas');
    }
  }
  const signataire = certificatSignataire(signe);
  if (!usageHorodatage(signataire)) {
    throw new EvidenceError('JETON', 'certificat sans usage d’horodatage');
  }
  if (
    tst.genTime < signataire.notBefore.value ||
    tst.genTime > signataire.notAfter.value
  ) {
    throw new EvidenceError('JETON', 'certificat hors période');
  }
  let signatureOk = false;
  try {
    signatureOk = await signe.verify({
      signer: 0,
      data: vue(attendu.manifeste),
      checkChain: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'signature refusée';
    throw new EvidenceError('SIGNATURE', message);
  }
  if (!signatureOk)
    throw new EvidenceError('SIGNATURE', 'signature du jeton refusée');
  if (attendu.ancreDer) {
    const ancreAsn = asn1js.fromBER(attendu.ancreDer);
    if (ancreAsn.offset === -1)
      throw new EvidenceError('SIGNATURE', 'ancre illisible');
    const ancre = new pkijs.Certificate({ schema: ancreAsn.result });
    const lie = await signataire.verify(ancre);
    if (!lie) throw new EvidenceError('SIGNATURE', 'ancre refusée');
  }
  return {
    genTime: tst.genTime,
    emetteur: nomCommun(signataire),
    politique: tst.policy,
    empreinte: versHex(empreinteJeton),
    chainePem: chaineDuJeton(signe),
  };
}

export async function posterTsa(
  url: string,
  corps: Uint8Array,
  options: {
    allow: readonly string[];
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<Uint8Array> {
  let cible: URL;
  try {
    cible = new URL(url);
  } catch {
    throw new EvidenceError('TSA', 'adresse d’horodatage illisible');
  }
  if (cible.username !== '' || cible.password !== '') {
    throw new EvidenceError('TSA', 'adresse d’horodatage refusée');
  }
  if (cible.protocol !== 'https:' && cible.protocol !== 'http:') {
    throw new EvidenceError('TSA', 'adresse d’horodatage refusée');
  }
  const permises = new Set(options.allow.map((item) => new URL(item).href));
  if (!permises.has(cible.href)) {
    throw new EvidenceError('TSA', 'adresse d’horodatage non autorisée');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = AbortSignal.timeout(options.timeoutMs ?? DELAI_MS);
  let reponse: Response;
  try {
    reponse = await fetchImpl(cible.href, {
      method: 'POST',
      redirect: 'error',
      signal,
      headers: {
        'content-type': 'application/timestamp-query',
        accept: 'application/timestamp-reply',
        'user-agent': 'Audigy/1.0',
      },
      body: vue(corps),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'horodatage injoignable';
    throw new EvidenceError('TSA', message);
  }
  if (!reponse.ok) throw new EvidenceError('TSA', 'horodatage refusé');
  const octets = new Uint8Array(await reponse.arrayBuffer());
  if (octets.byteLength > MAX_REPONSE) {
    throw new EvidenceError('TSA', 'réponse d’horodatage trop grande');
  }
  return octets;
}

function tsaParDefaut(): TsaCible[] {
  return TSA_DEFAUT.map((tsa) =>
    'policy' in tsa
      ? { id: tsa.id, nom: tsa.nom, url: tsa.url, policy: tsa.policy }
      : { id: tsa.id, nom: tsa.nom, url: tsa.url },
  );
}

function posteParDefaut(tsas: readonly TsaCible[]): TsaPost {
  const allow = tsas.map((tsa) => tsa.url);
  return (envoi) => posterTsa(envoi.url, envoi.corps, { allow });
}

function reparerEmpreinte(signe: pkijs.SignedData): void {
  const contenu = signe.encapContentInfo.eContent;
  if (!contenu || contenu.valueBlock.valueHexView.byteLength > 0) return;
  const interne = new Uint8Array(contenu.getValue());
  if (interne.byteLength === 0) return;
  contenu.valueBlock.valueHexView = interne;
}

function lireTst(signe: pkijs.SignedData): pkijs.TSTInfo {
  const contenu = signe.encapContentInfo.eContent;
  if (!contenu) throw new EvidenceError('JETON', 'contenu du jeton absent');
  const asn1 = asn1js.fromBER(contenu.getValue());
  if (asn1.offset === -1) throw new EvidenceError('JETON', 'TSTInfo illisible');
  return new pkijs.TSTInfo({ schema: asn1.result });
}

function certificatSignataire(signe: pkijs.SignedData): pkijs.Certificate {
  const info = signe.signerInfos[0];
  if (!info || !(info.sid instanceof pkijs.IssuerAndSerialNumber)) {
    throw new EvidenceError('JETON', 'signataire introuvable');
  }
  for (const item of signe.certificates ?? []) {
    if (!(item instanceof pkijs.Certificate)) continue;
    if (
      item.issuer.isEqual(info.sid.issuer) &&
      item.serialNumber.isEqual(info.sid.serialNumber)
    ) {
      return item;
    }
  }
  throw new EvidenceError('JETON', 'certificat du signataire absent');
}

function usageHorodatage(certificat: pkijs.Certificate): boolean {
  for (const extension of certificat.extensions ?? []) {
    if (extension.extnID !== '2.5.29.37') continue;
    if (extension.parsedValue instanceof pkijs.ExtKeyUsage) {
      return extension.parsedValue.keyPurposes.includes(EKU_HORODATAGE);
    }
  }
  return false;
}

function nomCommun(certificat: pkijs.Certificate): string {
  for (const attribut of certificat.subject.typesAndValues) {
    if (attribut.type === CN) return String(attribut.value.valueBlock.value);
  }
  return '';
}

function chaineDuJeton(signe: pkijs.SignedData): string {
  const pems: string[] = [];
  for (const item of signe.certificates ?? []) {
    if (!(item instanceof pkijs.Certificate)) continue;
    pems.push(
      derVersPem(new Uint8Array(item.toSchema().toBER(false)), 'CERTIFICATE'),
    );
  }
  return pems.join('');
}

function depuisHexEmpreinte(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}
