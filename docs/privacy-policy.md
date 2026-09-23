---
permalink: /privacy-policy/
title: WordShift Privacy Policy
---

# WordShift Privacy Policy

**Effective date:** September 22, 2026

Change log: the September 13, 2026 revision clarified existing purchase-restoration
and local-reset behavior. The September 14, 2026 revision adds the retention
periods below and links the data-deletion page. Neither adds a data category or
a service provider. The September 22, 2026 revision describes network addresses,
the purchase identifier and anonymous daily totals, and names two ad mediation
partners, AppLovin and Unity Ads, that AdMob may pass an ad request to.

WordShift ("the app") is a word puzzle game developed by Jonathan Pearl Everett ("we", "us"). This policy explains what information the app handles, what is sent off your device, and which third-party services are involved.

## Overview

WordShift plays primarily on your device, and the core puzzles work offline. We do **not** ask for your name, email address, or any account, and we do **not** sell your personal data. Some features do send a limited amount of data to the third-party services listed below: anonymous analytics, crash reporting, a cloud backup of your game save, a daily leaderboard, in-app purchases, and ads.

## Information stored on your device

All gameplay data is stored locally on your device using your operating system's app storage:

- Puzzle progress, statistics, star ratings, and achievements
- In-game currency (amber), unlocks, and story progress
- Settings (sound, haptics, reduced motion, notification preferences)
- A randomly generated install identifier (a random string, not tied to your real-world identity) used to operate the online features below
- A local event log used for debugging

**Settings → Reset All Progress** clears gameplay progress and settings, while retaining install/save/support references and purchase retry protection. Store purchases can restore afterward. Reset also attempts to overwrite the cloud backup with the reset state; cloud deletion is a separate request.

## Information sent off your device

### Anonymous analytics
To understand how the game is played and improve it, the app sends anonymous event data to our backend (Supabase): your random install identifier, platform (Android/iOS), app version, event types (for example, "puzzle completed"), and non-identifying event details (for example, which puzzle mode or store product an event relates to). This does not include your name, email, or contacts.

### Network addresses
Like any internet service, our backend receives the network (IP) address of each request the app makes. It is used only to deliver the response and to enforce abuse limits (a request counter per address); it is not stored with your game data, analytics events or cloud backup. Sentry receives the address of each crash report and handles it under its own policy.

### Crash and error reporting
To find and fix bugs, the app sends crash and error reports to Sentry. These may include your device model, operating-system version, app version, and a technical error trace. The Sentry SDK keeps its own random installation identifier on your device to group reports from the same installation; the app does not pass it your WordShift install identifier, name, or any other identity.

### Cloud backup
When you are online, the app automatically backs up your game save (progress, currency, settings) to our backend (Supabase) under a separate random save credential — for example when you open the app and after you complete a puzzle — so your progress can be restored if you reinstall or switch devices. The backup contains game data, never your name, email, or contacts. Successful backups also privately link your support reference and install identifier to the save so support can locate records from linked devices. **Settings → Backup & Restore** shows a recovery code you can use to restore the save on another device, and you can ask us to delete your cloud save at any time (see below).

### Daily leaderboard
If you play the Daily Challenge, your result (completion time, stars, and hints used) and your random install identifier are sent to our backend to compute an **anonymous** ranking. No name or profile is displayed.

### Ads (Google AdMob and its mediation partners)
The app shows ads served by Google AdMob. AdMob may pass an ad request to one of its mediation partners, **AppLovin** or **Unity Ads**, when that partner offers the ad; the partner then receives the same kinds of information described below to serve and measure that ad, and follows the consent choice you made in the app. To serve ads, Google may collect and process information including your device's advertising identifier, an approximate (coarse, IP-derived) location, and app-usage signals, and may use it for personalized advertising depending on your settings and consent. Where required (for example, in the EEA/UK), the app shows a consent prompt before ads are served, and a **Privacy Options** entry appears in the app's Settings so you can review or change your consent at any time. On iOS, the app asks for permission through Apple's App Tracking Transparency prompt before any tracking for ads. You can also reset or limit ad personalization in your device's settings. If you purchase **Remove Ads** or **Patron's Key**, or hold an active **Supporter** subscription, automatically shown ads (interstitial and banner) are turned off; reward ads only ever play when you choose to tap a reward button. See Google's [Privacy Policy](https://policies.google.com/privacy) and [how Google uses information from sites or apps that use its services](https://policies.google.com/technologies/partner-sites).

### In-app purchases
Purchases (for example, "Patron's Key", "Remove Ads", amber packs, hint packs, the one-time starter bundle, cosmetic bundles, the season premium track, the Keeper's Edition, and the monthly "Supporter" subscription) are processed by **Google Play Billing** (or Apple's App Store on iOS) and managed through **RevenueCat**. We receive a record of your in-app purchase history for this game — which products were purchased and when — so we can unlock or grant them and restore eligible entitlements. Local transaction references help finish interrupted grants without granting a purchase twice. Restore Purchases does not recreate spent amber or hints; progress and saved balances use Backup & Restore. RevenueCat assigns an anonymous app-user identifier to your store purchases so they can be restored. We do **not** receive or store your name or payment card details.

## Third-party services

- **Google AdMob** (ads) — <https://policies.google.com/privacy>
- **AppLovin** (ads, through AdMob mediation) — <https://www.applovin.com/privacy/>
- **Unity Ads** (ads, through AdMob mediation) — <https://unity.com/legal/game-player-and-app-user-privacy-policy>
- **Google Play Billing** (purchases) — <https://policies.google.com/privacy>
- **RevenueCat** (purchase management) — <https://www.revenuecat.com/privacy>
- **Supabase** (cloud backup, daily leaderboard, anonymous analytics) — <https://supabase.com/privacy>
- **Sentry** (crash reporting) — <https://sentry.io/privacy/>

## Notifications

If you enable reminders, the app schedules **local notifications** on your device (a daily puzzle reminder, a streak nudge, an occasional check-in, and a weekly-quest reminder). These are generated on your device; no push-notification server is involved. You can disable them anytime in the app's Settings or your system settings.

## Children's privacy

WordShift is **not directed to children under 13**, and we do not knowingly collect personal information from children under 13. The story gradually introduces dark-fantasy/horror themes intended for ages 13 and up. If you believe a child has provided us information, contact us and we will delete it.

## Data retention

- **Anonymous analytics and crash/error reports:** kept for up to **24 months** from receipt. Analytics rows are removed automatically by a scheduled job on our backend once they pass that age; Sentry applies its own retention window within the same limit. Before rows are removed, they are summarized into daily totals (counts per event type and app version) that contain no install identifier or other identifier; those totals are kept.
- **Cloud backup and daily leaderboard results:** kept until you ask us to delete them, or until the backend project is decommissioned. Your backup is overwritten each time a newer save is uploaded; leaderboard rows are keyed by day and are not otherwise expired.
- **Purchase records:** held by Google Play (or Apple) and RevenueCat under their own policies for as long as needed to honor and restore your purchases.
- **Deletion requests:** we handle them within **30 days** of receipt. The full procedure, including what is deleted and what is kept, is on the [data deletion page](../data-deletion/).

## Your choices

- **Reset local data:** Settings → Reset All Progress clears gameplay and the local entitlement cache, while retaining the install/save/support references and purchase retry/history protection described above. Store entitlements may restore afterward.
- **Cloud backup:** managed via Settings → Backup & Restore; email us with the non-secret Support ID shown in Settings to request deletion of linked records, following the [data deletion page](../data-deletion/). Do not email the recovery code; it authorizes backup access. We verify authority separately.
- **Ads personalization:** use your device settings to reset or opt out of the advertising identifier, or use the **Privacy Options** entry in the app's Settings (shown where consent rules apply) to change your ad-consent choice.
- **Notifications:** Settings → Daily Reminders, or your system notification settings.
- **Other requests:** email us at the address below.

## Data sharing and selling

We do **not** sell your personal data. Data is shared only with the service providers listed above, solely to operate the features described in this policy.

## Contact

info@iridescent-games.com

## Changes to this policy

If we change this policy, we will update the effective date above and note the change in the app's release notes.
