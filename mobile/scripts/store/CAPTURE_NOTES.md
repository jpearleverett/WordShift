# Store image source captures

`captureLaunch.mjs` drives the actual WordShift interface in Chromium. It creates 1170 × 2100 PNG files (390 × 700 logical viewport, device scale 3) under `assets/Play_store/launch-2026-09/raw/`. The listing layouts are built separately from these source renders.

Start the web app in `mobile/`:

```sh
npx expo start --web --port 8081 --max-workers 1
```

Then, also in `mobile/`:

```sh
node scripts/store/captureLaunch.mjs
```

Set `WORDSHIFT_CHROMIUM` to an installed Chromium executable if Playwright's default browser is unavailable. In the project VM, the browser additionally needs the shared library path described in the environment setup. The script attaches DevTools before navigating, as required by this VM's renderer.

`--extras-only` reruns the puzzle-style and tile-shop views while preserving previously captured files. If the whole style menu cannot fit, the script selects Double Shift and captures its actual board instead of a clipped menu.

The script seeds local progression to avoid repeating dozens of puzzles, then uses real controls to restart the initial board, select and insert letters, solve it, open conversations, scroll the house, start the daily, and browse cosmetic previews. All non-local network traffic is blocked, so these fixtures do not create production analytics, saves, purchases, or leaderboard entries.

`raw/provenance.json` records the source renderer and capture details. These images come from the React Native web renderer; they are not screenshots taken on an Android device. They accurately show shared app UI, with browser-specific font and system-inset rendering. Final listing copy must not describe them as native device captures.

The selected launch images use source files 02, 03, 05, 06, 08, 09, 10, and 12. Files 01, 04, 07, and 11 are additional source options, not an instruction to upload more than eight phone screenshots.
