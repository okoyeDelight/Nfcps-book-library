# Reader V2 fetch fix

The live AppDeploy Reader V2 no longer fetches Project Gutenberg reading text directly from the browser. It now requests a safe NFCPS backend reader endpoint, which validates Gutenberg sources, retries known Gutenberg text/HTML locations, returns the reading copy to the app, and lets the frontend cache the cleaned text for offline reuse.

This avoids browser cross-origin/CORS failures while preserving reading progress, bookmarks, Continue Reading, saved-for-later state, and NFCPS Moments integration.
