import type { Database } from '@audigy/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserClient } from './browser-session.js';
import { fixesFor, hostingOf } from './fix-catalog.js';
import { type HistoryView, rowsToHistory } from './history.js';
import { toFinding } from './report-model.js';

export async function loadSiteHistory(
  siteId: string,
  hosting: string,
): Promise<HistoryView | null> {
  const supabase = browserClient();
  if (!supabase || siteId === '') return null;
  try {
    return await readHistory(supabase, siteId, hosting);
  } catch {
    return null;
  }
}

async function readHistory(
  supabase: SupabaseClient<Database>,
  siteId: string,
  hosting: string,
): Promise<HistoryView | null> {
  const audits = await supabase
    .from('audits')
    .select('id, status, global_score, created_at, finished_at')
    .eq('site_id', siteId)
    .in('status', ['done', 'partial', 'failed'])
    .order('created_at', { ascending: true });
  if (audits.error || !audits.data || audits.data.length === 0) return null;
  const ids = audits.data.map((row) => row.id);
  const [domains, findings] = await Promise.all([
    supabase
      .from('domain_scores')
      .select('audit_id, domain, score')
      .in('audit_id', ids),
    supabase
      .from('findings')
      .select(
        'audit_id, check_id, status, message_key, params, fix_key, domain, severity, impact, score, measured, effort_minutes, reason',
      )
      .in('audit_id', ids),
  ]);
  if (domains.error || findings.error || !domains.data || !findings.data) {
    return null;
  }
  const fixes = fixesFor(hostingOf(hosting));
  const built = rowsToHistory({
    audits: audits.data,
    domains: domains.data,
    findings: findings.data.map((row) => {
      const fix = row.fix_key ? fixes.get(row.fix_key) : undefined;
      return {
        audit_id: row.audit_id,
        check_id: row.check_id,
        status: row.status,
        title: toFinding(
          {
            domain: row.domain,
            checkId: row.check_id,
            status: row.status,
            severity: row.severity,
            impact: row.impact,
            score: row.score,
            measured: row.measured,
            messageKey: row.message_key,
            params: row.params,
            fixKey: row.fix_key,
            effortMinutes: row.effort_minutes,
            reason: row.reason,
          },
          fix,
        ).title,
      };
    }),
  });
  if (built.points.length === 0) return null;
  return built;
}
