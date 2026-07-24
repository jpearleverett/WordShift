/**
 * Centralized game balance constants for WordShift.
 *
 * Numeric tuning values that affect game economy, progression,
 * puzzle generation, and narrative pacing live here. When a designer
 * wants to tweak "how many puzzles until Phase 2?" or "how much amber
 * for a streak freeze?", this is the first file to check.
 *
 * Known exceptions (live values owned elsewhere — keep them there):
 * - Word cooldown/diversity tuning lives in services/wordHistory.ts
 *   (HARD_COOLDOWN / SOFT_COOLDOWN / MAX_HISTORY_SIZE).
 * - The daily-challenge streak-freeze interval lives in
 *   services/dailyChallenge.ts (DAILY_FREE_FREEZE_INTERVAL_DAYS).
 *
 * DO NOT put UI layout values, color palettes, or animation curves
 * here — those belong in theme/ or component-level constants.
 */

import { Difficulty } from '../types';
import { DialoguePhase } from '../types/homeWorld';

// ============================================================================
// PHASE PROGRESSION
// ============================================================================

/** Puzzle thresholds for phase transitions (weighted progress values). */
export const PHASE_THRESHOLDS = [0, 16, 44, 84, 124];

/**
 * Minimum real puzzles the player must have completed before a phase
 * can activate — prevents narrative acceleration from skipping content.
 *
 * These floors are the *binding* constraint for engaged (accelerating)
 * players: once weighted progress clears PHASE_THRESHOLDS, the floor is what
 * actually gates the transition. The Phase 4 (cult reveal) and Phase 5
 * (post-revelation) floors are deliberately reachable — the entire narrative
 * payoff lives there, so an engaged player arrives at the climax in under two
 * committed weeks rather than a months-long grind.
 *
 * 2026-07 compressed geography (~×0.7 of the fun-overhaul arc): the whole arc
 * moved down so a CASUAL 2-puzzle/day player reaches the reveal around day 45
 * (was ~day 65) and post-revelation around day 60 (was ~day 81), while an
 * ENGAGED 8/day player lands the reveal ~day 11-12 and the finale ~day 15.
 * Phase 2 (Deeper Questions) spans ~34 puzzles (floor 28 → floor 62) — long
 * enough to earn the dusk, short enough that the single-tone stretch never
 * becomes the D14 quit point. The reveal floor sits at 90, just before the
 * Sky Garden gate (92) and house completion/recruit (~96-100), so the Phase-4
 * dwell window (~104-108) plays out inside a finished temple; arming waits
 * for 115, the marked final board is ~116, and post-revelation ~117-122. The
 * vanguard tier's +1 offset means vanguard animals speak Phase-4 lines across
 * the 62→90 window (Phase 3 floor → reveal floor); that leak is ACCEPTED as
 * the price of pacing — the oracle whispering ahead of the reveal reads as
 * foreshadowing, not spoilage.
 */
export const MIN_PUZZLES_FOR_PHASE: Record<DialoguePhase, number> = {
  0: 0,
  1: 12,
  2: 28, // Deeper Questions inside week one for engaged players; casual players hit it in ~2 weeks
  3: 62, // Growing Shadows — opens a ~34-puzzle Phase 2 span (28→62) and starts the vanguard +1 leak window (accepted, see above)
  4: 90, // The Horizon — the cult reveal, just before the Sky Garden gate (92) and house completion/recruit (~96-100)
  5: 120, // Post-revelation — after house completion/recruit (≈96-100), dwell completion (≈104-108), arming (115), final board (≈116), and post-revelation (≈117-122)
};

// ============================================================================
// AMBER ECONOMY
// ============================================================================

/** Base amber reward per difficulty level. */
export const AMBER_REWARDS: Record<Difficulty, number> = {
  EASY: 8,
  MEDIUM: 10,
  MEDIUM_PLUS: 15,
  HARD: 20,
  EXPERT: 28, // apex 6-letter tier
};

/**
 * One-time bonus amber for first completion of each difficulty level.
 * Creates small windfall moments that feel exciting and incentivize
 * trying harder difficulties.
 */
export const FIRST_COMPLETION_BONUS: Record<Difficulty, number> = {
  EASY: 10,
  MEDIUM: 20,
  MEDIUM_PLUS: 30,
  HARD: 50,
  EXPERT: 75,
};

/** Challenge mode amber multiplier (applied on top of base + star bonuses). */
export const CHALLENGE_AMBER_MULTIPLIER = 1.5;

// ============================================================================
// MONETIZATION (scaffold — inert behind NoOp providers)
// ============================================================================

/**
 * Flat per-puzzle amber bonus granted to Patron's Key holders.
 *
 * IMPORTANT: this is added to the amber *reward* only. It must NEVER feed phase
 * progression (phaseProgress / phase thresholds) — pacing stays identical for
 * free and paid players (hard rule: no pay-to-skip-phases).
 */
export const PATRON_AMBER_BONUS = 2;

// ============================================================================
// SURPRISE BONUS (variable-ratio reward)
// ============================================================================

/**
 * Variable-ratio "lucky" amber bonus on a win — the one intentionally
 * non-deterministic reward in an otherwise fully predictable economy. Applies
 * to EVERY victory past the onboarding window (standard, challenge, and daily
 * alike — computeSurpriseBonus runs unconditionally in awardPuzzleAmber). On a
 * small fraction of victories the player gets a modest extra amber windfall,
 * the unpredictable-reward lever that keeps "just one more puzzle" alive.
 *
 * IMPORTANT (hard rule, mirrors PATRON_AMBER_BONUS): this is additive to the
 * amber *reward* only. It must NEVER feed phase progression — pacing stays
 * identical whether or not the surprise fires.
 */
export const SURPRISE_BONUS_CHANCE = 0.12;

/** Flat surprise amber granted (scaled by difficulty) when the bonus fires. */
export const SURPRISE_BONUS_AMOUNTS: Record<Difficulty, number> = {
  EASY: 6,
  MEDIUM: 8,
  MEDIUM_PLUS: 12,
  HARD: 16,
  EXPERT: 20,
};

/**
 * Suppress the surprise bonus until the player has solved at least this many
 * puzzles — keeps the early/onboarding economy clean and predictable, mirroring
 * how other variable mechanics ramp in only after the tutorial window.
 */
export const SURPRISE_BONUS_MIN_PUZZLES = 8;

/**
 * Amber cost to refill one extra undo in Challenge mode (the only mode where
 * undos are scarce). A convenience sink spent from EARNED amber — never a paid
 * currency, never affects narrative progress.
 */
export const AMBER_UNDO_REFILL_COST = 15;

// ============================================================================
// MOVE RESONANCE (choice-quality reward)
// ============================================================================
// When a committed move had 2+ genuinely distinct valid outcome words AND the
// player chose one at the deepest available dread tier (tier >= 1), the move
// is a "resonant choice": small amber on the spot, itemized at victory.
// Amber only — like every bonus, this must NEVER feed phase progression
// (ritual energy already carries the dread->progress channel; this rewards
// CHOOSING well, and pacing stays identical however the player chooses).

/** Amber granted per resonant choice (see usePuzzleGame resonance tracking). */
export const RESONANT_MOVE_AMBER = 2;

/** Cap on resonance amber per board (keeps the bonus a garnish, not a farm). */
export const RESONANT_BOARD_CAP_AMBER = 6;

// ============================================================================
// HOUSE ASKS (optional per-board constraint beat)
// ============================================================================
// On some standard boards past HOUSE_ASK_MIN_PUZZLES, the house quietly asks
// one small thing of the arrangement: a specific letter must travel, or must
// be left untouched. Both ask types are derived from the board's stored
// solution, so every ask is satisfiable by construction; on multi-route
// boards the ask selects BETWEEN routes, which is the point. Soft-fail (an
// unkept ask is never mentioned again), bonus amber only, never progress.

/** Earliest solve count at which the house may place an ask. */
export const HOUSE_ASK_MIN_PUZZLES = 40;

/** Chance that an eligible standard board carries an ask. */
export const HOUSE_ASK_CHANCE = 0.25;

/** Amber granted when the ask is kept (evaluated at victory). */
export const HOUSE_ASK_REWARD_AMBER = 15;

/**
 * Max rewarded-video grants a player can claim per local day (anti-farm).
 * Ad amber stays small relative to phase thresholds so it can't trivialize pacing.
 */
export const REWARDED_DAILY_CAP = 8;

/**
 * Daily "watch a short clip → free amber" faucet. A separate, tighter per-day
 * cap than REWARDED_DAILY_CAP (which also covers hint/speed rescues). Sized so a
 * full week of watching (~840) only equals one small amber pack — meaningful for
 * an engaged free player and good ad inventory, but it never undercuts buying
 * amber or feeds phase progress (amber never does). Patron holders get the grant
 * for free (no ad — they bought the quiet table).
 */
export const DAILY_AMBER_REWARD = 60;
export const DAILY_AMBER_DAILY_CAP = 2;

/**
 * Interstitial cadence: at most one interstitial every Nth completed puzzle, and
 * the gap only ever WIDENS as the story darkens. EARLY applies in the bright
 * candy phases (0–2); at the dusk turn (Phase 3) shouldShowInterstitial doubles
 * the gap (→ every 10), and from the reveal on (Phase 4+) interstitials are
 * silenced entirely. Kept a genuinely light touch even early, so ads never
 * trample the first-impression / review window (the candy hours are the game's
 * single differentiator and where store reviews are won). Patron holders and
 * every narrative-beat exemption bypass this entirely (see ads.ts).
 */
export const INTERSTITIAL_FREQUENCY_EARLY = 6; // Phase 0–2 (candy hours: light touch)
export const INTERSTITIAL_FREQUENCY_LATE = 5; // Phase 3 base (×2 → every 10); Phase 4+ suppressed

/**
 * No interstitial before this many completed puzzles. Wider than the pit
 * auto-collect window (8) on purpose: the puzzle 8-10 stretch already stacks
 * the daily unlock, the mandatory first harvest, and the reverse-variant
 * intro, and dropping the first-ever ad into that pile-up made the "free ride
 * ends" cliff read punitive. 16 (not 12): at 12 the first ad landed on the
 * exit of win 13, the SAME board whose start carries the one-time
 * preview-graduation toast (PREVIEW_GRADING_FULL_LIMIT = 12), so the marks
 * stepped back and the first ad hit in one breath. 16 puts the first ad at
 * the exit of win 17, clear of graduation (board 13) and the challenge-toggle
 * intro (15). Deliberately no longer equal to EXIT_NUDGE_MIN_PUZZLES (12):
 * the nudge and the interstitial never stack on one exit anyway
 * (runVictoryExitNudges skips when an interstitial showed).
 */
export const INTERSTITIAL_MIN_PUZZLES = 16;

// ============================================================================
// HINT ECONOMY
// ============================================================================
// Hints are a consumable resource. A player starts with a free stash, can earn
// more from the opt-in `hint_recovery` rewarded ad, or buy hint packs (IAP).
// Spending a hint still costs stars (the star-rating penalty is unchanged), so
// hints buy *convenience*, never narrative progress (3-star → phase accel is
// untouched by simply *having* hints available).

/** Free hints granted once, the first time the hint balance is initialized. */
export const STARTING_FREE_HINTS = 5;

/** Hints granted per completed `hint_recovery` rewarded ad view. */
export const REWARDED_HINT_GRANT = 1;

// ============================================================================
// IN-APP PURCHASES (consumable packs)
// ============================================================================
// Amber/hint amounts granted by each consumable SKU. Amber packs are a
// convenience faucet for the cosmetic shop + amber sinks — they credit the
// REWARD balance only and (like every amber source) never feed phase progress.

// Amber granted per amber pack SKU. Tuned so per-dollar value ESCALATES with
// pack size (small ~606/$, medium ~669/$, large ~787/$ at $0.99/$2.99/$6.99) —
// standard ladder psychology that rewards trading up. The largest pack is the
// genuine best value and carries the "best value" badge (see CONSUMABLE_PRODUCTS).
export const AMBER_PACK_GRANTS = {
  small: 600,
  medium: 2000,
  large: 5500, // best-value tier (highest amber-per-dollar)
} as const;

/** Hints granted per hint pack SKU. */
export const HINT_PACK_GRANTS = {
  small: 5,
  large: 20,
} as const;

/**
 * One-time starter bundle (STARTER_PACK SKU). Purchasable exactly once per
 * account — enforced via the `starter_pack` entitlement in entitlements.ts.
 */
export const STARTER_PACK_GRANTS = {
  amber: 400,
  hints: 5,
} as const;

/**
 * The FIRST consumable amber pack a player ever buys grants this multiple of
 * its normal amount (one-time incentive; consumed on first success and tracked
 * in entitlements.ts alongside the other store-authoritative-adjacent state).
 */
export const FIRST_PURCHASE_AMBER_MULTIPLIER = 2;

// ============================================================================
// SUPPORTER SUBSCRIPTION (recurring revenue — never phase progress)
// ============================================================================
// An auto-renewing subscription (SUPPORTER_SUB / `supporter` entitlement). Value
// is ad-free + a recurring monthly amber stipend + an exclusive cosmetic + the
// season pass premium track included. All convenience/expression — like every
// amber source, the stipend credits the REWARD balance only and NEVER feeds
// phase progression (hard rule: no pay-to-skip-phases). Delivered idempotently,
// once per local month, by supporterStipend.ts.

/** Amber granted to an active Supporter each local month (recurring stipend). */
export const SUPPORTER_MONTHLY_AMBER = 300;

// ============================================================================
// COSMETIC SEASON PASS (durable recurring amber sink + subscription perk)
// ============================================================================
// A monthly cosmetic reward track (seasonPass.ts). A FREE track earned purely by
// playing (puzzles solved in-season advance tiers), and a PREMIUM track with
// richer rewards. Premium is unlocked EITHER by an active Supporter subscription
// (a recurring reason to subscribe) OR by spending amber (the durable monthly
// sink the economy was missing — see the revenue assessment's "~$25 sink
// ceiling"). Rewards are amber (reward-only, never phase progress) + an exclusive
// premium cosmetic. Deliberately NOT a pay-to-progress lever: no season reward
// touches phaseProgress, and the pass never gates narrative content.

/** Reward tiers per season. */
export const SEASON_PASS_TIERS = 10;
/** In-season puzzles solved to advance one tier (10 tiers ≈ 60 solves / month). */
export const SEASON_PASS_PUZZLES_PER_TIER = 6;
/** Free-track amber granted per claimed tier. */
export const SEASON_PASS_FREE_AMBER_PER_TIER = 20;
/** Premium-track amber granted per claimed tier (additive to the free track). */
export const SEASON_PASS_PREMIUM_AMBER_PER_TIER = 50;
/**
 * Amber cost for a non-subscriber to unlock the premium track for the current
 * season. Sized as a genuine monthly sink for an amber-rich player (roughly a
 * week-plus of engaged earning) while staying well under a large amber pack, so
 * it never reads as "pay real money or grind" — Supporters get it for free.
 */
export const SEASON_PASS_PREMIUM_AMBER_COST = 2500;

// ============================================================================
// MONETIZATION SOFT PROMPTS
// ============================================================================
// Gentle, frequency-capped nudges (never modal spam). All are suppressed for
// players who already own the relevant entitlement.

/** Earliest puzzle count at which the shared victory-exit nudge chain may run. */
export const EXIT_NUDGE_MIN_PUZZLES = 12;

/** Minimum completed puzzles between proactive victory-exit nudges. */
export const EXIT_NUDGE_SPACING_PUZZLES = 5;

/**
 * Earliest puzzle count at which the one-time Patron nudge may appear.
 * Held back to 50: the pitch lands after the player has met the first
 * gated room and the daily habit has had a chance to form — an invested player
 * hears "support the game" as a fair ask; a day-one player hears a shakedown.
 */
export const PATRON_NUDGE_MIN_PUZZLES = 50;

/** Show the Remove-Ads nudge once this many interstitials have been seen. */
export const REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS = 3;

/**
 * Earliest puzzle count for Fox's one-time "Keeper's Welcome" starter-pack intro.
 * Pushed to puzzle 35 so the store pitch never lands inside the first-session
 * cluster of new-thing introductions (journal, daily, variants, challenge,
 * mandatory harvest all fire before this) — the newcomer meets the game before
 * the game asks for anything. Suppressed if the starter pack is already owned.
 */
export const STARTER_INTRO_MIN_PUZZLES = 35;

/**
 * Puzzle count where the Journal Hub (ledger, gallery, quests) and the header
 * quest pill become visible, ending the post-tutorial "light mode" home.
 * Quest GENERATION is gated on the same number (weeklyQuests) so quests can
 * never accrue and expire invisibly before the player has a surface for them.
 */
export const JOURNAL_UNLOCK_PUZZLES = 6;

/**
 * Preview-grading transition. The tutorial's ✓/✗ marks remain on every board
 * below FULL_LIMIT (any difficulty). At FULL_LIMIT the normal verb-depth rules
 * take over permanently for MEDIUM+/daily/shared boards: the marks step back
 * for good (a one-time in-world notice explains it) and never resurrect on a
 * mistake. EASY and double-shift remain graded; Blind Offering has no previews.
 */
export const PREVIEW_GRADING_FULL_LIMIT = 12;

// ============================================================================
// OFFERING PIT
// ============================================================================

/** Pit amber auto-collects through this many puzzles before manual harvest begins. */
export const AUTO_COLLECT_PUZZLE_LIMIT = 8;

/**
 * Finale dwell: the cult-reveal finale used to fire on the FIRST Phase-4
 * victory with a complete house, so the entire robed/storm/sacrifice era
 * (300 written dialogue lines) flashed past in ~2 puzzles. The player must
 * now complete this many Phase-4 puzzles with the house complete — long
 * enough, against the 5-puzzle Phase-4 dialogue cooldown, for multiple
 * sessions per animal and the sacrifice mechanic to actually be played.
 * The capped eight-win window is necessary but not sufficient: arming also
 * requires `FINALE_ARM_MIN_PUZZLES` (115). Once both conditions are met,
 * amberCurrency.finaleArmed makes the NEXT standard board the marked FINAL
 * BOARD (dread-seeded, quiet start line), and its victory plays the arrival.
 * Never revealed as a counter (narrative rule 7); the house "is not yet ready
 * to receive it."
 */
export const FINALE_DWELL_PUZZLES = 8;

/**
 * The earliest completed-puzzle count at which a full Phase-4 dwell can arm
 * the finale. It gives the descent trio time to speak before the marked final
 * board (~116) and post-revelation (~117-122), even when house
 * completion/recruit lands around 96-100 and the eight-win dwell completes
 * around 104-108.
 */
export const FINALE_ARM_MIN_PUZZLES = 115;

/**
 * New Cycle (NG+) phase-progress acceleration per completed cycle. Each cycle
 * makes the descent ~30% faster (dread arrives earlier) while the collection is
 * kept, capped so even a deep cycle can't collapse the arc to nothing.
 * Multiplied onto the normal phase acceleration in awardPuzzleAmber.
 */
export const NEW_CYCLE_ACCELERATION_PER_CYCLE = 0.3;
export const NEW_CYCLE_ACCELERATION_MAX = 2.0;

/**
 * Pending (unoffered) pit amber at or above which the home screen gives a
 * gentle once-per-session Fox nudge to go harvest. High enough that a player
 * banking a puzzle or two never sees it; the pit-entrance glow remains the
 * primary ambient signal.
 */
export const HARVEST_NUDGE_MIN_AMBER = 150;

// ============================================================================
// ROOM UNLOCK — "skip the wait"
// ============================================================================

/**
 * Amber premium for skipping a level-gated room's puzzle requirement and
 * unlocking it immediately (vs Reserve, which pays the plain cost and waits for
 * the gate). skip cost = ceil(buildCost * (1 + UNLOCK_SKIP_PREMIUM)). This is
 * convenience pricing: a meaningful premium over Reserve so the gate keeps its
 * shape, sized so a player who can afford the room can usually also afford the
 * skip with a session or two of earnings. At 0.5 the gated rooms (build
 * 200-550) skip for 300-825. Reserve (base cost, auto-build at the gate) stays
 * the non-paying path, so the premium is a convenience, never a wall. Tune
 * post-launch on real data.
 */
export const UNLOCK_SKIP_PREMIUM = 0.5;

// ============================================================================
// STREAK
// ============================================================================

/** Minimum streak length to start receiving streak bonuses. */
export const MIN_STREAK_FOR_BONUS = 2;

/** Bonus percentage per streak day (e.g., 0.10 = 10% per day). */
export const BONUS_PER_STREAK = 0.10;

/** Maximum streak bonus percentage (1.0 = 100% cap = double rewards). */
export const MAX_BONUS_PERCENTAGE = 1.0;

/** Days of inactivity before streak resets (grace period). */
export const STREAK_RESET_DAYS = 2;

/** Amber cost to purchase a streak freeze. */
export const STREAK_FREEZE_COST = 50;

/** Days between free streak freeze grants. */
export const FREE_FREEZE_INTERVAL_DAYS = 14;

/**
 * Maximum banked main-streak freezes (purchased + free 14-day grants combined).
 * Uncapped freezes were stackable into an effectively unbreakable streak, which
 * hollows out the daily-habit tension the streak exists to create. Purchases
 * refuse at the cap and the free grant simply waits until a freeze is consumed.
 */
export const STREAK_FREEZE_CAP = 3;

/** Streak milestones that award one-time amber bonuses when crossed. */
export const STREAK_MILESTONES: {
  streak: number;
  amber: number;
  message: string;
  darkMessage?: string;
}[] = [
  { streak: 3, amber: 15, message: 'Three-day streak!' },
  { streak: 7, amber: 30, message: 'One-week streak!', darkMessage: 'Seven days. The pattern notices.' },
  { streak: 14, amber: 50, message: 'Two-week streak!', darkMessage: 'Fourteen days without breaking the chain.' },
  { streak: 21, amber: 65, message: 'Three-week streak!', darkMessage: 'Twenty-one days. It recognizes your rhythm.' },
  { streak: 30, amber: 100, message: 'Thirty-day streak!', darkMessage: 'Thirty days. The arrangement is grateful.' },
];

// ============================================================================
// NARRATIVE ACCELERATION
// ============================================================================

/**
 * Narrative acceleration configuration.
 * Engaged players progress through phases faster based on performance.
 * An engaged player hits the reveal at the Phase-4 floor (~90 puzzles);
 * an unaccelerated casual player arrives near the weighted threshold (~124,
 * usually a little earlier because ritual energy tops up weighted progress).
 */
export const NARRATIVE_ACCELERATION = {
  // Three-star performance ramp (2026-07 smoothing): the multiplier climbs
  // LINEARLY from 1.0 at THREE_STAR_RAMP_START to the THREE_STAR_MULTIPLIER
  // ceiling at THREE_STAR_RAMP_END (so 1.25x at a 0.50 rate). The old hard
  // step (1.5x iff rate >= 0.5) let a one-percentage-point skill difference
  // move the reveal by weeks.
  THREE_STAR_RAMP_START: 0.4,
  THREE_STAR_RAMP_END: 0.6,
  // Ceiling of the three-star ramp (full value at/above THREE_STAR_RAMP_END).
  THREE_STAR_MULTIPLIER: 1.5,
  /** @deprecated The step threshold is replaced by the RAMP_START/RAMP_END
   *  linear ramp above; kept for compat with older callers/saved tooling. */
  THREE_STAR_RATE_THRESHOLD: 0.5,
  // Streak threshold: long streaks accelerate phase progression
  STREAK_THRESHOLD: 7,
  STREAK_MULTIPLIER: 1.25,
  // Difficulty-based: harder puzzles accelerate, easy stays neutral
  HARD_MULTIPLIER: 1.5,
  MEDIUM_PLUS_MULTIPLIER: 1.25,
  MEDIUM_MULTIPLIER: 1.0,
  EASY_MULTIPLIER: 1.0,
  // Trial ladder (2026-07 rebalance): Challenge keeps the ✓/✗ previews now, so
  // its wins are meaningfully easier than before — 1.5x progress, not the old
  // 2.0x. Blind Offering (the apex rung: challenge limits + no previews + free
  // moves judged once at the end) takes the 2.0x cap. Neither may exceed 2.0x:
  // the descent's pacing ceiling is a design constant.
  CHALLENGE_MULTIPLIER: 1.5,
  BLIND_MULTIPLIER: 2.0,
};

// ============================================================================
// CHALLENGE MODE
// ============================================================================

/**
 * Trial ladder configuration.
 *
 * The two rungs are mutually exclusive in the setup menu:
 * - CHALLENGE: no hints, limited undos (getMaxUndos), preview grading follows
 *   the global difficulty rule (graded on EASY only). 1.25x amber.
 * - BLIND OFFERING (apex): no hints, previews hidden entirely, free moves
 *   judged once at the end of the chain. Pays 2x amber. IMPORTANT: undos in
 *   blind are ALWAYS FREE and UNLIMITED — walking the chain back to a flaw is
 *   the mode's core repair loop, never a budgeted resource (design ruling; see
 *   usePuzzleGame.handleUndo). Blind runs under gameMode 'challenge' for the
 *   no-hints rule + amber accounting, but getMaxUndos below is NEVER consulted
 *   on the blind path, and App hides the undo-budget chrome while blind is on.
 */
export const CHALLENGE_MODE_CONFIG = {
  // Legacy constant — prefer getMaxUndos(difficulty) for challenge mode
  MAX_UNDOS: 1,
  /** Max undos for plain Challenge, scaled by difficulty. Blind ignores this
   *  (blind undos are always free — see the doc above). */
  getMaxUndos: (difficulty: Difficulty): number => {
    switch (difficulty) {
      case 'EASY': return 2;
      case 'MEDIUM': return 2;
      case 'MEDIUM_PLUS': return 1;
      case 'HARD': return 1;
      case 'EXPERT': return 1;
    }
  },
  // Amber reward multiplier for challenge completions (previews on)
  AMBER_MULTIPLIER: 1.25,
  // Amber reward multiplier for Blind Offering completions (the apex rung)
  BLIND_AMBER_MULTIPLIER: 2.0,
  // No hints allowed in challenge mode
  HINTS_ALLOWED: false,
};

// ============================================================================
// VARIANT ECONOMY
// ============================================================================

/**
 * Fresh-variant bonus: a flat amber reward the first time each day the player
 * wins with a non-standard variant they haven't already claimed today. Replaces
 * the old repeat-use decay (a punishment) with a positive rotation incentive, so
 * trying every variant reads as REWARDED, not "your bonus is shrinking". Amber
 * only, never phase progress. One claim per variant per local day (no ping-pong
 * farming). Sized like a small milestone so rotation feels worth it.
 */
export const FRESH_VARIANT_BONUS_AMBER = 15;

/**
 * @deprecated Repeat-use decay removed in favor of FRESH_VARIANT_BONUS_AMBER.
 * Kept exported so any stale importer still compiles; no longer applied.
 */
export const VARIANT_REPEAT_DECAY = {
  firstTwo: 1.0,
  third: 0.85,
  fourth: 0.7,
  fifthPlus: 0.55,
} as const;

/** @deprecated Weekly variant usage decay removed with the repeat-decay system. */
export const WEEKLY_VARIANT_DECAY_THRESHOLDS = [
  { maxUses: 3, multiplier: 1.0 },
  { maxUses: 6, multiplier: 0.85 },
  { maxUses: 10, multiplier: 0.65 },
] as const;

/** @deprecated Default weekly variant decay multiplier (unused since fresh-bonus). */
export const WEEKLY_VARIANT_DECAY_DEFAULT = 0.45;

// ============================================================================
// PUZZLE GENERATION
// ============================================================================

/** Standard forward DFS generation timeout (ms). */
export const STANDARD_GENERATION_TIMEOUT = 2500;

/** Reverse-first chain generator timeout (ms). */
export const REVERSE_GENERATION_TIMEOUT = 25000;

/** Minimum quality score for standard puzzles to be accepted. */
export const STANDARD_MIN_ACCEPTABLE_SCORE = 45;

/** Minimum quality score for reverse puzzles to be accepted. */
export const REVERSE_MIN_ACCEPTABLE_SCORE = 30;

/** Double shift puzzle generation timeout (ms). */
export const DOUBLE_SHIFT_GENERATION_TIMEOUT = 5000;

/** Minimum quality score for double shift puzzles. */
export const DOUBLE_SHIFT_MIN_ACCEPTABLE_SCORE = 30;

// ============================================================================
// PUZZLE BANK
// ============================================================================

/** Bank-specific word novelty: strong penalty window (bank selections ago). */
export const BANK_RECENT_THRESHOLD = 50;

/** Bank-specific word novelty: moderate penalty window (bank selections ago). */
export const BANK_MEDIUM_THRESHOLD = 150;

/** Per-word penalty when seen within BANK_RECENT_THRESHOLD. */
export const BANK_RECENT_PENALTY = -18;

/** Per-word penalty when seen within BANK_MEDIUM_THRESHOLD. */
export const BANK_MEDIUM_PENALTY = -9;

/** Bonus when ALL words in a puzzle are novel to the bank. */
export const BANK_NOVEL_BONUS_FULL = 25;

/** Bonus when 3+ words in a puzzle are novel to the bank. */
export const BANK_NOVEL_BONUS_MOST = 12;

/** Bonus when 1-2 words in a puzzle are novel to the bank. */
export const BANK_NOVEL_BONUS_SOME = 3;

/** Maximum played puzzle IDs tracked per bank. */
export const MAX_USED_TRACKED = 500;

// ============================================================================
// DAILY CHALLENGE
// ============================================================================

/**
 * Puzzles solved before the Daily Challenge unlocks (Phase 1+ also unlocks it,
 * see isDailyChallengeUnlocked in dailyChallenge.ts, which imports this value).
 * The daily is ALWAYS HARD (6-letter words, 5 rows) — a brutal cliff for a
 * player fresh out of onboarding. Set to 8 (was 3) to align with the close of
 * the pit auto-collect window (AUTO_COLLECT_PUZZLE_LIMIT): by then the player
 * has seen real difficulty, so the daily lands as a challenge, not a wall.
 */
export const DAILY_CHALLENGE_UNLOCK_PUZZLES = 8;

/**
 * EXPERT difficulty gate: the 6-letter apex tier is the first (and only) gated
 * difficulty. It unlocks after this many total puzzles solved — deep enough
 * that the player has mastered HARD and the core verb, so six-letter boards
 * (more tiles to track, longer chains, a rarer-but-fair vocabulary band) read
 * as an earned step up, not an early wall. Tunable; between HARD-comfort and
 * the Blind Offering apex (80).
 */
export const EXPERT_DIFFICULTY_UNLOCK_PUZZLES = 50;

/**
 * Lexicon mode gate: the rare-word mode is a late-unlock mastery pursuit. It is
 * a COMPOSABLE toggle (stacks on any difficulty EASY-EXPERT and any variant) that
 * ramps the vocabulary rarity hard across the difficulty axis, so it opens deep
 * enough that the player owns the core verb and reads "rare but fair" words as a
 * vocabulary challenge, not noise. Past the Blind Offering apex (80), before the
 * finale (~116). Amber-only; never feeds phase progress.
 */
export const LEXICON_UNLOCK_PUZZLES = 100;

/**
 * Lexicon (rare-word) amber bonus multiplier. Solving a rare-vocabulary board is
 * harder, so it pays a bonus on the base+star+streak+trial subtotal — itemized
 * in the victory breakdown. Amber-only, REWARD-only: like the Patron/surprise/
 * resonance bonuses it NEVER touches phase progression, so a rare board pays more
 * amber but never accelerates the descent. Composes on top of variant/trial
 * multipliers (a Lexicon+Reverse board is genuinely harder than either alone).
 */
export const LEXICON_AMBER_MULTIPLIER = 1.4;

/**
 * One-time hint mercy granted when the player starts their very first Daily
 * Challenge. The daily is always HARD; a small hint cushion softens that first
 * collision. Convenience only: hints still cost stars, and the puzzle itself
 * stays deterministic and identical for every player on a date.
 */
export const FIRST_DAILY_BONUS_HINTS = 2;

// ============================================================================
// WEEKLY QUESTS
// ============================================================================

/** Phase-based reward multiplier for quest rewards. */
export const PHASE_REWARD_MULTIPLIERS: Record<number, number> = {
  0: 1.0,
  1: 1.0,
  2: 1.25,
  3: 1.5,
  4: 2.0,
};

// ============================================================================
// SPEED TIMER
// ============================================================================

/** Difficulty-aware time limits for speed variant puzzles (seconds). */
export const SPEED_TIME_LIMITS: Record<string, number> = {
  EASY: 65,
  MEDIUM: 60,
  MEDIUM_PLUS: 54,
  HARD: 48,
  EXPERT: 44, // 6-letter boards take longer to read — but expert, so still tight
};

// ============================================================================
// TENDING SHRINE (Phase 5 endgame loop)
// ============================================================================

/**
 * The Tending Shrine is the Phase-5 repeatable, cosmetic-only amber sink.
 * Players spend amber to "deepen the pattern," advancing a soft-infinite
 * Tending Level. Cost escalates so the sink absorbs arbitrary endgame income
 * without ever blocking the (optional) loop.
 *
 * getTendingCost(level) = round( BASE * GROWTH^level / 10 ) * 10, capped.
 * Approximate curve: L1 30 · L2 40 · L5 50 · L10 70 · L25 230 · L35 520 ·
 * L38+ capped. The first milestone arrives at level 3 for about 110 amber
 * total, so a newly-Phase-5 player reaches new keeper dialogue promptly.
 * The 650 cap (was 1,800) keeps later deepenings inside a regular endgame
 * session instead of turning the cosmetic loop into a multi-day wall.
 * Retune against live data, not blind.
 */
export const TENDING_BASE = 30;
export const TENDING_GROWTH = 1.085;
export const TENDING_COST_CAP = 650;
/** First deepening each local day is discounted — the daily return hook. */
export const TENDING_DAILY_BONUS_DISCOUNT = 0.3;
/** Tending Levels that fire a ceremony + unlock a new serene dialogue line. */
export const TENDING_MILESTONES = [3, 8, 15, 35, 70];
/** Level where the visible house/pit deepening reaches its full intensity. */
export const TENDING_VISUAL_SATURATION_LEVEL = 40;


/** Default time limit for speed variant when difficulty is unknown. */
export const SPEED_DEFAULT_TIME = 60;

// ============================================================================
// MILESTONE BONUSES
// ============================================================================

/**
 * Milestone bonuses - reward players at key puzzle counts.
 * Keeps progression feeling rewarding during longer gameplay.
 * Phase-aware messages shift tone with the narrative.
 *
 * 2026-07 compressed geography: keys from 96 up were re-keyed ~×0.7 to track
 * the new arc (reveal floor 90, house completion/recruit ~96-100, dwell
 * ~104-108, arming 115, final board ~116, post-revelation ~117-122). Amounts
 * are untouched (the economy is calibrated on them) and stay in their original
 * order; only keys and the number-naming copy moved. Re-keying is SAFE
 * pre-launch: lastClaimedMilestone compares with >= against the last-claimed
 * VALUE, so no existing key ever double-fires (and there are no live saves
 * whose lastClaimedMilestone sits between an old key and its new position).
 */
export const MILESTONE_BONUSES: {
  puzzles: number;
  amber: number;
  message: string;
  darkMessage?: string;
  dreadMessage?: string;
}[] = [
  { puzzles: 10, amber: 25, message: 'First steps!' },
  { puzzles: 15, amber: 15, message: 'Warming up!' },
  { puzzles: 25, amber: 50, message: 'Getting the hang of it!', darkMessage: 'The words are beginning to listen.' },
  { puzzles: 50, amber: 75, message: 'Puzzle enthusiast!', darkMessage: 'The pattern takes shape.' },
  { puzzles: 75, amber: 100, message: 'Word wizard!', darkMessage: 'The words know your touch now.', dreadMessage: 'Seventy-five incantations spoken.' },
  // Climax-window beats (96-124): under the compressed pacing, the reveal
  // lands ~puzzle 90, house completion/recruit lands around 96-100, the
  // eight-win dwell completes around 104-108, arming waits for 115, the final
  // board is ~116, and post-revelation is ~117-122. 96 sits in the reveal's
  // shadow, 102/104/106 carry the last rooms and the young dwell, 108 holds
  // the completed house in its wait, and 124 lands just past post-revelation.
  // Amounts are untouched (economy is calibrated on them); only the key
  // geography and the spelled counts moved (keys stay strictly increasing, so
  // the re-keyed cluster now straddles the untouched century milestone).
  { puzzles: 96, amber: 75, message: 'Double digits!', darkMessage: 'The house stirs.', dreadMessage: 'Ninety-six threads woven into the pattern.' },
  { puzzles: 100, amber: 150, message: 'Century milestone!', darkMessage: 'One hundred arrangements completed.', dreadMessage: 'The arrangement grows. One hundred offerings.' },
  { puzzles: 102, amber: 100, message: 'Halfway to mastery!', darkMessage: 'The house feels heavier. Fuller.', dreadMessage: 'One hundred two incantations. The walls listen.' },
  { puzzles: 104, amber: 90, message: 'Still climbing!', darkMessage: 'The shadows are longer now. You keep building anyway.', dreadMessage: 'One hundred four offerings. The horizon leans closer.' },
  { puzzles: 106, amber: 110, message: 'Going strong!', darkMessage: 'The letters rearrange themselves for you now.', dreadMessage: 'One hundred six. The finished rooms reach toward what is coming.' },
  { puzzles: 108, amber: 200, message: 'The house is whole!', darkMessage: 'The house is whole... and quiet.', dreadMessage: 'The house is complete. It waits with you for what comes.' },
  { puzzles: 124, amber: 130, message: 'Unstoppable!', darkMessage: 'You no longer wonder why you keep going. You just go.', dreadMessage: 'One hundred twenty-four offerings. The sky is very near now.' },
  { puzzles: 150, amber: 250, message: 'True dedication!', darkMessage: 'One hundred fifty transformations. The words come easily now.', dreadMessage: 'One hundred fifty incantations. The pattern is patient, and so are you.' },
  { puzzles: 190, amber: 300, message: 'One ninety!', darkMessage: 'One hundred ninety arrangements. The quiet is complete.', dreadMessage: 'One hundred ninety offerings. Nothing stirs now. It does not need to.' },
  { puzzles: 235, amber: 400, message: 'Master puzzler!', darkMessage: 'Two hundred thirty-five words spoken into the void.', dreadMessage: 'The void has heard enough. The void responds.' },
  { puzzles: 280, amber: 500, message: 'The journey continues...', darkMessage: 'The journey never ends. It only transforms.', dreadMessage: 'Two hundred eighty incantations. The pattern is nearly complete.' },
  // Endgame tail — a modest repeating +75 every 50 puzzles so the puzzle-count
  // faucet never fully dries up at Phase 5. Kept small so it doesn't outpace the
  // Tending Shrine sink (the deliberate endgame amber drain).
  { puzzles: 330, amber: 75, message: 'Still tending the pattern.', darkMessage: 'Three hundred thirty. The pattern keeps its shape because you keep it.', dreadMessage: 'Three hundred thirty offerings. The weave holds.' },
  { puzzles: 380, amber: 75, message: 'Still here.', darkMessage: 'Three hundred eighty. Stopping would feel like forgetting.', dreadMessage: 'The pattern continues. Three hundred eighty.' },
  { puzzles: 430, amber: 100, message: 'Four hundred thirty.', darkMessage: 'Four hundred thirty arrangements. Terrible peace.', dreadMessage: 'Four hundred thirty. The shape is yours now.' },
  { puzzles: 530, amber: 100, message: 'The tending continues.', darkMessage: 'Five hundred thirty. The fire stays lit because you tend it.', dreadMessage: 'Five hundred thirty offerings woven into the pattern.' },
  { puzzles: 680, amber: 150, message: 'Faithful keeper.', darkMessage: 'Six hundred eighty. The pattern remembers every one.', dreadMessage: 'Six hundred eighty. The weave deepens.' },
  { puzzles: 930, amber: 200, message: 'Nine hundred thirty.', darkMessage: 'Nine hundred thirty arrangements. The pattern, and you, continue.', dreadMessage: 'Nine hundred thirty. The shape will outlast us both.' },
];

// ============================================================================
// DIALOGUE SESSIONS
// ============================================================================

/**
 * Default dialogue session constants (puzzle-based pacing).
 * Phase-aware overrides are in getDialoguesPerSession / getPuzzlesBetweenSessions
 * functions in homeWorld.ts.
 */
export const DIALOGUE_SESSION_DEFAULTS = {
  DIALOGUES_PER_SESSION: 5,
  PUZZLES_BETWEEN_SESSIONS: 4,
  GRACE_PERIOD_SESSIONS: 2,
};

// ============================================================================
// DREAD EFFECTS
// ============================================================================

/** Maximum dread pulse opacity by phase (Phase 2+). */
export const DREAD_PULSE_OPACITY: Record<number, number> = {
  2: 0.10,
  3: 0.18,
  4: 0.25,
};

/** Screen shake intensity (px) by phase (Phase 3+). */
export const SCREEN_SHAKE_INTENSITY: Record<number, number> = {
  2: 1,
  3: 2,
  4: 4,
};
