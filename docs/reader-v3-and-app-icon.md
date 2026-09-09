# Reader V3 and NFCPS One identity

The NFCPS reading experience now behaves like a dedicated novel reader rather than a single uncontrolled scroll, while the installed experience is presented consistently as **NFCPS One**.

## Reader V3

- Page-by-page reading with Next / Previous controls, tap zones, keyboard navigation and swipe navigation.
- Saved reading progress and Continue Reading.
- Font size, font family, line spacing, page colour, text tone and paragraph alignment controls.
- Bookmarks.
- Text highlighting with multiple highlight colours.
- Private reading notes attached to pages and selected passages.
- Contents, bookmarks, notes and highlights drawers.
- Automatic offline cache after the first successful open.
- Direct legal download/source control inside the reader.
- Current reading position continues feeding NFCPS Moments excerpts.

## Free e-books

Every displayed Project Gutenberg title is wired to the NFCPS in-app reader and also exposes a legal download action. The reader uses the app backend to obtain a readable Gutenberg copy with source fallbacks, then caches the successful copy locally for offline reading.

Free public-domain recommendations continue to expose **Read / Download**. Modern copyrighted recommendations never masquerade as free copies; they point members to a legal copy/source instead.

## NFCPS One installed identity

- The installable app name is **NFCPS One**.
- The PWA manifest points to the approved NFCPS logo.
- The in-app install teaser and install sheet now visibly use the same NFCPS logo instead of a generic phone/book glyph.
- The native Android manifest uses `@drawable/nfcps_logo` for both standard and round launcher icons.
- The Android build workflow downloads the same approved live NFCPS logo before building the APK.
- The signed Android workflow has successfully produced `NFCPS-One.apk` and publishes it through the rolling `nfcps-one-latest` release.
- The Android shell loads the live NFCPS deployment, so normal web/app interface deployments appear inside the installed app without rebuilding the APK.

Live preview: https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/

Android release: https://github.com/okoyeDelight/Nfcps-book-library/releases/tag/nfcps-one-latest
