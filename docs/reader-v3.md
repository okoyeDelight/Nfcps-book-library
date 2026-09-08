# NFCPS Reader V3

Live app: https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/

## What changed
- Installed-app/PWA identity points to the real NFCPS logo resource.
- Free e-book catalogue now shows only titles with a readable Project Gutenberg text/HTML copy.
- Every displayed free e-book offers **Read in NFCPS** and **Download**.
- Free public-domain recommendations can open directly in the NFCPS reader.
- Modern copyrighted recommendations use legitimate find/source links rather than pretending to be free downloads.
- Reader V3 is paged instead of one endless document.
- Previous/Next controls, keyboard arrows and mobile swipe navigation.
- Reading progress and Continue Reading persistence.
- Font size, font family and line-spacing controls.
- Page-colour presets, text-tone presets and paragraph alignment.
- Page bookmarks and saved-for-later state.
- Select-text highlighting with multiple highlight colours.
- Passage-linked notes, notebook view, jump-back and delete controls.
- Chapter/contents navigation.
- First successful open is cached for offline reading where browser storage permits.
- Current page continues feeding NFCPS Moments excerpt context.

## Reader source reliability
`GET /api/reader/book/:id` uses the NFCPS backend as a safe Gutenberg reader proxy and now tries extra canonical text candidates (`-0.txt`, UTF-8 variants, cached text and HTML fallbacks) before reporting an unavailable copy.

## Product direction
This reader is intended to feel like a dedicated novel/study reader rather than a webpage: page-based navigation, comfortable typography, study tools, and persistent device-local reading state.
