---
permalink: /data-deletion/
title: WordShift — Data Deletion
---

# WordShift — Data Deletion Request

WordShift is a word puzzle game developed by **Jonathan Pearl Everett**. This page explains how to delete the data WordShift handles. WordShift has no user accounts; game data uses random save and install identifiers (not your name, email, or phone number). A separate support reference helps locate linked devices.

## Delete your on-device data

Open **WordShift → Settings → Reset All Progress**. This clears game progress, amber, statistics, settings and gameplay caches, then attempts to replace the cloud backup with the reset state. Install/save/support identifiers and purchase retry protection remain, so Reset is not a cloud-data deletion request. Store purchases can restore on the next launch; Reset does not cancel subscriptions or refund purchases.

## Delete your off-device (cloud) data

WordShift may store the following on our backend, associated with random save/install identifiers:

- A cloud backup of your game save (created automatically while your device is online)
- Daily Challenge leaderboard results (completion time, stars, hints — only if you play the Daily Challenge)
- Anonymous analytics events

In addition, crash and diagnostic reports are held by our crash-reporting provider (Sentry); they contain technical details such as device model, OS version, and error traces. They are **not** linked to your WordShift install identifier or to the save and support references above. The Sentry SDK does keep its own random installation identifier on your device so reports from one installation group together; it is deleted with the reports, and it is not shared with our backend. Purchase management (RevenueCat) likewise holds an anonymous app-user identifier tied to your store purchases; it is managed under [RevenueCat's privacy policy](https://www.revenuecat.com/privacy) and the app store's own account tools.

To request deletion of the data above, email **info@iridescent-games.com** with the subject **"WordShift data deletion"** and include the **Support ID** shown in Settings so we can locate linked records. **Do not email your recovery code:** it grants access to your backup. A Support ID helps with lookup but is not proof of ownership; we will verify your authority separately before deletion. Devices that have not completed a backup with the updated app may need additional investigation. If you can no longer open the app, tell us so in the email and we will work with whatever details you can provide (such as the approximate dates you played).

## What is deleted vs. kept

- **Deleted:** your cloud save, your leaderboard entries, and the analytics records associated with your install identifier.
- **Kept:** aggregate, non-identifying totals (for example, the total number of words offered across all players on a given day) that are not linked to you or your device, and crash/diagnostic reports that cannot be attributed to a specific person (these age out under the retention window below). Purchase records stay with the store and RevenueCat under their own policies so that purchases can still be honored and restored.
- **Advertising identifier:** you can reset or delete it at any time in your device settings (Settings → Ads / Privacy → Ads).

## Retention

We process deletion requests within **30 days** of receipt. Our retention target for anonymous analytics and crash/diagnostic data is up to **24 months**, with earlier deletion for records we can attribute to a verified request. Provider-specific records and retention are handled separately.

## Contact

info@iridescent-games.com
