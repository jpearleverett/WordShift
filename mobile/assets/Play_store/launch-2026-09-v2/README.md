# WordShift Play Store refresh

Approved September 17, 2026. Work is saved on `feature/play-store-refresh` in
[PR #450](https://github.com/jpearleverett/WordShift/pull/450), stacked on the
walking update in [PR #449](https://github.com/jpearleverett/WordShift/pull/449).
The owner reviews and merges both branches.

## Current status

| Deliverable | Status |
| --- | --- |
| Title, short and full description | Complete; 27 / 77 / 1,887 characters |
| Eight screenshot captions and scene briefs | Complete; final-image alt-text review pending |
| New feature illustration and 1024×500 export | Complete |
| Existing icon control and simplified Ember/W challenger | Complete |
| Current gameplay screenshots and opener challenger | Awaiting fresh captures |
| 30-second gameplay trailer | Timeline, captions and compositor prepared; footage pending |
| Source-grounded capture fixtures and build scripts | Prepared; browser capture path has not run here |
| Android phone parity and tablet distribution | Not verified in this environment |
| Play Console / YouTube publication | Not performed |

The available Cloud Browser rejected the local game export under its URL
security policy. No alternate browser or indirect execution was used to bypass
that restriction. The production scripts are supplied for a supported local
development environment. Old campaign screenshots are retained for rollback;
they are not substituted for fresh captures or presented as current evidence.

## Creative decisions

**One letter. Two new words. / Both results must be valid words.** explains the
actual move. The full description spells out removal and insertion, using
PLAY/PANT → PAY/PLANT.

**A cozy game. Mostly. / What changes after dark?** introduces the mystery in
slot 4, using the game's phase-3 night. Normal residents, lit rooms and a dark
sky establish the tone without robes or late-story revelations. This is a
progression-based scene, not a promise of a real-time day/night cycle.

The feature graphic pairs warm Ember artwork and word tiles with an open
moonlit doorway. The exact WordShift wordmark and tagline are typeset after
generation. Promotional artwork is kept separate from gameplay captures.

## Files and production

- `copy/`: paste-ready fields, captions, claim evidence and experiment copy.
- `art/`: generated masters; exact prompts and references are recorded in
  `source/artwork-prompts.json`.
- `source/fixtures.json`: attainable offline saves and genuine UI action recipes.
- `source/trailer-timeline.json` and `source/trailer-captions.srt`: the 30-second edit.
- `upload/`: only files actually exported; absence means pending, not optional.
- `manifest.json`: generated file specifications, hashes and readiness status.
- `preview.html`: visual review of available assets and outstanding captures.

From `mobile/`, install the project dependencies with `npm ci` if necessary.
The production scripts live in `scripts/store/`:

1. Export the unchanged app with `npx expo export --platform web --output-dir store-output/web`.
2. Run `node scripts/store/captureRefresh.mjs --export-dir store-output/web`
   in a supported local capture environment with Playwright Chromium installed.
3. Render a draft with `node scripts/store/buildTrailer.mjs --draft` and inspect
   the real footage and timing before final export. Follow its production guide.
4. Run `node scripts/store/buildRefresh.mjs` to typeset the eight actual captures,
   feature graphic and variants. `--art-only` exports the finished art without
   manufacturing missing gameplay images.
5. Review every output against the current signed Android build and use
   `python3 scripts/store/packageRefresh.py` for the complete package. Its partial
   mode is a work-in-progress review bundle, not an upload-complete campaign.

Read each script's `--help` for current arguments. Screens show genuine
React Native web rendering, not a native Android device. Captures use isolated
test saves; they do not establish real player statistics or lifetime earnings.
Daily dates come from the capturing machine's actual local day. Outgoing
non-local traffic is blocked so staged saves cannot reach production services.

## Publication and rollback

The existing icon is the baseline. Keep the simpler icon, alternate opener and
alternate short description for separate later experiments; do not change all
three simultaneously. Choose accurate tags offered in the current Console.

Upload phone images in numeric order only after reviewing actual captures and
their alt text. Publish the trailer to an eligible YouTube video URL before
adding it to Play Console. Verify the signed Android UI and supported devices;
tablet assets require actual tablet captures if that distribution is enabled.

The September 7 campaign in `../launch-2026-09/` is the preserved rollback
snapshot. Its uploader-reported September 15 status is historical, not proof
that this refresh is published. Console sign-in was required during this task;
no fields, graphics, video, experiments or release settings were submitted.
