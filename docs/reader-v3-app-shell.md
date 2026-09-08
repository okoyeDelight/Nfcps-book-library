# Reader V3 + App Shell

This stage aligns the live AppDeploy experience with a more app-like NFCPS reading workflow.

## Installed app identity
- The installable app uses the official NFCPS logo already uploaded to `public/resources/nfcps-logo.png`.
- The manifest points the primary icon at that NFCPS logo.
- A navy/green/gold maskable icon wrapper is used so Android does not show a plain white generic icon.
- The PWA remains `display: standalone` so an installed copy opens like an app rather than a normal browser tab.

## Reader V3
- Public-domain Gutenberg books open inside NFCPS through the backend reader proxy.
- The reader is paginated rather than one long endless scroll.
- Previous / next controls, swipe page turning, page count and progress are available.
- Reading preferences persist on-device: font size, font family, line spacing, page colour, text tone and alignment.
- Members can bookmark pages, highlight selected passages with colour, attach notes, revisit notes/highlights and remove them.
- First successful book open is cached for offline reading where browser cache support is available.
- Continue Reading preserves book and progress.
- Reader position continues feeding NFCPS Moments for public-domain excerpt mode.

## Digital shelf policy
- The free e-book area now displays only reader-ready books with a readable text/HTML edition.
- Every displayed digital e-book has both `Read in NFCPS` and a legal `Download`/source action.
- NFCPS Recommends inside the e-book experience is limited to public-domain classics that can actually open in the reader.
- Modern copyrighted recommendations are intentionally not presented as free/readable e-books.

## Live preview
https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/
