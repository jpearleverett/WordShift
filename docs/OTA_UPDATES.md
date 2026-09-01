# Over-the-air updates (EAS Update)

WordShift ships `expo-updates` + EAS Update, so **JS and asset changes can be
pushed over-the-air** — installed apps download them on next launch, with no new
store build or review.

## The one rule that keeps this safe

`runtimeVersion` is set to **`{ "policy": "appVersion" }`** — the runtime version
is the `version` field in `app.json` (currently `1.2.2`). An OTA update only
reaches builds with the **same** `version`.

- **Pure JS / asset change** (art, copy, balance, layout, logic): keep `version`
  the same → push OTA. No rebuild.
- **Native change** (new native module, a config plugin, `app.json` native
  config, an Expo SDK bump, anything in `extra` that a native adapter reads at
  build time, monetization keys): **bump `version`** (e.g. `1.2.2` → `1.2.3`)
  **and rebuild**. This stops an OTA update that needs new native code from
  landing on an older build that can't run it.

> Why `appVersion` and not `fingerprint`? The `fingerprint` policy needs the
> fingerprint computation that the Termux build flow skips via
> `EAS_SKIP_AUTO_FINGERPRINT=1`. `appVersion` needs no fingerprint, so it works
> in Termux — at the cost of you remembering to bump `version` on native changes.

## Channels

Each build profile (`eas.json`) is tied to an update channel:

| Build profile | Channel | Reaches |
|---|---|---|
| `production` | `production` | Play (store / internal-track) builds |
| `preview` | `preview` | internal preview APKs |
| `development` | `development` | dev-client builds |

> **Sentry note:** the `production` profile uploads Sentry source maps during
> the build (`@sentry/react-native` plugin in `app.json`, org
> `iridescent-games-9n` / project `wordshift`; `SENTRY_AUTH_TOKEN` is a secret
> EAS environment variable). `SENTRY_DISABLE_AUTO_UPLOAD` is set only in the
> `development` / `preview` profiles.

## Pushing an update

From `mobile/`, after committing your JS/asset change:

```bash
eas update --channel production --message "Swap kitchen art + copy tweak"
```

Reopen the app (cold start) and it pulls the update. To target the internal
preview builds instead, use `--channel preview`.

## First-time enablement

OTA only works once a build that **includes `expo-updates`** is installed. So the
**next** production build (with the usual `versionCode` bump) is the one that
turns this on. Builds made before this change can't receive OTA — they need the
rebuild.

## What OTA can NOT do

- Ship new **native** code/modules/plugins, `app.json` native config, or an SDK
  bump (see the rule above — bump `version` + rebuild).
- Bypass `version` mismatches — an update for `1.2.3` will not reach a `1.2.2`
  build, by design.

## Fast local iteration (no OTA needed)

For *your own* preview while editing assets, just run the dev server — changes
hot-reload instantly, no build, no publish:

```bash
cd mobile && npx expo start
```

Use OTA when you want changes on **testers' / users'** installed builds without a
store rebuild; use the dev server when you're iterating yourself.
