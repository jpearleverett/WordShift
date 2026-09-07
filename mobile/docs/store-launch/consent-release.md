# Ad consent and release build 1.3.1

Android build **95**, app version **1.3.1**, carries the consent correction. Its production runtime is `1.3.1-production`, separate from the earlier binary. The native delayed-measurement setting requires a fresh signed build; an update to JavaScript alone cannot add it to build 94.

The provider now requires UMP's explicit `canRequestAds === true` before initializing the advertising SDK or making requests. A consent refresh error may retain permission from a previous session only when UMP confirms that permission. Unknown, missing, or denied permission leaves ads disabled while gameplay boots normally. Native banners subscribe to the same readiness gate. Opening privacy options unmounts them and discards pending/preloaded ads; stale callbacks cannot restore those ads afterward.

The review also corrected the ad presentation timeout. The 12-second watchdog now covers startup only. Once the SDK reports `OPENED`, a rewarded or interstitial ad waits for `CLOSED` or `ERROR`. A player who watches a longer ad can still receive the earned reward. Listeners and timers are cleaned up on completion, startup timeout, and synchronous or asynchronous presentation errors.

## Verification

- The focused provider, consent, and banner regression suites pass **41 tests**. Coverage includes pending/denied/unknown consent, refresh errors with and without previous permission, privacy changes during SDK startup or loading, stale callbacks, reactive banner mounting, 30-second rewarded playback, 45-second interstitial playback, and rejected presentation.
- Scoped ESLint reports zero errors and warnings.
- Full TypeScript checking passes.
- Expo's native config introspection confirms Android `com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT = true` and iOS `GADDelayAppMeasurementInit = true` in the generated native configuration.
- The feature branch's GitHub CI runs the complete TypeScript, lint, unit, generator, puzzle-policy, and browser-journey checks. Use the green run for the branch's final commit as the integration result.

The expected UMP behavior follows the installed SDK and [Invertase's consent guide](https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent), including its use of UMP's permission signal after a refresh error.

## Signed Android acceptance

Use an account without a restored ad-free entitlement when checking free-player ad paths. In an eligible consent region, check a fresh-install consent flow, a consent-network failure without previous permission, and Settings' privacy-options flow. Confirm that a longer rewarded ad grants its promised reward once after it closes. The normal ad placement and pacing rules still apply.

`adsUseTestIds` remains `true` for this verification build. The separate public monetization cut must deliberately switch it to `false` after testing; do not mistake the `production` EAS profile for that switch. Existing Supabase, Sentry, RevenueCat, and AdMob account configuration does not need to be recreated for these code changes.
