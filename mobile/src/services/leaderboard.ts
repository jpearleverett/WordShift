/**
 * Async Daily Challenge leaderboard (light social layer).
 *
 * Backend-optional: every function is a no-op returning null when Supabase is
 * unconfigured (see supabaseClient.ts). Never throws — failures resolve to null.
 *
 * Identity is the anonymous install id (getBackendIdentity). No auth, no
 * profiles, no friend graph — just an async standing on a shared daily puzzle.
 *
 * Scoring: lower time wins, ties broken by more stars (then fewer hints). A
 * player's "percentile" is the percent of OTHER players they beat that day.
 *
 * SQL to provision this (see leaderboard report notes) lives alongside the
 * socialProof counters — both share the `daily` date key (local-day string).
 */

import {
  isSupabaseConfigured,
  getBackendIdentity,
  sbSelect,
  sbInsert,
  sbRpc,
} from './supabaseClient';

/** A single submitted daily result (mirrors the `daily_scores` row shape). */
export interface DailyScoreRow {
  owner: string;
  date: string;
  time_ms: number;
  stars: number;
  hints: number;
  /** Optional anonymous display handle (never required). */
  handle?: string | null;
  created_at?: string;
}

export interface SubmitDailyArgs {
  /** Local-day string (YYYY-MM-DD) — must match the daily challenge's date. */
  date: string;
  timeMs: number;
  stars: number;
  hintsUsed: number;
  /** Optional anonymous handle to show on the board. */
  handle?: string | null;
}

export interface DailyRank {
  /** 1-based standing (1 = best). */
  rank: number;
  /** Total players who submitted for that date (including this player). */
  total: number;
  /** Percent of other players beaten, 0-100. */
  percentile: number;
}

/**
 * Submit (upsert) the player's daily result. Keyed unique on (owner, date), so
 * re-submitting the same day overwrites the previous attempt. No-op (null) when
 * the backend is unconfigured. Never throws.
 */
export async function submitDailyResult(
  args: SubmitDailyArgs,
): Promise<DailyScoreRow | null> {
  if (!isSupabaseConfigured()) return null;

  const owner = await getBackendIdentity();
  if (!owner) return null;

  const row: DailyScoreRow = {
    owner,
    date: args.date,
    time_ms: Math.max(0, Math.round(args.timeMs)),
    stars: Math.max(0, Math.round(args.stars)),
    hints: Math.max(0, Math.round(args.hintsUsed)),
    handle: args.handle ?? null,
    created_at: new Date().toISOString(),
  };

  const result = await sbInsert<DailyScoreRow>('daily_scores', row, {
    upsert: true,
    onConflict: 'owner,date',
    returning: true,
  });
  if (!result) return null;
  return result[0] ?? row;
}

/**
 * Order comparator: lower time first, then more stars, then fewer hints.
 * Returns negative when `a` ranks ahead of `b`.
 */
function compareScores(a: DailyScoreRow, b: DailyScoreRow): number {
  if (a.time_ms !== b.time_ms) return a.time_ms - b.time_ms;
  if (a.stars !== b.stars) return b.stars - a.stars;
  return a.hints - b.hints;
}

/**
 * Compute the player's standing for `date`. Prefers an atomic server RPC
 * (`daily_rank`) for efficiency; falls back to selecting the day's scores and
 * ranking client-side if the RPC is absent / returns nothing.
 *
 * Returns null when unconfigured or when there's no data for the player.
 */
export async function getDailyRank(date: string): Promise<DailyRank | null> {
  if (!isSupabaseConfigured()) return null;

  const owner = await getBackendIdentity();
  if (!owner) return null;

  // --- Preferred: server-side RPC ---------------------------------------
  const rpc = await sbRpc<
    DailyRank | DailyRank[] | null
  >('daily_rank', { p_date: date, p_owner: owner });
  const rpcRow = Array.isArray(rpc) ? rpc[0] : rpc;
  if (
    rpcRow &&
    typeof rpcRow.rank === 'number' &&
    typeof rpcRow.total === 'number' &&
    rpcRow.total > 0
  ) {
    return {
      rank: rpcRow.rank,
      total: rpcRow.total,
      percentile: clampPercentile(
        typeof rpcRow.percentile === 'number'
          ? rpcRow.percentile
          : computePercentile(rpcRow.rank, rpcRow.total),
      ),
    };
  }

  // --- Fallback: client-side ranking ------------------------------------
  const rows = await sbSelect<DailyScoreRow>(
    'daily_scores',
    `select=owner,date,time_ms,stars,hints&date=eq.${encodeURIComponent(date)}`,
  );
  if (!rows || rows.length === 0) return null;

  const me = rows.find((r) => r.owner === owner);
  if (!me) return null;

  const total = rows.length;
  // rank = 1 + number of players strictly better than me.
  const rank =
    1 + rows.filter((r) => r.owner !== owner && compareScores(r, me) < 0).length;

  return { rank, total, percentile: computePercentile(rank, total) };
}

/**
 * Percent of OTHER players beaten. rank 1 of N beats (N-1)/(N-1) = 100%.
 * A lone player (total 1) beats 0 others → 0%.
 */
function computePercentile(rank: number, total: number): number {
  if (total <= 1) return 0;
  const beaten = total - rank; // players ranked worse than me
  return clampPercentile((beaten / (total - 1)) * 100);
}

function clampPercentile(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Spoiler-safe, phase-aware-toned standing copy. The "seekers" framing reads
 * fine in every phase (it never names the cult or the phase). Kept subtle.
 */
export function getBeatPercentText(percentile: number, phase = 0): string {
  const pct = clampPercentile(percentile);
  if (phase >= 4) {
    return `You stand ahead of ${pct}% of those gathered today`;
  }
  if (phase >= 2) {
    return `You outpaced ${pct}% of seekers today`;
  }
  return `You beat ${pct}% of seekers today`;
}
