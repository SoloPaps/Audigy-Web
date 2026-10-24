import type { webcrypto } from 'node:crypto';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { vue } from './bytes.js';
import { EvidenceError } from './errors.js';
import './pki.js';

const SHA256 = '2.16.840.1.101.3.4.2.1';
const TST_INFO = '1.2.840.113549.1.9.16.1.4';
const EKU_HORODATAGE = '1.3.6.1.5.5.7.3.8';
const CN = '2.5.4.3';
const POLITIQUE_LOCALE = '1.2.3.4.5.6';

export interface AutoriteLocale {
  nom: string;
  ancreDer: Uint8Array;
  ancrePem: string;
  /** Répond à une requête RFC 3161. Le nonce et l’empreinte sont recopiés. */
  repondre(requete: Uint8Array, genTime?: Date): Promise<Uint8Array>;
}

/** TSA locale pour les fixtures et les tests. Aucun réseau. */
export async function creerAutoriteLocale(
  nom: string,
): Promise<AutoriteLocale> {
  const ca = await emettre({
    sujet: `${nom} racine`,
    emetteur: `${nom} racine`,
    autorite: true,
    signataire: null,
  });
  const tsa = await emettre({
    sujet: nom,
    emetteur: `${nom} racine`,
    autorite: false,
    signataire: ca.privee,
  });
  const ancreDer = new Uint8Array(ca.certificat.toSchema().toBER(false));

  return {
    nom,
    ancreDer,
    ancrePem: derVersPem(ancreDer, 'CERTIFICATE'),
    async repondre(requete, genTime = new Date()) {
      const demande = lireRequete(requete);
      const tst = new pkijs.TSTInfo({
        version: 1,
        policy: demande.reqPolicy ?? POLITIQUE_LOCALE,
        messageImprint: demande.messageImprint,
        serialNumber: new asn1js.Integer({ value: 1 }),
        genTime,
        ordering: true,
        ...(demande.nonce ? { nonce: demande.nonce } : {}),
      });
      const cms = new pkijs.SignedData({
        version: 3,
        encapContentInfo: new pkijs.EncapsulatedContentInfo({
          eContentType: TST_INFO,
          eContent: new asn1js.OctetString({
            valueHex: tst.toSchema().toBER(false),
          }),
        }),
        signerInfos: [
          new pkijs.SignerInfo({
            version: 1,
            sid: new pkijs.IssuerAndSerialNumber({
              issuer: tsa.certificat.issuer,
              serialNumber: tsa.certificat.serialNumber,
            }),
          }),
        ],
        certificates: [tsa.certificat, ca.certificat],
      });
      const info = cms.signerInfos[0];
      const contenu = cms.encapContentInfo.eContent;
      if (!info || !contenu) {
        throw new EvidenceError('JETON', 'jeton incomplet');
      }
      info.signedAttrs = new pkijs.SignedAndUnsignedAttributes({
        type: 0,
        attributes: await attributsRfc3161(contenu.getValue(), tsa.certificat),
      });
      await cms.sign(tsa.privee, 0, 'SHA-256');
      const enveloppe = new pkijs.ContentInfo({
        contentType: pkijs.ContentInfo.SIGNED_DATA,
        content: cms.toSchema(true),
      });
      const reponse = new pkijs.TimeStampResp({
        status: new pkijs.PKIStatusInfo({ status: pkijs.PKIStatus.granted }),
        timeStampToken: new pkijs.ContentInfo({ schema: enveloppe.toSchema() }),
      });
      return new Uint8Array(reponse.toSchema().toBER(false));
    },
  };
}

interface CertificatEmis {
  certificat: pkijs.Certificate;
  privee: webcrypto.CryptoKey;
}

async function emettre(options: {
  sujet: string;
  emetteur: string;
  autorite: boolean;
  signataire: webcrypto.CryptoKey | null;
}): Promise<CertificatEmis> {
  const cles = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
      publicExponent: new Uint8Array([1, 0, 1]),
      modulusLength: 2048,
    },
    true,
    ['sign', 'verify'],
  );
  const certificat = new pkijs.Certificate();
  certificat.version = 2;
  certificat.serialNumber = new asn1js.Integer({
    value: options.autorite ? 1 : 2,
  });
  poserCn(certificat.issuer, options.emetteur);
  poserCn(certificat.subject, options.sujet);
  certificat.notBefore.value = new Date('2020-01-01T00:00:00Z');
  certificat.notAfter.value = new Date('2040-01-01T00:00:00Z');
  certificat.extensions = [];
  const contraintes = new pkijs.BasicConstraints({
    cA: options.autorite,
    ...(options.autorite ? { pathLenConstraint: 0 } : {}),
  });
  certificat.extensions.push(
    new pkijs.Extension({
      extnID: '2.5.29.19',
      critical: true,
      extnValue: contraintes.toSchema().toBER(false),
      parsedValue: contraintes,
    }),
  );
  const usage = new Uint8Array(1);
  usage[0] = options.autorite ? 0x06 : 0x80;
  const usageBits = new asn1js.BitString({ valueHex: vue(usage) });
  certificat.extensions.push(
    new pkijs.Extension({
      extnID: '2.5.29.15',
      critical: true,
      extnValue: usageBits.toBER(false),
      parsedValue: usageBits,
    }),
  );
  if (!options.autorite) {
    const eku = new pkijs.ExtKeyUsage({ keyPurposes: [EKU_HORODATAGE] });
    certificat.extensions.push(
      new pkijs.Extension({
        extnID: '2.5.29.37',
        critical: true,
        extnValue: eku.toSchema().toBER(false),
        parsedValue: eku,
      }),
    );
  }
  await certificat.subjectPublicKeyInfo.importKey(cles.publicKey);
  await certificat.sign(options.signataire ?? cles.privateKey, 'SHA-256');
  return { certificat, privee: cles.privateKey };
}

/**
 * Attributs signés exigés par le RFC 3161 (type de contenu, condensé,
 * certificat du signataire). L’ordre est celui du DER, pour OpenSSL.
 */
async function attributsRfc3161(
  contenu: ArrayBuffer,
  certificat: pkijs.Certificate,
): Promise<pkijs.Attribute[]> {
  const condensé = new Uint8Array(
    await crypto.subtle.digest('SHA-256', contenu),
  );
  const der = new Uint8Array(certificat.toSchema().toBER(false));
  const empreinteCert = new Uint8Array(
    await crypto.subtle.digest('SHA-256', der),
  );
  const certificatV2 = new asn1js.Sequence({
    value: [
      new asn1js.Sequence({
        value: [
          new asn1js.Sequence({
            value: [new asn1js.OctetString({ valueHex: vue(empreinteCert) })],
          }),
        ],
      }),
    ],
  });
  const attributs = [
    new pkijs.Attribute({
      type: '1.2.840.113549.1.9.3',
      values: [new asn1js.ObjectIdentifier({ value: TST_INFO })],
    }),
    new pkijs.Attribute({
      type: '1.2.840.113549.1.9.4',
      values: [new asn1js.OctetString({ valueHex: vue(condensé) })],
    }),
    new pkijs.Attribute({
      type: '1.2.840.113549.1.9.16.2.47',
      values: [certificatV2],
    }),
  ];
  const codes = attributs.map((attribut) => ({
    attribut,
    der: new Uint8Array(attribut.toSchema().toBER(false)),
  }));
  codes.sort((gauche, droite) => {
    const taille = Math.min(gauche.der.length, droite.der.length);
    for (let i = 0; i < taille; i += 1) {
      const a = gauche.der[i] ?? 0;
      const b = droite.der[i] ?? 0;
      if (a !== b) return a - b;
    }
    return gauche.der.length - droite.der.length;
  });
  return codes.map((item) => item.attribut);
}

function poserCn(nom: pkijs.RelativeDistinguishedNames, cn: string): void {
  nom.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: CN,
      value: new asn1js.PrintableString({ value: cn }),
    }),
  );
}

function lireRequete(requete: Uint8Array): pkijs.TimeStampReq {
  const asn1 = asn1js.fromBER(requete);
  if (asn1.offset === -1) {
    throw new EvidenceError('JETON', 'requête d’horodatage illisible');
  }
  const demande = new pkijs.TimeStampReq({ schema: asn1.result });
  const algo = demande.messageImprint.hashAlgorithm.algorithmId;
  const empreinte = new Uint8Array(
    demande.messageImprint.hashedMessage.valueBlock.valueHexView,
  );
  if (algo !== SHA256 || empreinte.byteLength !== 32) {
    throw new EvidenceError('EMPREINTE', 'empreinte SHA-256 attendue');
  }
  if (!demande.nonce) {
    throw new EvidenceError('NONCE', 'nonce absent de la requête');
  }
  return demande;
}

export function derVersPem(der: Uint8Array, etiquette: string): string {
  const b64 = versBase64Lignes(der);
  return `-----BEGIN ${etiquette}-----\n${b64}\n-----END ${etiquette}-----\n`;
}

export function pemVersDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binaire = atob(b64);
  const out = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) out[i] = binaire.charCodeAt(i);
  return out;
}

function versBase64Lignes(octets: Uint8Array): string {
  let binaire = '';
  for (const byte of octets) binaire += String.fromCharCode(byte);
  const b64 = btoa(binaire);
  const lignes: string[] = [];
  for (let i = 0; i < b64.length; i += 64) lignes.push(b64.slice(i, i + 64));
  return lignes.join('\n');
}
