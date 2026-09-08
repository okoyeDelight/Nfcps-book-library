# NFCPS One — Native App Layer

NFCPS One is the installable app identity for the wider NFCPS UNIZIK experience.

## Live architecture

- The Android app shell loads the live AppDeploy experience at `https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/`.
- Normal UI, Watch, Library, Moments, community and content deployments therefore appear inside the installed Android app without rebuilding the APK.
- The website also exposes an installable PWA identity named **NFCPS One** with a network-first service worker so connected users receive the newest deployed experience.
- The native shell supports fullscreen web video and Android picture-in-picture when a fullscreen player is active.

## Android distribution

GitHub Actions builds the Android shell automatically from `native/android/` and publishes a rolling public release under the tag `nfcps-one-latest`.

Stable APK URL:

`https://github.com/okoyeDelight/Nfcps-book-library/releases/download/nfcps-one-latest/NFCPS-One.apk`

Current package id: `org.nfcpsunizik.one`

The current APK is a free direct-distribution build. Store signing/listing can be added later without changing the live-content architecture.
