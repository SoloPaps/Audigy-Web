import type { CheckResult } from '../../../src/types.js';
import { finding } from '../shared.js';
import type { Inventory } from './inventory.js';
import type { Checked, Selection } from './lookup.js';
import { SIGNATURES } from './retire.js';
import type { KevBundle, Severity, Vuln } from './sources.js';

export const TECHNOLOGIES_ID = 'securite.technologies';
export const CVE_SCRIPTS_ID = 'securite.cve_scripts';
export const CVE_SOFTWARE_ID = 'securite.cve_logiciels';

/** Noms cités dans un constat, au plus. */
const LIST_MAX = 5;
const IDS_MAX = 10;

const RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 2,
};

function list(items: readonly string[]): string {
  return items.slice(0, LIST_MAX).join(', ');
}

function signatures(): Record<string, string> {
  return {
    source: 'retire.js',
    commit: SIGNATURES.commit,
    license: SIGNATURES.license,
  };
}

export function judgeTechnologies(inventory: Inventory): CheckResult {
  const id = TECHNOLOGIES_ID;
  if (!inventory.ok) {
    return finding(id, 'untested', 1, 1, `${id}.untested`, {
      ...(inventory.status === undefined
        ? {}
        : { measured: { status: inventory.status } }),
    });
  }
  const names = new Set<string>();
  for (const item of inventory.software) {
    names.add(item.announced ? `${item.label} ${item.announced}` : item.label);
  }
  for (const item of inventory.libraries) {
    names.add(`${item.label} ${item.version}`);
  }
  const measured = {
    software: inventory.software.map((item) => ({
      name: item.label,
      role: item.role,
      origin: item.origin,
      version: item.announced,
      distro: item.distro,
    })),
    libraries: inventory.libraries.map((item) => ({
      name: item.label,
      version: item.version,
      evidence: item.evidence,
      verified: item.verified,
      where: item.where,
    })),
    scripts: inventory.scripts,
    disclosed: inventory.disclosed,
    signatures: signatures(),
  };
  if (inventory.disclosed.length > 0) {
    return finding(id, 'warn', 1, 1, `${id}.warn`, {
      params: { liste: list(inventory.disclosed) },
      measured,
    });
  }
  if (names.size === 0) {
    return finding(id, 'pass', 1, 1, `${id}.pass_aucune`, { measured });
  }
  return finding(id, 'pass', 1, 1, `${id}.pass`, {
    params: { liste: list([...names]) },
    measured,
  });
}

interface Assessed {
  label: string;
  distro: boolean;
  count: number;
  worst: Severity;
  kev: string[];
  ids: string[];
}

/** Regroupe les fiches qui partagent un numéro CVE (GHSA et CVE de la même faille). */
export function groupVulns(vulns: readonly Vuln[]): Vuln[][] {
  const groups: { cves: Set<string>; items: Vuln[] }[] = [];
  const byId = new Set<string>();
  for (const vuln of vulns) {
    if (byId.has(vuln.id)) continue;
    byId.add(vuln.id);
    const group = groups.find((item) =>
      vuln.cves.some((cve) => item.cves.has(cve)),
    );
    if (group) {
      group.items.push(vuln);
      for (const cve of vuln.cves) group.cves.add(cve);
    } else groups.push({ cves: new Set(vuln.cves), items: [vuln] });
  }
  return groups.map((item) => item.items);
}

function worstOf(vulns: readonly Vuln[]): Severity {
  let worst: Severity = 'low';
  for (const vuln of vulns) {
    if (RANK[vuln.severity] > RANK[worst]) worst = vuln.severity;
  }
  return worst;
}

function assess(item: Checked, kev: KevBundle | null): Assessed | null {
  if (!item.lookup.ok || item.lookup.vulns.length === 0) return null;
  const groups = groupVulns(item.lookup.vulns);
  const all = groups.flat();
  const cves = [...new Set(all.flatMap((vuln) => vuln.cves))].sort();
  const exploited =
    kev?.ok === true
      ? cves.filter((cve) => kev.entries[cve] !== undefined)
      : [];
  return {
    label: `${item.label} ${item.version}`,
    distro: item.distro,
    count: groups.length,
    worst: worstOf(all),
    kev: exploited,
    ids: groups
      .map((group) => group[0]?.cves[0] ?? group[0]?.id ?? '')
      .filter((value) => value !== '')
      .sort()
      .slice(0, IDS_MAX),
  };
}

function itemLevel(item: Assessed): number {
  if (item.kev.length > 0) return 3;
  if (item.worst === 'critical' || item.worst === 'high') return 2;
  return 1;
}

export function needsKev(checked: readonly Checked[]): boolean {
  return checked.some(
    (item) =>
      item.lookup.ok && item.lookup.vulns.some((vuln) => vuln.cves.length > 0),
  );
}

/** Statut commun aux deux recherches de failles, d’après les réponses reçues. */
function judgeLookups(
  id: string,
  selection: Selection,
  checked: readonly Checked[],
  kev: KevBundle | null,
  extra: { unread: number; measured: Record<string, unknown> },
): CheckResult {
  const assessed = checked
    .map((item) => assess(item, kev))
    .filter((item): item is Assessed => item !== null)
    .sort(
      (a, b) => itemLevel(b) - itemLevel(a) || (a.label < b.label ? -1 : 1),
    );
  const failed = checked.filter((item) => !item.lookup.ok);
  const measured = {
    ...extra.measured,
    checked: checked.map((item) => ({
      name: item.label,
      version: item.version,
      source: item.source.kind,
      ok: item.lookup.ok,
      ...(item.lookup.ok
        ? { truncated: item.lookup.truncated }
        : { reason: item.lookup.reason }),
    })),
    vulnerable: assessed.map((item) => ({
      name: item.label,
      count: item.count,
      worst: item.worst,
      kev: item.kev,
      ids: item.ids,
      distro: item.distro,
    })),
    unknown: selection.unknown,
    skipped: selection.skipped,
    kev:
      kev === null
        ? 'non_lu'
        : kev.ok
          ? { catalogVersion: kev.catalogVersion }
          : 'indisponible',
  };
  if (assessed.length > 0) {
    const count = assessed.reduce((sum, item) => sum + item.count, 0);
    const params = { liste: list(assessed.map((item) => item.label)), count };
    const direct = assessed.filter((item) => !item.distro);
    const top = Math.max(0, ...direct.map(itemLevel));
    if (top === 3)
      return finding(id, 'fail', 4, 3, `${id}.fail_kev`, { params, measured });
    if (top === 2)
      return finding(id, 'fail', 3, 3, `${id}.fail`, { params, measured });
    if (assessed.some((item) => item.distro)) {
      const distroTop = Math.max(
        ...assessed.filter((item) => item.distro).map(itemLevel),
      );
      return finding(
        id,
        'warn',
        distroTop >= 2 ? 3 : 2,
        2,
        `${id}.warn_distribution`,
        { params, measured },
      );
    }
    return finding(id, 'warn', 2, 2, `${id}.warn`, { params, measured });
  }
  if (failed.length > 0) {
    const quota = failed.some(
      (item) => !item.lookup.ok && item.lookup.reason === 'quota',
    );
    return finding(
      id,
      'untested',
      1,
      1,
      quota ? `${id}.quota` : `${id}.untested_source`,
      { measured },
    );
  }
  const params = {
    liste: list(checked.map((item) => `${item.label} ${item.version}`)),
  };
  const unread = extra.unread + selection.skipped;
  if (unread > 0) {
    return finding(id, 'pass', 1, 1, `${id}.pass_partiel`, {
      params: { ...params, count: unread },
      measured,
    });
  }
  return finding(id, 'pass', 1, 1, `${id}.pass`, { params, measured });
}

export function judgeScriptCves(
  inventory: Inventory,
  selection: Selection | null,
  checked: readonly Checked[],
  kev: KevBundle | null,
  apiMissing = false,
): CheckResult {
  const id = CVE_SCRIPTS_ID;
  if (!inventory.ok || selection === null) {
    return finding(id, 'untested', 1, 1, `${id}.untested_page`);
  }
  const scripts = inventory.scripts;
  const unread = scripts.unread + scripts.skipped;
  const measured = {
    scripts,
    unverified: inventory.libraries
      .filter((item) => !item.verified)
      .map((item) => `${item.label} ${item.version}`),
    signatures: signatures(),
  };
  if (selection.candidates.length === 0) {
    if (unread > 0) {
      return finding(id, 'untested', 1, 1, `${id}.untested_scripts`, {
        measured,
      });
    }
    if (selection.unknown.length > 0) {
      return finding(id, 'na', 1, 1, `${id}.na_version`, {
        params: { liste: list(selection.unknown) },
        measured: { ...measured, unknown: selection.unknown },
      });
    }
    return finding(id, 'na', 1, 1, `${id}.na_aucun`, { measured });
  }
  if (apiMissing) {
    return finding(id, 'untested', 1, 1, `${id}.missing_api`, { measured });
  }
  return judgeLookups(id, selection, checked, kev, { unread, measured });
}

export function judgeSoftwareCves(
  inventory: Inventory,
  selection: Selection | null,
  checked: readonly Checked[],
  kev: KevBundle | null,
  apiMissing = false,
): CheckResult {
  const id = CVE_SOFTWARE_ID;
  if (!inventory.ok || selection === null) {
    return finding(id, 'untested', 1, 1, `${id}.untested_page`);
  }
  const measured = {
    software: inventory.software.map((item) => ({
      name: item.label,
      role: item.role,
      version: item.announced,
      precise: item.precise,
      distro: item.distro,
    })),
  };
  if (selection.candidates.length === 0) {
    if (selection.unknown.length > 0) {
      return finding(id, 'na', 1, 1, `${id}.na_version`, {
        params: { liste: list(selection.unknown) },
        measured: { ...measured, unknown: selection.unknown },
      });
    }
    const tools = inventory.software.filter((item) => item.role === 'tool');
    if (tools.length > 0) {
      return finding(id, 'na', 1, 1, `${id}.na_outil`, {
        params: { liste: list(tools.map((item) => item.label)) },
        measured,
      });
    }
    const hosts = inventory.software.filter((item) => item.role === 'host');
    if (hosts.length > 0) {
      return finding(id, 'na', 1, 1, `${id}.na_hebergeur`, {
        params: { liste: list(hosts.map((item) => item.label)) },
        measured,
      });
    }
    return finding(id, 'na', 1, 1, `${id}.na_aucun`, { measured });
  }
  if (apiMissing) {
    return finding(id, 'untested', 1, 1, `${id}.missing_api`, { measured });
  }
  return judgeLookups(id, selection, checked, kev, { unread: 0, measured });
}
