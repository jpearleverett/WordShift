# Economy journey model — 2026-09-05

Generated from production services by `economyJourneySimulation.test.ts`; regenerate with `node scripts/tools/runEconomySimulation.mjs` from mobile/. Values describe a deterministic model, not observed players or retention.

Each cohort starts on September 5, 2026 and completes 240 boards. All request one hint every five wins; a missing hint is modeled as eventual completion with undo and two invalid attempts. The three-star rate stays at 80% so paid convenience cannot masquerade as a skill change. Starter and milestone hints use production grants. Surprise rewards are disabled; no resonance or optional House Ask is assumed. All paths choose the CLOSED finale when armed and accept pending phase transitions at the next pit visit.

The first eight wins are Easy; later ordinary cohorts choose Medium. The side-claim cohort rotates unlocked standard/Reverse/Double Shift styles and completes one daily board each day after onboarding, using actual daily/streak/event grants and first-daily mercy hints. Other cohorts decline that optional mode. Claims include available login, completed daily/weekly quests, monthly tiers, Patron faucets, Supporter stipend, and reward doubles where eligible. Ads assume successful 30-second views and obey the eight/day global cap and five/day double cap. The core-only cohort declines all discretionary claims. No room passive-income service exists in this build.

Timing assumptions: Easy 60s; Medium 100s; reverse ×1.8; double shift ×1.6; help requests +30s. These are sensitivity inputs, not measured times. Navigation, reading, interstitials, failed boards and ad loading are excluded. No reward multiplier is retuned from this model alone. The decoration cohort spends an illustrative 250 amber after win 28 before recruiting; this is a sink stress scenario, not a specific item recommendation.

| Cohort | Axel win / day | Phase 4 win / day | House win / day | Ending win / day | Amber available / pending | Hints left / unmet requests | Amber / assumed minute |
|---|---|---|---|---|---|---|---|
| Free, 2/day | 14 / day 7 | 90 / day 45 | 92 / day 46 | 116 / day 58 | 16909 / 0 | 0 / 28 | 51.41 |
| Free, 8/day | 24 / day 3 | 96 / day 12 | 96 / day 12 | 116 / day 15 | 9642 / 0 | 0 / 28 | 34.05 |
| Free, one long session | 40 / day 1 | 96 / day 1 | 208 / day 1 | 123 / day 1 | 2224 / 0 | 0 / 28 | 16.34 |
| Free, Easy only, 2/day | 16 / day 8 | 90 / day 45 | 92 / day 46 | 116 / day 58 | 15125 / 0 | 0 / 28 | 74.77 |
| Free, no shop or side claims, 8/day | 32 / day 4 | 96 / day 12 | 144 / day 18 | 123 / day 16 | 3976 / 0 | 0 / 28 | 20.52 |
| Free, side claims + ads + styles, 8/day | 16 / day 2 | 96 / day 12 | 96 / day 12 | 116 / day 15 | 20146 / 0 | 0 / 2 | 36.55 |
| Patron, 8/day | 16 / day 2 | 96 / day 12 | 96 / day 12 | 116 / day 15 | 15273 / 0 | 0 / 28 | 47.5 |
| Supporter, 8/day | 9 / day 2 | 96 / day 12 | 96 / day 12 | 116 / day 15 | 12548 / 0 | 0 / 28 | 40.99 |
| Free, spends 250 after win 28, 8/day | 24 / day 3 | 96 / day 12 | 96 / day 12 | 116 / day 15 | 9392 / 0 | 0 / 28 | 34.05 |

Full JSON retains every recruit/room date, all phase dates, source totals, peak pending amber and mode-specific time assumptions. A completed economy path proves affordability and gating only; story-scene coverage and comprehension need the independent story tests and device playtest.
