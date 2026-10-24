import {
  isFresh,
  type OwnershipSite,
  type ProbeOutcome,
  type ProofRecord,
  scopesMatch,
} from '@audigy/engine';

export interface AuditEvent {
  actor: string | null;
  action: string;
  target: string | null;
  details: Record<string, string | number | boolean | null>;
}

export interface RecheckDecision {
  allowed: boolean;
  reason: 'missing' | 'status' | 'stale' | 'scope' | 'error' | null;
  nextStatus: 'verified' | 'expired' | null;
  touchCheckedAt: boolean;
  alert: boolean;
  event: AuditEvent | null;
}

function event(
  actor: string | null,
  action: string,
  target: string,
  details: AuditEvent['details'],
): AuditEvent {
  return { actor, action, target, details };
}

/** Décide l’actif à partir de la preuve stockée et d’une relecture. */
export function decideRecheck(input: {
  actor: string | null;
  siteId: string;
  proof: ProofRecord | null;
  site: OwnershipSite;
  now: Date;
  probe: ProbeOutcome | 'skipped';
}): RecheckDecision {
  const { actor, siteId, proof, site, now, probe } = input;
  const none = {
    nextStatus: null,
    touchCheckedAt: false,
    alert: false,
  };
  if (!proof) {
    return {
      allowed: false,
      reason: 'missing',
      event: event(actor, 'active.refused', siteId, { reason: 'missing' }),
      ...none,
    };
  }
  const method = proof.method;
  if (proof.status !== 'verified') {
    return {
      allowed: false,
      reason: 'status',
      event: event(actor, 'active.refused', siteId, {
        reason: 'status',
        method,
      }),
      ...none,
    };
  }
  if (!scopesMatch(proof, site)) {
    return {
      allowed: false,
      reason: 'scope',
      event: event(actor, 'active.refused', siteId, {
        reason: 'scope',
        method,
      }),
      ...none,
    };
  }
  if (probe === 'present') {
    return {
      allowed: true,
      reason: null,
      nextStatus: 'verified',
      touchCheckedAt: true,
      alert: false,
      event: event(actor, 'verification.recheck', siteId, {
        status: 'verified',
        method,
      }),
    };
  }
  if (probe === 'absent') {
    return {
      allowed: false,
      reason: 'status',
      nextStatus: 'expired',
      touchCheckedAt: true,
      alert: true,
      event: event(actor, 'verification.expire', siteId, {
        status: 'expired',
        method,
      }),
    };
  }
  if (!isFresh(proof.lastCheckedAt, now)) {
    return {
      allowed: false,
      reason: probe === 'error' ? 'error' : 'stale',
      event: event(actor, 'active.refused', siteId, {
        reason: probe === 'error' ? 'error' : 'stale',
        method,
      }),
      ...none,
    };
  }
  return {
    allowed: true,
    reason: null,
    nextStatus: null,
    touchCheckedAt: false,
    alert: false,
    event: event(actor, 'verification.recheck', siteId, {
      status: 'verified',
      method,
      inconclusive: probe === 'error' ? 'true' : 'false',
    }),
  };
}

export interface ProbeApply {
  status: 'pending' | 'verified' | 'failed' | 'expired';
  alert: boolean;
  action: 'verification.check' | 'verification.recheck' | 'verification.expire';
  found: boolean;
  inconclusive: boolean;
}

/** Effet d’un clic « Vérifier », y compris le passage à expiré. */
export function applyProbe(input: {
  previous: 'pending' | 'verified' | 'failed' | 'expired';
  outcome: ProbeOutcome;
}): ProbeApply {
  const { previous, outcome } = input;
  if (outcome === 'error') {
    return {
      status: previous,
      alert: false,
      action:
        previous === 'verified' ? 'verification.recheck' : 'verification.check',
      found: false,
      inconclusive: true,
    };
  }
  if (outcome === 'present') {
    return {
      status: 'verified',
      alert: false,
      action:
        previous === 'verified' ? 'verification.recheck' : 'verification.check',
      found: true,
      inconclusive: false,
    };
  }
  if (previous === 'verified') {
    return {
      status: 'expired',
      alert: true,
      action: 'verification.expire',
      found: false,
      inconclusive: false,
    };
  }
  return {
    status: previous === 'expired' ? 'expired' : 'pending',
    alert: false,
    action: 'verification.check',
    found: false,
    inconclusive: false,
  };
}

export function createEvent(input: {
  actor: string;
  siteId: string;
  verificationId: string;
  method: string;
}): AuditEvent {
  return event(input.actor, 'verification.create', input.siteId, {
    verificationId: input.verificationId,
    method: input.method,
    status: 'pending',
  });
}

export function checkEvent(input: {
  actor: string;
  siteId: string;
  verificationId: string;
  method: string;
  status: string;
  found: boolean;
  inconclusive: boolean;
  action: ProbeApply['action'];
}): AuditEvent {
  return event(input.actor, input.action, input.siteId, {
    verificationId: input.verificationId,
    method: input.method,
    status: input.status,
    found: input.found,
    inconclusive: input.inconclusive,
  });
}

export function activeCheckEvent(input: {
  actor: string | null;
  siteId: string;
  auditId: string;
  checkId: string;
  status: string;
}): AuditEvent {
  return event(input.actor, 'active.check', input.siteId, {
    auditId: input.auditId,
    checkId: input.checkId,
    status: input.status,
  });
}
