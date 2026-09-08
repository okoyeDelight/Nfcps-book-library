# NFCPS Reader — Read Aloud

Reader V2 now includes a device-powered read-aloud experience for public-domain e-books.

## Live behavior
- Play / pause narration from the member's current reading position.
- Adjustable pace: 0.75x, 0.9x, 1x, 1.15x, 1.3x, 1.5x, 1.75x, 2x.
- Device voice selection when multiple system voices are available.
- Previous / next paragraph controls.
- Current narrated paragraph is highlighted and follows the viewport automatically.
- Existing reading progress, bookmarks, themes, saved books, Continue Reading and offline text cache remain intact.

## Platform note
The web/PWA reader uses the browser/device Speech Synthesis API. Speech may pause when a mobile browser is suspended or the screen is locked. True guaranteed screen-off/background narration should be implemented in the native Android package with a foreground media/audio service.

## Live preview
https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/
