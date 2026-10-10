# NFCPS Academic — Complete catalogue readiness repair, 10 October 2026

**Rule:** Keep the existing student UI, CSS, Vercel exact asset routes, Android APK and non-Academic services unchanged. No paid AI APIs, new hosts or subscriptions.

## What the live database audit established

- 469 file records: 459 marked polished/ready across levels 200 (133 ready), 300 (56), 400 (151), 500 (119). There are **no 100-level file records**. "Ready" means a polished source PDF URL exists, not that the reading content is verified.
- 306 ready materials initially had no page-index records. Following the Academic worker fixes, the count decreased to 296 in a later snapshot. This is only **index coverage**, not source fidelity.
- 591 indexed pages had empty page text despite five OCR attempts. Among them, **455 had an incorrect historical audit_status of passed**. These 591 were deliberately reclassified to ocr_status=needs_review, audit_status=review, audit_score=0, with `ocr_exhausted_empty_source` added to the flags. The original source PDFs and indexed text were NOT replaced.
- Ten stale pages with ocr_status=processing, no recorded last attempt, and indexed dates more than 24 hours old were safely returned to pending for bounded retries. The more recently processing page was left untouched.
- The five-level read-only SQL report at `catalogue-readiness.sql` reports the full inventory including all missing levels, not only the first 120 or 200 records.
- Per-page audits remain **not certified** until actual source count, image/hash coverage, figures, reading order, OCR quality, and on-device visual checks pass. A successful HTTP 200 or historical audit_status=passed is not enough.

## Production Academic-only changes

- `nfcps-academic-book-bootstrap`: v1 to **v2 ACTIVE**. Stable pagination through all page-index records and all ready materials; inserts empty placeholders with `ignoreDuplicates:true` so it does not overwrite existing indexed evidence. The bootstrap's OCR service and protected headers remain as before.
- `nfcps-academic-book-sync`: v2 to **v3 ACTIVE**. Stable paginated candidate enumeration, checks for existing index before extraction, three-at-a-time bounded work, backoff and quarantine of recurring file failures, and removal of recursive self-invocation. Its existing 10-minute cron schedule remains.
- `nfcps-academic-book-package`: v5 to **v6 ACTIVE**. The book manifest counts actual source PDF pages if there is not a trustworthy versioned source count, instead of treating the last indexed page as the end of the handout. It caches source-page count/version in Academic material metadata, falling back conservatively if fetching the PDF fails. Tested with three real documents of 7, 56 and 12 source pages.
- `nfcps-academic-ocr-sync`: v11 to **v13 ACTIVE**. Stops after five attempts and explicitly marks exhausted OCR as requiring review; tracks attempt times/errors; takes a conditional claim on each pending page; skips already finished source evidence; waits 30 minutes before retry; and does not create duplicate placeholders in its own fallback path. Older credentials were **not** copied to the public repo.
- No Supabase table schema changes. No new cron jobs. Existing Academic cron schedules remain. Existing Vercel JS/CSS and Academic UI function were not modified.

## GitHub source and tests

- Pure `catalogue-fidelity.mjs` and test fixtures reject false pass statuses, partial source indexes, duplicate pages, unknown source counts and missing levels.
- Pure `ocr-retry-policy.mjs` and tests enforce the five-attempt ceiling and preserve completed evidence.
- Existing Academic flow CI now executes the new test files. The isolated JavaScript unit evaluations passed (six catalogue cases and five OCR policy cases), but a GitHub Actions run and physical Android rendering have NOT been independently verified.
- The package function source is mirrored at `academic-reader/supabase/nfcps-academic-book-package/index.ts`. The other three live worker functions contain legacy authentication tokens, so their **source was deliberately not committed to the public repository**. Update them by fetching the existing function through the connected Supabase tool; never publish source secrets. Future maintenance should migrate protected tokens to deployment secrets with a separate planned safe rotation.

## Unresolved and acceptance criteria

1. Recover or independently review the 591 OCR-exhausted pages, using source evidence. Do not hallucinate words or silently claim they are repaired.
2. Index the remaining 296 ready materials (value will change as existing cron tasks run); ensure that empty placeholders do not count as complete.
3. Confirm physical source-page counts and pixel/image/formula fidelity for every real page, not merely samples.
4. Obtain legitimate first-year materials to audit level 100; it currently has zero records.
5. Verify slow-network, Android rendering, source readability and Study-tool behavior against full representative documents, then scale the verification catalogue-wide.
6. Keep all non-Academic NFCPS components, auth, billing settings, Vercel routes and styling exactly as before.

**Known budget limitation:** no paid services were added; usage of existing Supabase/Render/GitHub free quotas still needs monitoring. No guarantee of unlimited free invocations or egress is implied.
