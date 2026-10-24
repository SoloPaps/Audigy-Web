/** Erreur stable du paquet preuve. Le `code` est le contrat des tests. */
export class EvidenceError extends Error {
  override readonly name = 'EvidenceError';

  constructor(
    readonly code:
      | 'EMPREINTE'
      | 'NONCE'
      | 'JETON'
      | 'SIGNATURE'
      | 'TSA'
      | 'ENTREE',
    message: string,
  ) {
    super(message);
  }
}
