# NFCPS One — AppDeploy production source mirror

This folder tracks the files changed in the live AppDeploy production snapshot for **NFCPS One**.

- AppDeploy ID: `nfcps-book-library-c2ma7y`
- Live app: https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/
- NFCPS: National Fellowship of Christian Pharmacy Students, UNIZIK Chapter
- Tagline: Christ, the Therapy for All.

The repository also contains an older/parallel Next.js project structure and the native Android wrapper. To avoid overwriting unrelated working code, live AppDeploy files are mirrored here with their AppDeploy-relative paths.

## Current mirrored stage

Reader/install stage deployed on 2026-09-09:

- novel-style paginated reader
- next/previous page and saved progress
- chapter/book-map navigation
- search inside the current book
- font size, line spacing, page margins and brightness controls
- four typeface choices
- text colour and light/sepia/paper/dark page themes
- yellow, green and blue highlights
- private notes and bookmarks
- immersive/fullscreen reading where supported
- offline reading cache after first successful open
- stable installable-app manifest identity using the NFCPS logo
- direct Library and Watch app shortcuts

The Android wrapper under `native/android/` loads the live AppDeploy app, so normal web UI/content deployments flow into the installed Android app without rebuilding the APK.