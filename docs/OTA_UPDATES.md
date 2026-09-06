# Over-the-air updates (EAS Update)

Current build and verification instructions: [1.3.0 release validation](RELEASE_VALIDATION_1_3_0.md).

`mobile/app.config.js` resolves runtime to **app version + release channel**. The base JSON's `appVersion` policy is overridden by this dynamic config. For example, the new testing binary accepts `1.3.0-internal-testing`; the separate production binary accepts `1.3.0-production`.

| Profile | Channel | Default use |
|---|---|---|
| internal-testing | internal-testing | Signed Play internal-test AAB |
| production | production | Separately validated public-release binary |
| preview | preview | Preview APK |
| development | development | Development client |

The secure identity change adds `expo-crypto`, so this delivery requires a new 1.3.0 native build (Android 94 / iOS 3). Never send it to an old 1.2.7 runtime. Native dependencies/config changes require a version bump and a rebuild. JS-only changes still require compatible runtime and channel. [Expo runtime documentation](https://docs.expo.dev/eas-update/runtime-versions/)

For a reviewed JS-only change targeting the **new testing binary**, from `mobile/`:

```bash
WORDSHIFT_RELEASE_CHANNEL=internal-testing npx expo config --type public
WORDSHIFT_RELEASE_CHANNEL=internal-testing npx eas update --channel internal-testing --message "Describe the tested change"
```

Set `WORDSHIFT_RELEASE_CHANNEL` explicitly for every update; it must match `--channel`. Verify the resolved runtime before publishing. Keep test ads enabled throughout internal/closed testing. Public promotion has separate device/backend/store gates in the release validation document. [Expo deployment documentation](https://docs.expo.dev/eas-update/deployment/)

No update or build was published as part of this implementation. Earlier version 1.2.2 / production-channel instructions are superseded by this procedure.
