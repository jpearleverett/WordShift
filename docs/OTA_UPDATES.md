# Over-the-air updates (EAS Update)

Reviewed against main `6f96ebb` on 2026-09-13; production publish, verification and
rollback runbook added 2026-09-14. See [current build](CURRENT_BUILD.md),
[build and upload guide](BUILD_AND_UPLOAD.md) and [release gates](LAUNCH_CHECKLIST.md).
The repository currently configures app **1.3.5**, Android code **99** and iOS build
**3**; this is source configuration, not confirmation of an uploaded artifact.

`mobile/app.config.js` resolves the runtime to **app version + release channel**,
overriding the base JSON's `appVersion` policy. With the current configuration:

| Build profile | Update channel | Resolved runtime | Artifact/use |
|---|---|---|---|
| internal-testing | internal-testing | `1.3.5-internal-testing` | Signed Play internal-test AAB |
| production | production | `1.3.5-production` | Separately validated public-release binary |
| preview | preview | `1.3.5-preview` | Preview APK |
| development | development | `1.3.5-development` | Development client |

Each EAS Build profile sets `WORDSHIFT_RELEASE_CHANNEL`. Local config evaluation
falls back to `internal-testing` when it is unset. Always set it explicitly when
publishing updates; the environment variable and `--channel` must agree. A bare
`eas update --channel production` from a shell without the variable publishes the
`1.3.5-internal-testing` runtime into the production channel: no production
install ever receives it, while the console reports a successful publish.

`app.config.js` also derives `extra.adsUseTestIds` from the channel: the production
channel always resolves it to `false` (live ad units) and every other channel keeps
the `app.json` literal `true` (Google test units). The literal is never hand-flipped;
`productionConfig.test.ts` validates both states on every CI run.

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
WORDSHIFT_RELEASE_CHANNEL=internal-testing npx eas-cli@latest update --channel internal-testing --message "Describe the tested change"
```

Inspect the resolved runtime and ad mode before the publish command: the
internal-testing channel must show `adsUseTestIds: true`. The production channel
resolves its own runtime and live-ad configuration from the same commit; do not
republish a testing bundle unchanged into that channel. Use the same reviewed
commit when preparing the production-compatible update, then validate it on its
matching signed binary.
[Expo deployment documentation](https://docs.expo.dev/eas-update/deployment/)

## Production hotfix runbook

Only JavaScript/asset changes ship this way; anything native needs a new binary
(above). Every command runs from `mobile/` on the reviewed commit.

1. **Resolve and check the production configuration.** The first command must print
   `runtimeVersion: '1.3.5-production'`, `adsUseTestIds: false` and an empty
   `creatorCode`; the second is the one-command release gate.

   ```bash
   WORDSHIFT_RELEASE_CHANNEL=production npx expo config --type public
   WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig
   ```

2. **Publish to the production channel.** The environment variable is required: it
   selects the runtime the public binary was built with.

   ```bash
   WORDSHIFT_RELEASE_CHANNEL=production npx eas-cli@latest update --channel production --message "Describe the reviewed fix"
   ```

3. **Verify what was published.** The newest group in the list must carry runtime
   `1.3.5-production` (an `-internal-testing` runtime here means step 2 ran without
   the variable; republish correctly, then roll the wrong group back if it is the
   newest). Record the group ID from this output.

   ```bash
   npx eas-cli@latest update:list --channel production
   ```

4. **Confirm delivery.** The public binary checks on every launch and applies the
   update on the NEXT launch (`checkAutomatically` and `fallbackToCacheTimeout` are
   the defaults: check on launch, wait 0 ms). Cold start a production install
   twice, then confirm Sentry and the event log show the new bundle.

### Rollback

expo-updates only heals an update that throws a fatal JavaScript error before the
first frame. A logic or content bug that does not crash stays live until you roll
it back. Two options, both delivered on the players' next launch:

- **Return every device to the bundle embedded in the binary** (the fastest safe
  state; the embedded bundle is the reviewed release itself):

  ```bash
  npx eas-cli@latest update:roll-back-to-embedded --channel production --runtime-version 1.3.5-production --message "Roll back: <reason>"
  ```

- **Republish a known-good earlier group** (when a previous OTA fix must stay live
  and only the newest one is bad; take the group ID from `update:list`):

  ```bash
  npx eas-cli@latest update:republish --group <group-id> --message "Republish <group-id>: <reason>"
  ```

After either command, run `update:list --channel production` again and confirm the
newest entry is the rollback, then cold start a production install twice to see it
applied. A rollback needs no `WORDSHIFT_RELEASE_CHANNEL`, but it MUST name the production
runtime (`<app version>-production`) through `--runtime-version`: without it the CLI
prompts for a runtime among those on the branch, and a wrong pick reaches nobody.
`update:republish` takes only the group id (`--channel`, `--branch` and `--group` are
mutually exclusive; the group already identifies its branch and channel, and
`--channel production` alone opens an interactive picker instead). Note the incident, the bad group ID and
the recovery group ID in the release record.

Record commit, app version, runtime, channel, update ID and device result for each
publication. These instructions do not publish a build or update. The old 1.3.0
validation document remains historical evidence, not the current release recipe.
