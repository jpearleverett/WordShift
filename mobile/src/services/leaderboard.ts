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
 * SECURITY: everything goes through SECURITY DEFINER RPCs
 * (docs/supabase/security_setup.sql). Direct `daily_scores` access is
 * RLS-denied, so the client can never enumerate other players' owner ids —
 * `submit_daily_score` writes only the caller's (owner, date) row and
 * `daily_rank` returns aggregate standing only (rank/total/percentile).
 * When the rank RPC is missing/empty we degrade to "no rank shown" (null)
 * rather than reading the table.
 */

import { isSupabaseConfigured, getBackendIdentity, sbRpc } from './supabaseClient';
import { DAILY_BOARD_VERSION } from './dailyBoardVersion';

/** A single submitted daily result (mirrors the `daily_scores` row shape). */
export interface DailyScoreRow {
  owner: string;
  date: string;
  board_version?: string;
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
  /** Preserve the version captured when the board was served/restored. */
  boardVersion?: string;
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
 * Submit (upsert) the player's daily result via the `submit_daily_score`
 * SECURITY DEFINER RPC — keyed unique on (owner, date), so re-submitting the
 * same day overwrites the previous attempt. The server bounds-checks the score
 * fields and rejects absurd values (an empty result → null here). No-op (null)
 * when the backend is unconfigured. Never throws.
 */
export async function submitDailyResult(
  args: SubmitDailyArgs,
): Promise<DailyScoreRow | null> {
  if (!isSupabaseConfigured()) return null;

  const owner = await getBackendIdentity();
  if (!owner) return null;

  const result = await sbRpc<DailyScoreRow | DailyScoreRow[] | null>(
    'submit_daily_score_v2',
    {
      p_owner: owner,
      p_date: args.date,
      p_board_version: args.boardVersion ?? DAILY_BOARD_VERSION,
      p_time_ms: Math.max(0, Math.round(args.timeMs)),
      p_stars: Math.max(0, Math.round(args.stars)),
      p_hints: Math.max(0, Math.round(args.hintsUsed)),
      p_handle: args.handle ?? null,
    },
  );
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || typeof row.time_ms !== 'number') return null;
  return row;
}

/**
 * Compute the player's standing for `date` via the aggregate-only `daily_rank`
 * SECURITY DEFINER RPC (rank/total/percentile — never other players' rows).
 * There is deliberately NO client-side fallback: direct `daily_scores` reads
 * are RLS-denied, so a missing/empty RPC degrades to "no rank shown" (null).
 *
 * Returns null when unconfigured or when there's no data for the player.
 */
export async function getDailyRank(date: string, boardVersion = DAILY_BOARD_VERSION): Promise<DailyRank | null> {
  if (!isSupabaseConfigured()) return null;

  const owner = await getBackendIdentity();
  if (!owner) return null;

  const rpc = await sbRpc<
    DailyRank | DailyRank[] | null
  >('daily_rank_v2', { p_date: date, p_owner: owner, p_board_version: boardVersion });
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
  return null;
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
