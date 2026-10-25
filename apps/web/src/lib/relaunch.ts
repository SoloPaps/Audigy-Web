/** Progression du bon audit : l’id renvoyé, jamais un ancien rapport. */
export function progressionHref(auditId: string): string {
  return `/progression?id=${encodeURIComponent(auditId)}`;
}

/** Nouvelle demande pour ce site. */
export function relaunchHref(siteId: string): string {
  return `/lancer?site=${encodeURIComponent(siteId)}`;
}
