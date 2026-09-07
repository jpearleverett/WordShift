# WordShift: Google Play upload pack

Open [preview.html](preview.html) to review the whole campaign. Upload the ten PNGs below to the **English main store listing**. The eight phone images belong in the listed order; the feature graphic and icon have their own fields.

| Order | Play Console field | File |
| ---: | --- | --- |
| 1 | Phone screenshot | [upload/phone/01-move-one-letter.png](upload/phone/01-move-one-letter.png) |
| 2 | Phone screenshot | [upload/phone/02-two-new-words.png](upload/phone/02-two-new-words.png) |
| 3 | Phone screenshot | [upload/phone/03-build-a-home.png](upload/phone/03-build-a-home.png) |
| 4 | Phone screenshot | [upload/phone/04-unlikely-friends.png](upload/phone/04-unlikely-friends.png) |
| 5 | Phone screenshot | [upload/phone/05-make-it-yours.png](upload/phone/05-make-it-yours.png) |
| 6 | Phone screenshot | [upload/phone/06-daily-ritual.png](upload/phone/06-daily-ritual.png) |
| 7 | Phone screenshot | [upload/phone/07-change-the-rules.png](upload/phone/07-change-the-rules.png) |
| 8 | Phone screenshot | [upload/phone/08-cozy-mostly.png](upload/phone/08-cozy-mostly.png) |
| 9 | Feature graphic | [upload/feature-graphic-1024x500.png](upload/feature-graphic-1024x500.png) |
| 10 | App icon | [upload/store-icon-512.png](upload/store-icon-512.png) |

Phone images are 1080 × 1920 opaque PNGs; the feature graphic is 1024 × 500; the icon is a 512 × 512 RGBA PNG. [manifest.json](manifest.json) records final dimensions, encoding, size, and source captures. Upload only the PNGs in `upload/`; the other files support review and editing.

Paste [copy/app-name.txt](copy/app-name.txt), [copy/short-description.txt](copy/short-description.txt), and [copy/full-description.txt](copy/full-description.txt) into their matching fields. Use [alt-text.tsv](alt-text.tsv) for each image's accessible description. The [complete copy pack](copy/README.md) records the positioning, checked claims, and optional alternatives.

The screenshots are actual React Native web renders, captured at 390 × 700 with a 3× device scale using staged, attainable local progress. They are uniformly scaled inside the promotional layouts; the game interface is not AI-generated. They are not captures from a signed Android device. Compare the shown fonts and layout with the release build before submitting. [Raw capture provenance](raw/provenance.json) records the capture method and save setup.

The feature illustration and icon were generated with the built-in image generation tool using the game's existing art as reference. The exact prompts and references are saved in [source/prompts.json](source/prompts.json); retained masters are in `art/`. Their role is promotional illustration, not a claim that these paintings are playable scenes.

The editable HTML layouts are in `source/layouts/`. From the repository's `mobile/` directory, run `npm run store:build` to rebuild the upload files, preview, contact sheet, copied listing text, and manifest from the retained art and captures. This requires Playwright's Chromium browser. Capture regeneration is separate: `scripts/store/captureLaunch.mjs`. Run `npm run store:package` with Python 3 available to regenerate the ZIP and verify its integrity. Source layouts resolve the game's original fonts and wordmark from the repository; the preview and upload PNGs can be viewed directly after unzipping.

This pack does not publish a listing or release a build. The existing app launcher icon remains separate from the supplied Play listing icon.
