import type { BrowserAudit } from '@audigy/browser-runner';
import type { CheckResult } from '../../src/types.js';
import { finding } from '../securite/shared.js';
import type { BrowserFacts, LegalFacts, PageState } from './facts.js';
import { thirdPartyHits, trackerHits } from './hits.js';
import { type ElementFlags, missingElements, missingLabel } from './links.js';

const HOST_LIMIT = 8;

function hostsOf(hosts: readonly string[]): string[] {
  return hosts.slice(0, HOST_LIMIT);
}

function browserGate(
  id: string,
  facts: BrowserFacts,
): CheckResult | BrowserAudit {
  if (facts.kind === 'absent') {
    return finding(id, 'untested', 1, 1, 'vie_privee.untested_runner');
  }
  if (facts.kind === 'invalid') {
    return finding(id, 'untested', 1, 1, 'vie_privee.untested_runner_invalid');
  }
  if (facts.audit.interacted) {
    return finding(id, 'untested', 1, 1, 'vie_privee.untested_interaction');
  }
  return facts.audit;
}

export function judgeTrackers(
  facts: BrowserFacts,
  targetHost: string,
): CheckResult {
  const audit = browserGate('vie_privee.traceurs', facts);
  if (!('cookies' in audit)) return audit;
  const hits = trackerHits(audit, targetHost);
  const measured = {
    count: hits.length,
    hosts: hostsOf(hits.map((hit) => hit.host)),
    truncated: audit.truncated,
  };
  if (hits.length === 0) {
    return finding(
      'vie_privee.traceurs',
      'pass',
      1,
      1,
      'vie_privee.traceurs.pass',
      { measured },
    );
  }
  if (hits.length === 1) {
    return finding(
      'vie_privee.traceurs',
      'fail',
      4,
      3,
      'vie_privee.traceurs.fail_one',
      { measured },
    );
  }
  return finding(
    'vie_privee.traceurs',
    'fail',
    4,
    3,
    'vie_privee.traceurs.fail_many',
    { measured, params: { count: hits.length } },
  );
}

export function judgeCmp(facts: BrowserFacts, targetHost: string): CheckResult {
  const audit = browserGate('vie_privee.cmp', facts);
  if (!('cookies' in audit)) return audit;
  const count = trackerHits(audit, targetHost).length;
  const measured = {
    present: audit.cmp.present,
    vendor: audit.cmp.vendor,
    trackers: count,
  };
  if (audit.cmp.present) {
    return finding('vie_privee.cmp', 'pass', 1, 1, 'vie_privee.cmp.pass', {
      measured,
    });
  }
  if (count === 0) {
    return finding('vie_privee.cmp', 'pass', 1, 1, 'vie_privee.cmp.pass_none', {
      measured,
    });
  }
  return finding('vie_privee.cmp', 'fail', 3, 3, 'vie_privee.cmp.fail', {
    measured,
  });
}

export function judgeReject(
  facts: BrowserFacts,
  targetHost: string,
): CheckResult {
  const audit = browserGate('vie_privee.refus', facts);
  if (!('cookies' in audit)) return audit;
  const count = trackerHits(audit, targetHost).length;
  const measured = {
    present: audit.cmp.present,
    rejectAllFirstLevel: audit.cmp.rejectAllFirstLevel,
    trackers: count,
  };
  if (!audit.cmp.present && count === 0) {
    return finding('vie_privee.refus', 'na', 1, 1, 'vie_privee.refus.na', {
      measured,
    });
  }
  if (audit.cmp.present && audit.cmp.rejectAllFirstLevel) {
    return finding('vie_privee.refus', 'pass', 1, 1, 'vie_privee.refus.pass', {
      measured,
    });
  }
  if (!audit.cmp.present) {
    return finding(
      'vie_privee.refus',
      'fail',
      3,
      3,
      'vie_privee.refus.fail_absent',
      { measured },
    );
  }
  return finding('vie_privee.refus', 'fail', 3, 3, 'vie_privee.refus.fail', {
    measured,
  });
}

export function judgeThirdParty(
  facts: BrowserFacts,
  targetHost: string,
): CheckResult {
  const audit = browserGate('vie_privee.tiers', facts);
  if (!('cookies' in audit)) return audit;
  const { scripts, fonts } = thirdPartyHits(audit, targetHost);
  const measured = {
    scripts: hostsOf(scripts),
    fonts: hostsOf(fonts),
    scriptCount: scripts.length,
    fontCount: fonts.length,
  };
  if (scripts.length === 1) {
    return finding(
      'vie_privee.tiers',
      'fail',
      3,
      2,
      'vie_privee.tiers.fail_scripts_one',
      { measured },
    );
  }
  if (scripts.length > 1) {
    return finding(
      'vie_privee.tiers',
      'fail',
      3,
      2,
      'vie_privee.tiers.fail_scripts_many',
      { measured, params: { count: scripts.length } },
    );
  }
  if (fonts.length === 1) {
    return finding(
      'vie_privee.tiers',
      'warn',
      2,
      2,
      'vie_privee.tiers.warn_fonts_one',
      { measured },
    );
  }
  if (fonts.length > 1) {
    return finding(
      'vie_privee.tiers',
      'warn',
      2,
      2,
      'vie_privee.tiers.warn_fonts_many',
      { measured, params: { count: fonts.length } },
    );
  }
  return finding('vie_privee.tiers', 'pass', 1, 1, 'vie_privee.tiers.pass', {
    measured,
  });
}

function legalUntested(id: string, facts: LegalFacts): CheckResult | null {
  switch (facts.kind) {
    case 'ok':
      return null;
    case 'home_down':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_home');
    case 'home_status':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_home_status', {
        params: { status: facts.status },
        measured: { status: facts.status },
      });
    case 'not_html':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_not_html');
    case 'robots_down':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_robots_down');
    case 'robots_status':
      return finding(
        id,
        'untested',
        1,
        1,
        'vie_privee.untested_robots_status',
        {
          params: { status: facts.status },
          measured: { status: facts.status },
        },
      );
    case 'budget':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_budget');
    default:
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_home');
  }
}

function pageUntested(id: string, state: PageState): CheckResult | null {
  switch (state.kind) {
    case 'blocked':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_robots');
    case 'down':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_down');
    case 'budget':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_budget');
    case 'status':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_page_status', {
        params: { status: state.status },
        measured: { status: state.status },
      });
    case 'other':
      return finding(id, 'untested', 1, 1, 'vie_privee.untested_page', {
        measured: { url: state.url },
      });
    default:
      return null;
  }
}

function judgePage(
  id: string,
  state: PageState,
  passKey: string,
  missingKey: string,
  emptyKey: string,
): CheckResult {
  const blocked = pageUntested(id, state);
  if (blocked) return blocked;
  if (state.kind === 'missing') {
    return finding(id, 'fail', 3, 2, missingKey, {
      measured: { found: false },
    });
  }
  if (state.kind === 'empty') {
    return finding(id, 'fail', 2, 2, emptyKey, {
      measured: { url: state.url, found: true },
    });
  }
  if (state.kind !== 'ready') {
    return finding(id, 'untested', 1, 1, 'vie_privee.untested_page');
  }
  return finding(id, 'pass', 1, 1, passKey, {
    measured: { url: state.url, length: state.text.length },
  });
}

export function judgeMentions(facts: LegalFacts): CheckResult {
  const blocked = legalUntested('vie_privee.mentions', facts);
  if (blocked) return blocked;
  if (facts.kind !== 'ok') {
    return finding(
      'vie_privee.mentions',
      'untested',
      1,
      1,
      'vie_privee.untested_home',
    );
  }
  return judgePage(
    'vie_privee.mentions',
    facts.mentions,
    'vie_privee.mentions.pass',
    'vie_privee.mentions.fail_missing',
    'vie_privee.mentions.fail_empty',
  );
}

export function judgePrivacy(facts: LegalFacts): CheckResult {
  const blocked = legalUntested('vie_privee.confidentialite', facts);
  if (blocked) return blocked;
  if (facts.kind !== 'ok') {
    return finding(
      'vie_privee.confidentialite',
      'untested',
      1,
      1,
      'vie_privee.untested_home',
    );
  }
  return judgePage(
    'vie_privee.confidentialite',
    facts.privacy,
    'vie_privee.confidentialite.pass',
    'vie_privee.confidentialite.fail_missing',
    'vie_privee.confidentialite.fail_empty',
  );
}

function mergedFlags(
  pages: readonly PageState[],
): ElementFlags | 'none' | PageState {
  const ready = pages.filter(
    (page): page is Extract<PageState, { kind: 'ready' }> =>
      page.kind === 'ready',
  );
  if (ready.length === 0) {
    const problem = pages.find(
      (page) => page.kind !== 'missing' && page.kind !== 'empty',
    );
    return problem ?? 'none';
  }
  return {
    editor: ready.some((page) => page.elements.editor),
    host: ready.some((page) => page.elements.host),
    contact: ready.some((page) => page.elements.contact),
  };
}

export function judgeElements(facts: LegalFacts): CheckResult {
  const id = 'vie_privee.elements';
  const blocked = legalUntested(id, facts);
  if (blocked) return blocked;
  if (facts.kind !== 'ok') {
    return finding(id, 'untested', 1, 1, 'vie_privee.untested_home');
  }
  const flags = mergedFlags([facts.mentions, facts.privacy]);
  if (flags === 'none') {
    return finding(id, 'fail', 2, 2, 'vie_privee.elements.fail');
  }
  if (typeof flags === 'object' && 'kind' in flags) {
    const page = pageUntested(id, flags);
    if (page) return page;
    return finding(id, 'untested', 1, 1, 'vie_privee.untested_page');
  }
  const missing = missingElements(flags);
  if (missing.length === 0) {
    return finding(id, 'pass', 1, 1, 'vie_privee.elements.pass', {
      measured: { ...flags },
    });
  }
  if (missing.length === 3) {
    return finding(id, 'fail', 2, 2, 'vie_privee.elements.fail', {
      measured: { ...flags },
    });
  }
  return finding(id, 'warn', 2, 2, 'vie_privee.elements.warn', {
    measured: { ...flags },
    params: { missing: missingLabel(missing) },
  });
}
