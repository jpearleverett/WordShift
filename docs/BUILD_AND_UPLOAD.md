# Android builds and EAS upload size

Verified against `main` commit `6f96ebb583f591f46c9c023be6462d99d816a8e7` on September 13, 2026. This guide describes the checked-in configuration; a completed native build and the Play Console remain the sources for actual binary sizes.

## Which size are you looking at?

| Measurement | What it contains | Where to check |
| --- | --- | --- |
| EAS project upload | The source archive sent from your computer to the build service | EAS CLI packing/upload output; `build:inspect --stage archive` |
| Android App Bundle (`.aab`) | Compiled app, assets, native libraries, and resources for the supported device configurations | Completed EAS build artifact |
| Play download size | The compressed APKs Play delivers for a particular device | Play Console's app size reports |
| Installed size | Files installed on the device; later player data and caches can add to this | Android app storage settings |
| Uncompressed DEX size | Compiled Java/Kotlin bytecode, including native SDK dependencies | Play Console's optimization report |

A **497 MB project upload does not mean players download a 497 MB game**. An AAB can also be larger than the download for one device. Keep the filename and the exact EAS/Play label when recording a size. See Expo's [app size explanation](https://docs.expo.dev/distribution/app-size/).

## What was unnecessarily entering the upload?

The audited Git tree contains **1,609 tracked files totaling 280,034,701 bytes** (280.03 MB, or 267.06 MiB) before upload exclusions. The largest avoidable groups were:

| Files excluded from the EAS source upload | Tracked bytes | Decimal MB |
| --- | ---: | ---: |
| `mobile/assets/raw/` — original music, source artwork, walk animation sources, and retouch backups | 127,445,289 | 127.45 |
| `mobile/assets/Play_store/` — marketing captures, exports, and the launch ZIP | 45,854,214 | 45.85 |
| `docs/` — documentation, visual reviews, and evidence screenshots | 16,398,196 | 16.40 |
| `mobile/docs/` and `.github/` — documentation and GitHub workflows | 39,953 | 0.04 |
| **Total removed from the tracked upload payload** | **189,737,652** | **189.74** |
| **Tracked payload remaining** | **90,297,049** | **90.30** |

These are uncompressed file sums at the audited commit, **not a measured EAS archive or a promised AAB size**. They exclude Git metadata and local untracked files. Documentation changes alter these totals slightly on later commits.

There is another source of duplication: the current EAS CLI Git workflow creates a shallow clone before copying the working directory. Its `.git` object database can therefore contain copies of the same large tracked assets. Removing a raw asset from the working copy of the upload does not by itself remove that asset from the Git object database. The new root `.easignore` explicitly excludes `.git` as well. EAS reads commit metadata from the original checkout; WordShift's current build configuration does not require a Git checkout on the builder. See the [EAS Git client implementation](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/vcs/clients/git.ts).

The reported 497 MB was not available as a local archive during this audit. Git objects and local build artifacts are plausible additional contributors; the tracked file inventory alone cannot establish the exact contents of that upload. Use the inspection below if the next upload remains unexpectedly large.

## How the exclusions work

Run EAS commands from `mobile/`, where `eas.json` lives. For a normal Git checkout of this repository, the EAS Git client packs from the **repository root**, so the build exclusion file is **`/.easignore`**, alongside the root `.gitignore`. A second file under `mobile/` would not replace it in this workflow. See Expo's [monorepo instructions](https://docs.expo.dev/build-reference/build-with-monorepos/) and [ignore implementation](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/vcs/local.ts).

`.easignore` replaces the Git ignore rules used for EAS packing. It therefore mirrors both existing `.gitignore` files, with the mobile rules scoped to `mobile/`. When changing either Git ignore file, update its matching section in `.easignore`. The source archive continues to exclude dependencies, credentials, local environment files, puzzle-generation checkpoints, and test reports. New rules also exclude downloaded APK/AAB/IPA files and native build caches. See Expo's [`.easignore` guide](https://docs.expo.dev/build-reference/easignore/).

The originals remain in Git for editing, future asset regeneration, and normal GitHub CI. The upload keeps:

- All runtime music, sound effects, story art, room art, sprites, UI art, icons, and fonts.
- Application source, the dictionary, and all committed puzzle banks.
- `app.json`, `app.config.js`, `eas.json`, Metro/Babel configuration, package manifests, lockfile, and local config plugins.
- Build tooling and scripts. No current package lifecycle hook regenerates assets from `assets/raw/` during an EAS build.

Native `android/` and `ios/` source directories are not blanket-excluded; only their build outputs/caches are. Neither native source directory is tracked at the audited commit, so a clean checkout uses Expo Prebuild. If generating native projects locally, review them before uploading: existing native files can take precedence over app configuration. Asset-authoring commands such as `npm run generate:assets` and `npm run encode:music` must run in the full repository, then their intended runtime outputs must be committed before building. Reassess the exclusions if adding any asset-generation build hook.

## Inspect the next upload without starting a cloud build

From the repository root:

```bash
cd mobile
npx eas-cli@latest build:inspect --platform android --profile internal-testing --stage archive --output ../../wordshift-eas-archive
```

Use a new output directory if that path already exists. Keep it outside the repository so a later upload cannot accidentally include a previous inspection. The `archive` stage produces the project input for inspection; it does not compile or submit the game. Expo documents the command and stages in the [EAS CLI reference](https://docs.expo.dev/eas/cli/#eas-buildinspect).

While still in `mobile/`, list the largest copied files and their total bytes:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path('../../wordshift-eas-archive')
files = [(p.stat().st_size, p.relative_to(root))
         for p in root.rglob('*') if p.is_file() and not p.is_symlink()]
print(f'{len(files):,} files; {sum(size for size, _ in files):,} uncompressed bytes')
for size, name in sorted(files, reverse=True)[:25]:
    print(f'{size / 1_000_000:9.2f} MB  {name}')
PY
```

Check that raw sources, Play listing materials, Git objects, downloaded app binaries, and build caches are absent. Check that runtime assets and `mobile/plugins/withAndroidOptimization.js` remain. The copied-file total differs from the compressed upload displayed by EAS. A surprisingly large local archive should be diagnosed from this file list before changing game artwork or audio quality.

## Current Android build settings and remaining checks

The checked-in Android identity is `com.wordshift.app`, app version **1.3.4**, version code **98**. `eas.json` uses local version management. Increase the Android version code before uploading a replacement bundle if that code has already been used in Play. The npm package version is separately still `1.3.1`; it is not the Android display version or version code.

The `internal-testing` profile creates a signed store AAB on the `internal-testing` update channel. The `production` submit profile also currently targets Play's **internal** track; its name does not automatically publish to production. The `preview` profile creates an internally distributed APK. See [the launch checklist](LAUNCH_CHECKLIST.md) for release steps.

Release minification and resource shrinking are enabled through `expo-build-properties`. The local `withAndroidOptimization` plugin selects the optimizing ProGuard defaults and enables optimized resource shrinking for the existing AGP 8.12 toolchain. PNG crunching remains disabled. These settings address compiled app size and the Play optimization report; they do not shrink an EAS source upload. A source-upload exclusion also does not reduce an AAB when the excluded material was already absent from the runtime bundle.

Validate the next signed internal-track build on a physical Android device, especially launch, fonts, audio, room/story art, ads, billing/restore, notifications, and background/resume behavior. Record its AAB size, Play per-device download size, and DEX size. No post-change native build size or on-device R8 result was measured during this documentation/upload audit.

The upload rules were checked against the audited Git inventory with both Git and the same ignore-matching library used by EAS. All **715 unique runtime/config asset references** and **1,193 checked runtime/source files** stayed included; credentials/cache fixtures stayed excluded. This verifies the file selection, while the signed Android build remains the final native validation.
