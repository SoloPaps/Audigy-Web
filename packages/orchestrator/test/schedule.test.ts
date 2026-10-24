import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NetError, type SafeFetch } from '@audigy/net';
import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/log.js';
import {
  type AlertKind,
  type AlertPayload,
  BREVO_URL,
  createBrevoMailer,
  type DigestSite,
  handleUnsubscribe,
  type OutboundMail,
  renderAlert,
  unsubscribeMac,
  verifyUnsubscribe,
} from '../src/mail.js';
import {
  checksToPurge,
  type DailyFold,
  type DigestRecipient,
  type DigestStore,
  type DueSchedule,
  digestRateKey,
  foldUptime,
  handleDigest,
  handleSchedule,
  isMondayEightParis,
  median,
  mergeDaily,
  nextRunAt,
  type PendingAlert,
  parisDay,
  parisWeek,
  type RawCheck,
  type RosterSite,
  readUptime,
  runScheduleTick,
  runWeeklyDigest,
  type ScheduleDeps,
  type ScheduleStore,
  siteProbeFromSafeFetch,
  UPTIME_KEEP_MS,
} from '../src/schedule.js';
import {
  parseDigest,
  parseRoster,
  scheduleDepsFromEnv,
} from '../src/schedule-db.js';

const KEY = 'cle-de-test-service-role-0123456789';
const APP = 'https://audigy.test';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

function uid(slot: number, n: number): string {
  return `${slot.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

function audit(
  id: string,
  score: number | null,
  finishedAt: string,
  graves: string[] = [],
  certDays: number | null = null,
  certUntil: string | null = null,
): RosterSite['audits'][number] {
  return { id, score, finishedAt, graves, certDays, certUntil };
}

class Memory implements ScheduleStore, DigestStore {
  checks: RawCheck[] = [];
  incidents: { id: string; siteId: string; resolvedAt: string | null }[] = [];
  alerts: {
    id: string;
    userId: string;
    siteId: string;
    kind: AlertKind;
    payload: AlertPayload;
    sentAt: string | null;
  }[] = [];
  sites: RosterSite[] = [];
  schedules: DueSchedule[] = [];
  daily = new Map<string, DailyFold>();
  emails = new Map<string, string>();
  optOut = new Set<string>();
  enqueueMode: 'created' | 'existing' | 'skip' = 'created';
  enqueued: { siteId: string; mode: string }[] = [];
  claims = new Set<string>();
  digestPeople: DigestRecipient[] = [];
  private seq = 0;

  private nextId(): string {
    this.seq += 1;
    return uid(9, this.seq);
  }

  async roster(now: Date) {
    return {
      sites: this.sites.map((site) => {
        const latest = this.checks
          .filter((check) => check.siteId === site.id)
          .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))[0];
        const open = this.incidents.find(
          (incident) =>
            incident.siteId === site.id && incident.resolvedAt === null,
        );
        return {
          ...site,
          emailOptOut: this.optOut.has(site.ownerId),
          lastOk: latest ? latest.ok : null,
          lastCheckedAt: latest?.checkedAt ?? null,
          incidentId: open?.id ?? null,
        };
      }),
      due: this.schedules.filter(
        (schedule) => Date.parse(schedule.nextRunAt) <= now.getTime(),
      ),
    };
  }

  async insertCheck(input: {
    siteId: string;
    checkedAt: string;
    ok: boolean;
    statusCode: number | null;
    ms: number;
  }) {
    this.checks.push({
      id: this.nextId(),
      siteId: input.siteId,
      checkedAt: input.checkedAt,
      ok: input.ok,
      ms: input.ms,
    });
  }

  async openIncident(siteId: string) {
    const open = this.incidents.find(
      (incident) => incident.siteId === siteId && incident.resolvedAt === null,
    );
    if (open) return null;
    const id = this.nextId();
    this.incidents.push({ id, siteId, resolvedAt: null });
    return id;
  }

  async resolveIncident(id: string, at: string) {
    const incident = this.incidents.find((item) => item.id === id);
    if (incident) incident.resolvedAt = at;
  }

  async findAlert(
    userId: string,
    siteId: string,
    kind: AlertKind,
    dedup: string,
  ) {
    return this.alerts.some(
      (alert) =>
        alert.userId === userId &&
        alert.siteId === siteId &&
        alert.kind === kind &&
        alert.payload.dedup === dedup,
    );
  }

  async insertAlert(input: {
    userId: string;
    siteId: string;
    kind: AlertKind;
    payload: AlertPayload;
  }) {
    const unsent = this.alerts.some(
      (alert) =>
        alert.userId === input.userId &&
        alert.siteId === input.siteId &&
        alert.kind === input.kind &&
        alert.sentAt === null,
    );
    if (
      unsent ||
      (await this.findAlert(
        input.userId,
        input.siteId,
        input.kind,
        input.payload.dedup,
      ))
    ) {
      return { status: 'duplicate' as const };
    }
    const id = this.nextId();
    this.alerts.push({ ...input, id, sentAt: null });
    return { status: 'created' as const, id };
  }

  async markAlertSent(id: string, at: string) {
    const alert = this.alerts.find((item) => item.id === id);
    if (alert) alert.sentAt = at;
  }

  async pendingAlerts(): Promise<PendingAlert[]> {
    return this.alerts
      .filter((alert) => alert.sentAt === null && !alert.payload.suppressed)
      .map((alert) => ({
        id: alert.id,
        userId: alert.userId,
        siteId: alert.siteId,
        kind: alert.kind,
        payload: alert.payload,
        emailOptOut: this.optOut.has(alert.userId),
      }));
  }

  async advanceSchedule(siteId: string, now: Date, next: string) {
    const schedule = this.schedules.find(
      (item) =>
        item.siteId === siteId && Date.parse(item.nextRunAt) <= now.getTime(),
    );
    if (!schedule) return false;
    schedule.nextRunAt = next;
    return true;
  }

  async enqueue(input: {
    userId: string;
    siteId: string;
    mode: 'passive' | 'active';
  }) {
    if (this.enqueueMode === 'skip') return 'skip';
    this.enqueued.push({ siteId: input.siteId, mode: input.mode });
    return this.enqueueMode;
  }

  async rollup(now: Date) {
    const old = checksToPurge(this.checks, now);
    const folded = foldUptime(old);
    for (const batch of folded) {
      const key = `${batch.siteId}:${batch.day}`;
      this.daily.set(key, mergeDaily(this.daily.get(key) ?? null, batch));
    }
    const drop = new Set(old.map((row) => row.id));
    this.checks = this.checks.filter((row) => !drop.has(row.id));
    return { days: folded.length, purged: old.length };
  }

  async userEmail(userId: string) {
    return this.emails.get(userId) ?? null;
  }

  async recipients() {
    return this.digestPeople.filter(
      (person) => !this.optOut.has(person.userId),
    );
  }

  async claim(userId: string, week: string) {
    const key = `${userId}:${week}`;
    if (this.claims.has(key)) return false;
    this.claims.add(key);
    return true;
  }

  async release(userId: string, week: string) {
    this.claims.delete(`${userId}:${week}`);
  }
}

function harness(store: Memory, patch?: Partial<ScheduleDeps>) {
  let current = new Date('2026-03-01T12:00:00.000Z');
  const sent: OutboundMail[] = [];
  const trigger = vi.fn(async () => {});
  const lines: string[] = [];
  const deps: ScheduleDeps = {
    now: () => current,
    store,
    probe: async () => ({ ok: true, statusCode: 200, ms: 5 }),
    mailer: {
      send: async (message) => {
        sent.push(message);
      },
    },
    appBaseUrl: APP,
    signingKey: KEY,
    logger: createLogger({
      sink: (line) => lines.push(line),
      secrets: [KEY, 'ada@example.com'],
    }),
    trigger,
    ...patch,
  };
  return {
    deps,
    sent,
    trigger,
    lines,
    advance(ms: number) {
      current = new Date(current.getTime() + ms);
    },
  };
}

function site(n: number, patch?: Partial<RosterSite>): RosterSite {
  return {
    id: uid(2, n),
    ownerId: uid(1, n),
    url: `https://site-${n}.example/`,
    label: '',
    host: `site-${n}.example`,
    emailOptOut: false,
    lastOk: null,
    lastCheckedAt: null,
    incidentId: null,
    audits: [],
    ...patch,
  };
}

describe('calendrier Paris', () => {
  it('repère le lundi 8 h, hiver et été', () => {
    expect(isMondayEightParis(new Date('2026-01-05T07:00:00.000Z'))).toBe(true);
    expect(isMondayEightParis(new Date('2026-07-06T06:00:00.000Z'))).toBe(true);
    expect(isMondayEightParis(new Date('2026-01-05T06:00:00.000Z'))).toBe(
      false,
    );
    expect(isMondayEightParis(new Date('2026-01-06T07:00:00.000Z'))).toBe(
      false,
    );
  });

  it('calcule le lundi et le jour civil', () => {
    expect(parisWeek(new Date('2026-01-05T07:00:00.000Z')).week).toBe(
      '2026-01-05',
    );
    expect(parisWeek(new Date('2026-01-04T12:00:00.000Z')).week).toBe(
      '2025-12-29',
    );
    expect(parisDay('2026-01-15T23:30:00.000Z')).toBe('2026-01-16');
    expect(nextRunAt('weekly', new Date('2026-01-05T07:00:00.000Z'))).toBe(
      '2026-01-12T07:00:00.000Z',
    );
    expect(nextRunAt('monthly', new Date('2026-01-15T00:00:00.000Z'))).toBe(
      '2026-02-15T00:00:00.000Z',
    );
  });
});

describe('uptime_daily', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');

  it('médiane, repli et frontière des 30 jours', () => {
    expect(median([10, 30, 20])).toBe(20);
    expect(median([10, 40])).toBe(25);
    expect(median([])).toBeNull();
    const old = new Date(now.getTime() - UPTIME_KEEP_MS - 1).toISOString();
    const keep = new Date(now.getTime() - UPTIME_KEEP_MS).toISOString();
    const rows: RawCheck[] = [
      { id: 'a', siteId: 's', checkedAt: old, ok: false, ms: 10 },
      { id: 'b', siteId: 's', checkedAt: old, ok: true, ms: 30 },
      { id: 'c', siteId: 's', checkedAt: keep, ok: true, ms: 5 },
    ];
    expect(checksToPurge(rows, now).map((row) => row.id)).toEqual(['a', 'b']);
    const [day] = foldUptime(checksToPurge(rows, now));
    expect(day).toMatchObject({ checks: 2, failures: 1, p50Ms: 20 });
    const merged = mergeDaily(
      { checks: 2, failures: 1, p50Ms: 20 },
      { siteId: 's', day: '2026-01-01', checks: 2, failures: 0, p50Ms: 40 },
    );
    expect(merged.checks).toBe(4);
    expect(merged.failures).toBe(1);
  });
});

describe('sonde', () => {
  it('replie HEAD refusé vers un GET court', async () => {
    const calls: string[] = [];
    const sample = await readUptime(
      {
        async request(_url, method) {
          calls.push(method);
          return { status: method === 'HEAD' ? 405 : 204 };
        },
      },
      'https://exemple.example/',
    );
    expect(calls).toEqual(['HEAD', 'GET']);
    expect(sample).toMatchObject({ ok: true, statusCode: 204 });
  });

  it('compte un 500 comme injoignable, sans GET', async () => {
    const calls: string[] = [];
    const sample = await readUptime(
      {
        async request(_url, method) {
          calls.push(method);
          return { status: 500 };
        },
      },
      'https://exemple.example/',
    );
    expect(calls).toEqual(['HEAD']);
    expect(sample.ok).toBe(false);
  });

  it('relance un blocage et traite un GET trop gros comme joignable', async () => {
    await expect(
      readUptime(
        {
          request: () => {
            throw new NetError('BLOCKED_ADDRESS', 'refusée');
          },
        },
        'https://exemple.example/',
      ),
    ).rejects.toBeInstanceOf(NetError);

    const safeFetch = (async (_url, init) => {
      if (init?.method === 'GET')
        throw new NetError('RESPONSE_TOO_LARGE', 'gros');
      throw new Error('pas un GET');
    }) as SafeFetch;
    const probe = siteProbeFromSafeFetch(safeFetch);
    await expect(
      probe.request('https://exemple.example/', 'GET'),
    ).resolves.toEqual({
      status: 200,
    });
  });
});

describe('schedule-tick', () => {
  it('reste sous 30 s pour 50 sites, agrège et ne double pas la file', async () => {
    const store = new Memory();
    const now = new Date('2026-03-01T12:00:00.000Z');
    const old = new Date(
      now.getTime() - 31 * 24 * 60 * 60 * 1000,
    ).toISOString();
    for (let n = 1; n <= 50; n += 1) {
      const row = site(n);
      store.sites.push(row);
      store.emails.set(row.ownerId, `ada@example.com`);
      store.schedules.push({
        siteId: row.id,
        ownerId: row.ownerId,
        cadence: 'weekly',
        mode: n === 2 ? 'active' : 'passive',
        nextRunAt: now.toISOString(),
      });
      store.checks.push(
        { id: uid(3, n), siteId: row.id, checkedAt: old, ok: false, ms: 10 },
        { id: uid(4, n), siteId: row.id, checkedAt: old, ok: true, ms: 30 },
      );
    }
    const { deps, trigger, lines } = harness(store);
    const started = performance.now();
    const first = await runScheduleTick(deps);
    const elapsed = performance.now() - started;
    expect(elapsed).toBeLessThan(30_000);
    expect(first).toMatchObject({
      probed: 50,
      enqueued: 50,
      purged: 100,
      alerts: 0,
    });
    expect(trigger).toHaveBeenCalledOnce();
    expect(store.daily.size).toBe(50);
    const sample = store.daily.get(`${uid(2, 1)}:${parisDay(old)}`);
    expect(sample).toMatchObject({ checks: 2, failures: 1, p50Ms: 20 });
    expect(store.enqueued.find((item) => item.siteId === uid(2, 2))?.mode).toBe(
      'active',
    );
    const second = await runScheduleTick(deps);
    expect(second.probed).toBe(0);
    expect(second.enqueued).toBe(0);
    expect(second.purged).toBe(0);
    expect(trigger).toHaveBeenCalledOnce();
    expect(sample?.checks).toBe(2);
    expect(lines.join('\n')).not.toContain(KEY);
    expect(lines.join('\n')).not.toContain('ada@example.com');
  });

  it('alerte à la deuxième panne, au retour, puis plus', async () => {
    const store = new Memory();
    const row = site(1);
    store.sites.push(row);
    store.emails.set(row.ownerId, 'ada@example.com');
    const { deps, sent, advance } = harness(store, {
      probe: async () => ({ ok: false, statusCode: null, ms: 8 }),
    });
    await runScheduleTick(deps);
    expect(store.alerts).toHaveLength(0);
    advance(15 * 60_000);
    await runScheduleTick(deps);
    expect(store.alerts.map((alert) => alert.kind)).toEqual(['site_down']);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe('Votre site ne répond plus');
    expect(sent[0]?.text).toContain('deux fois de suite');
    expect(sent[0]?.html).not.toMatch(/<script/i);
    expect(sent[0]?.unsubscribeUrl).toContain('/api/unsubscribe');
    advance(15 * 60_000);
    await runScheduleTick(deps);
    expect(
      store.alerts.filter((alert) => alert.kind === 'site_down'),
    ).toHaveLength(1);
    deps.probe = async () => ({ ok: true, statusCode: 200, ms: 4 });
    advance(15 * 60_000);
    await runScheduleTick(deps);
    expect(store.alerts.map((alert) => alert.kind)).toEqual([
      'site_down',
      'site_recovered',
    ]);
    advance(15 * 60_000);
    await runScheduleTick(deps);
    expect(store.alerts).toHaveLength(2);
    expect(store.incidents[0]?.resolvedAt).toBeTruthy();
  });

  it('ne double pas baisse, problème grave ni certificat', async () => {
    const store = new Memory();
    const row = site(1, {
      audits: [
        audit(
          uid(5, 1),
          70,
          '2026-03-01T00:00:00.000Z',
          ['securite.https'],
          20,
          '2026-03-20',
        ),
        audit(uid(5, 2), 80, '2026-02-01T00:00:00.000Z', [], 40, '2026-04-01'),
      ],
    });
    store.sites.push(row);
    store.emails.set(row.ownerId, 'ada@example.com');
    const { deps, sent } = harness(store);
    await runScheduleTick(deps);
    await runScheduleTick(deps);
    const kinds = store.alerts.map((alert) => alert.kind).sort();
    expect(kinds).toEqual(['cert_expiring', 'grave_problem', 'score_drop']);
    expect(sent).toHaveLength(3);
    expect(sent.map((message) => message.subject).sort()).toEqual([
      'La note de votre site a baissé',
      'Le certificat expire bientôt',
      'Un problème grave est apparu',
    ]);
    expect(
      sent.every(
        (message) => message.html.includes('List-Unsubscribe') === false,
      ),
    ).toBe(true);
    expect(sent[0]?.text).toContain(sent[0]?.unsubscribeUrl ?? '');
  });

  it('ignore une baisse de 9 points et un problème déjà connu', async () => {
    const store = new Memory();
    store.sites.push(
      site(1, {
        audits: [
          audit(uid(5, 1), 71, '2026-03-01T00:00:00.000Z', ['securite.https']),
          audit(uid(5, 2), 80, '2026-02-01T00:00:00.000Z', ['securite.https']),
        ],
      }),
    );
    const { deps } = harness(store);
    await runScheduleTick(deps);
    expect(store.alerts).toHaveLength(0);
  });

  it('n’envoie rien si la personne s’est désabonnée', async () => {
    const store = new Memory();
    const row = site(1, {
      audits: [
        audit(uid(5, 1), 70, '2026-03-01T00:00:00.000Z'),
        audit(uid(5, 2), 90, '2026-02-01T00:00:00.000Z'),
      ],
    });
    store.sites.push(row);
    store.optOut.add(row.ownerId);
    store.emails.set(row.ownerId, 'ada@example.com');
    const { deps, sent } = harness(store);
    await runScheduleTick(deps);
    expect(sent).toHaveLength(0);
    expect(store.alerts[0]?.sentAt).toBeTruthy();
    expect(store.alerts[0]?.payload.suppressed).toBe(true);
  });

  it('ne sonde pas un blocage ni un contrôle trop récent', async () => {
    const store = new Memory();
    const row = site(1);
    store.sites.push(row);
    store.checks.push({
      id: uid(3, 1),
      siteId: row.id,
      checkedAt: new Date('2026-03-01T11:55:00.000Z').toISOString(),
      ok: true,
      ms: 4,
    });
    const { deps } = harness(store);
    const recent = await runScheduleTick(deps);
    expect(recent.probed).toBe(0);

    const blocked = new Memory();
    blocked.sites.push(site(2));
    const run = harness(blocked, {
      probe: async () => {
        throw new NetError('BLOCKED_ADDRESS', 'refusée');
      },
    });
    const result = await runScheduleTick(run.deps);
    expect(result.blocked).toBe(1);
    expect(blocked.checks).toHaveLength(0);
    expect(blocked.alerts).toHaveLength(0);
  });

  it('laisse l’échéance en place si la file refuse', async () => {
    const store = new Memory();
    store.enqueueMode = 'skip';
    const row = site(1);
    store.sites.push(row);
    store.schedules.push({
      siteId: row.id,
      ownerId: row.ownerId,
      cadence: 'monthly',
      mode: 'passive',
      nextRunAt: '2026-03-01T00:00:00.000Z',
    });
    const { deps, trigger } = harness(store);
    const result = await runScheduleTick(deps);
    expect(result.enqueued).toBe(0);
    expect(store.schedules[0]?.nextRunAt).toBe('2026-03-01T00:00:00.000Z');
    expect(trigger).not.toHaveBeenCalled();
  });

  it('avec un budget nul, met en file sans sonder', async () => {
    const store = new Memory();
    const row = site(1);
    store.sites.push(row);
    store.schedules.push({
      siteId: row.id,
      ownerId: row.ownerId,
      cadence: 'weekly',
      mode: 'passive',
      nextRunAt: '2026-03-01T00:00:00.000Z',
    });
    const { deps, trigger } = harness(store, { budgetMs: 0 });
    const result = await runScheduleTick(deps);
    expect(result.probed).toBe(0);
    expect(result.enqueued).toBe(1);
    expect(trigger).toHaveBeenCalledOnce();
  });

  it('répond au cron en JSON', async () => {
    const store = new Memory();
    const { deps } = harness(store);
    const denied = await handleSchedule(
      new Request('https://audigy.test/.netlify/functions/schedule-tick'),
      deps,
    );
    expect(denied.status).toBe(405);
    const ok = await handleSchedule(
      new Request('https://audigy.test/.netlify/functions/schedule-tick', {
        method: 'POST',
      }),
      deps,
    );
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { probed: number };
    expect(body.probed).toBe(0);
  });
});

describe('résumé et Brevo', () => {
  const user = uid(1, 1);
  const sites: DigestSite[] = [
    {
      label: '<script>',
      host: 'exemple.example',
      score: 80,
      checks: 100,
      failures: 2,
      openIncident: true,
    },
  ];

  it('envoie un HTML simple, une fois par semaine', async () => {
    const store = new Memory();
    store.digestPeople = [{ userId: user, sites }];
    store.emails.set(user, 'ada@example.com');
    const sent: OutboundMail[] = [];
    const lines: string[] = [];
    const deps = {
      now: () => new Date('2026-01-05T07:00:00.000Z'),
      store,
      mailer: {
        send: async (message: OutboundMail) => {
          sent.push(message);
        },
      },
      appBaseUrl: APP,
      signingKey: KEY,
      logger: createLogger({
        sink: (line) => lines.push(line),
        secrets: [KEY],
      }),
    };
    expect((await runWeeklyDigest(deps)).sent).toBe(1);
    expect((await runWeeklyDigest(deps)).sent).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe('Votre résumé de la semaine');
    expect(sent[0]?.text).toContain('98 %');
    expect(sent[0]?.text).toContain('Un incident est en cours.');
    expect(sent[0]?.html).toContain('&lt;script&gt;');
    expect(sent[0]?.html).not.toContain('<script>');
    expect(sent[0]?.html).not.toMatch(/https?:\/\/[^"']+\.(png|gif|js)/);
    expect(lines.join('\n')).not.toContain('ada@example.com');

    const early = await handleDigest(
      new Request('https://audigy.test/digest', { method: 'POST' }),
      { ...deps, now: () => new Date('2026-01-06T07:00:00.000Z') },
    );
    expect(early.status).toBe(204);
    const forced = await handleDigest(
      new Request('https://audigy.test/digest?run=1', { method: 'POST' }),
      { ...deps, now: () => new Date('2026-01-06T07:00:00.000Z') },
    );
    expect(forced.status).toBe(200);
  });

  it('relâche la semaine si Brevo refuse', async () => {
    const store = new Memory();
    store.digestPeople = [{ userId: user, sites }];
    store.emails.set(user, 'ada@example.com');
    let failed = false;
    const deps = {
      now: () => new Date('2026-01-05T07:30:00.000Z'),
      store,
      mailer: {
        send: async () => {
          if (!failed) {
            failed = true;
            throw new Error('brevo_rejected');
          }
        },
      },
      appBaseUrl: APP,
      signingKey: KEY,
      logger: createLogger({ sink: () => {} }),
    };
    expect((await runWeeklyDigest(deps)).sent).toBe(0);
    expect((await runWeeklyDigest(deps)).sent).toBe(1);
  });

  it('poste vers l’API Brevo sans mettre la clé dans le corps', async () => {
    const apiKey = 'brevo-test-key-0123456789abcd';
    const captured: {
      url: string;
      headers: Record<string, string>;
      body: string;
    }[] = [];
    const mailer = createBrevoMailer({
      apiKey,
      senderEmail: 'bonjour@audigy.test',
      fetch: async (url, init) => {
        captured.push({
          url: String(url),
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          body: String(init?.body ?? ''),
        });
        return new Response(null, { status: 201 });
      },
    });
    const link = `https://audigy.test/api/unsubscribe?user=${user}&token=${unsubscribeMac(KEY, user)}`;
    const body = renderAlert({
      kind: 'cert_expiring',
      payload: { dedup: 'cert:2026-03-20', site: 'Exemple', days: 0 },
      appUrl: APP,
      unsubscribeUrl: link,
    });
    expect(body?.subject).toBe('Le certificat expire bientôt');
    await mailer.send({
      to: 'ada@example.com',
      subject: body?.subject ?? '',
      text: body?.text ?? '',
      html: body?.html ?? '',
      unsubscribeUrl: link,
    });
    const call = captured[0];
    expect(call?.url).toBe(BREVO_URL);
    expect(call?.headers['api-key']).toBe(apiKey);
    const payload = call?.body ?? '';
    expect(payload).not.toContain(apiKey);
    expect(payload).toContain('List-Unsubscribe');
    expect(payload).toContain('List-Unsubscribe=One-Click');
    expect(payload).toContain('expire aujourd');
  });
});

describe('désabonnement', () => {
  const user = uid(1, 7);

  it('exige le jeton et n’agit qu’au POST', async () => {
    const applied: string[] = [];
    const deps = {
      key: KEY,
      logger: createLogger({ sink: () => {} }),
      apply: async (id: string) => {
        applied.push(id);
      },
    };
    const token = unsubscribeMac(KEY, user);
    const url = `https://audigy.test/api/unsubscribe?user=${user}&token=${token}`;
    const form = await handleUnsubscribe(new Request(url), deps);
    expect(form.status).toBe(200);
    const html = await form.text();
    expect(html).toContain('Me désabonner');
    expect(html).toContain('method="post"');
    expect(html).not.toContain('C’est fait');
    expect(applied).toHaveLength(0);

    const done = await handleUnsubscribe(
      new Request(url, {
        method: 'POST',
        body: 'List-Unsubscribe=One-Click',
      }),
      deps,
    );
    expect(done.status).toBe(200);
    expect(await done.text()).toContain('C’est fait');
    expect(applied).toEqual([user]);

    const bad = await handleUnsubscribe(
      new Request(`${url}00`, { method: 'POST' }),
      deps,
    );
    expect(bad.status).toBe(400);
    expect(applied).toHaveLength(1);
    expect(verifyUnsubscribe(KEY, user, token)).toBe(true);
    expect(verifyUnsubscribe('autre-cle-0123456789abcdef', user, token)).toBe(
      false,
    );
  });
});

describe('contrat', () => {
  it('refuse un roster illisible et accepte le schéma prévu', () => {
    expect(() => parseRoster({})).toThrow('schedule_roster_invalid');
    const parsed = parseRoster({
      sites: [
        {
          id: uid(2, 1),
          ownerId: uid(1, 1),
          url: 'https://exemple.example/',
          label: '',
          host: 'exemple.example',
          emailOptOut: false,
          lastOk: null,
          lastCheckedAt: null,
          incidentId: null,
          audits: [
            {
              id: uid(5, 1),
              score: null,
              finishedAt: null,
              graves: [],
              certDays: 10,
              certUntil: null,
            },
          ],
        },
      ],
      due: [],
    });
    expect(parsed.sites[0]?.audits[0]?.certDays).toBe(10);
    expect(() => parseDigest([{ userId: 'non', sites: [] }])).toThrow(
      'digest_roster_invalid',
    );
    expect(digestRateKey(uid(1, 1), '2026-01-05')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('décrit le cron, la purge et les alertes dans le dépôt', () => {
    const migration = readFileSync(
      `${ROOT}supabase/migrations/20261024183000_schedule.sql`,
      'utf8',
    );
    const tick = readFileSync(
      `${ROOT}netlify/functions/schedule-tick.ts`,
      'utf8',
    );
    const digest = readFileSync(
      `${ROOT}netlify/functions/digest-weekly.ts`,
      'utf8',
    );
    expect(tick).toContain("schedule: '*/15 * * * *'");
    expect(digest).toContain("schedule: '0 6,7 * * 1'");
    expect(migration).toContain('email_opt_out');
    expect(migration).toContain('securite.certificate');
    expect(migration).toContain('severity = 4');
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain('incidents_one_open_idx');
    expect(migration).toContain(
      'revoke all on function public.schedule_roster(timestamptz)',
    );
    expect(migration).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}/);
    expect(() =>
      scheduleDepsFromEnv({
        env: {},
        requestUrl: APP,
        logger: createLogger({ sink: () => {} }),
      }),
    ).toThrow();
  });
});
