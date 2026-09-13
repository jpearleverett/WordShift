# Over-the-air updates (EAS Update)

Reviewed against main `6f96ebb` on 2026-09-13. See [current build](CURRENT_BUILD.md),
[build and upload guide](BUILD_AND_UPLOAD.md) and [release gates](LAUNCH_CHECKLIST.md).
The repository currently configures app **1.3.4**, Android code **98** and iOS build
**3**; this is source configuration, not confirmation of an uploaded artifact.

`mobile/app.config.js` resolves the runtime to **app version + release channel**,
overriding the base JSON's `appVersion` policy. With the current configuration:

| Build profile | Update channel | Resolved runtime | Artifact/use |
|---|---|---|---|
| internal-testing | internal-testing | `1.3.4-internal-testing` | Signed Play internal-test AAB |
| production | production | `1.3.4-production` | Separately validated public-release binary |
| preview | preview | `1.3.4-preview` | Preview APK |
| development | development | `1.3.4-development` | Development client |

Each EAS Build profile sets `WORDSHIFT_RELEASE_CHANNEL`. Local config evaluation
falls back to `internal-testing` when it is unset. Always set it explicitly when
publishing updates; the environment variable and `--channel` must agree.

Native dependencies, config plugins and Android R8/resource-shrinking changes
require a new native build. OTA cannot install the new optimization settings.
When native compatibility changes, increment the app version as well: Android
`versionCode` alone does **not** change this project's runtime. Confirm the exact
native build before publishing any JavaScript-only update. Do not send the current
bundle to an old 1.2.x/1.3.0 runtime. [Expo runtime documentation](https://docs.expo.dev/eas-update/runtime-versions/)

For a reviewed JavaScript/assets-only change targeting a compatible testing binary,
run from `mobile/`:

```bash
WORDSHIFT_RELEASE_CHANNEL=internal-testing npx expo config --type public
WORDSHIFT_RELEASE_CHANNEL=internal-testing npx eas update --channel internal-testing --message "Describe the tested change"
```

Inspect the resolved runtime and ad mode before the publish command. Keep
`adsUseTestIds: true` for internal/closed testing. The production cut uses its own
runtime/channel and reviewed live-ad configuration; do not republish a testing
bundle unchanged into that channel. Use the same reviewed commit when preparing
the production-compatible update, then validate it on its matching signed binary.
[Expo deployment documentation](https://docs.expo.dev/eas-update/deployment/)

Record commit, app version, runtime, channel, update ID and device result for each
publication. These instructions do not publish a build or update. The old 1.3.0
validation document remains historical evidence, not the current release recipe.
