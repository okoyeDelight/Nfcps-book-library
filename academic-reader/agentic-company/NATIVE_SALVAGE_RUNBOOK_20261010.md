# Academic-only native-source text recovery and CEO command feed

**Production created:** 10 October 2026, before the 11:10 PM WAT audit. This does not change the NFCPS student UI, CSS, exact Vercel rewrites, academic PDF source originals, or non-Academic functionality. No subscription or paid OCR API added. Existing free-tier compute and egress still have quotas.

## Verified defect and safe recovery
Original snapshot: 459 ready materials; 3 unindexed files all encrypted (1 at 200-level, 2 at 500-level), and 0 legitimate way to finish those without accessible source-owner-provided PDFs. 100-level has zero source files. At about 22:55 WAT, 4504 indexed pages were marked pending OCR and 713 needed review; these are not all recoverable with native extraction.

Some PDFs have native source text despite empty indexed placeholders. Real source probes for PCH 201 by Okolo pages 1 and 4 returned original native text with no severe review flags. Two pages were recovered from independently source-count-verified originals; their page-index rows changed from pending OCR to `not_needed`, with audit_status remaining `pending` and an explicit `native_text_recovered_review_pending` flag. The original PDF/image/text were not altered. They are *not* scientifically reviewed yet. A subsequent protected batch recovered one additional clean source page and rejected unsafe sources; no false academic-pass claim. Recheck the live `native_salvage_request` table for final current totals.

## Autonomous operation
- Private `nfcps_agent_ops.native_salvage_dispatch_tick` selects at most **four pages per run**, across populated levels, with an original-PDF-source-count check, `complete` index and matching polished timestamp version. It runs public Academic flow layout 6 on the same Supabase project; no external paid OCR.
- Private `native_salvage_apply_tick` reads the `pg_net` response, verifies material ID, page, layout, genuine native text origin, unambiguous extraction, no lost image resources, sufficient natural-language source text, and checks that OCR did not already claim or modify the row. Only then does it copy the *original source text* into the index and mark OCR unnecessary; **audit stays pending**.
- Private `native_salvage_cycle` applies responses and dispatches the next batch. Existing scheduler `nfcps-academic-native-salvage` is active every two minutes and completed its first scheduled run successfully.
- Each page ID is dispatched once. Any ambiguous source is quarantined as `unsafe_source` in its *request* metadata, but its original indexed page row remains untouched for the existing OCR and manual review.
- A harmless private `nfcps_agent_ops.command_centre_snapshot()` provides a fresh JSON representation of real five-CEO scores, decisions, meetings, source findings and tracked repairs. It explicitly states that the system has no actual human video calls. **Not yet a publicly accessible or live-mounted student-facing dashboard.** Access remains private pending authorized director identity checks.

## Verification and rollback
Eight pure native-salvage source-trust tests passed; Academic CI checks were added. Both the real recovered and refused source-page cases tested; the cron job has at least one actual successful invocation. The source functions and rollback record are in `academic-reader/agentic-company/sql/`.
To safely halt the additional worker, run `SELECT cron.unschedule('nfcps-academic-native-salvage');` using admin SQL. The underlying original PDFs and existing Academic student UI are unaffected.
Open blockers: 3 encrypted PDFs, unpopulated first-year catalogue, thousands of pending OCR pages, 700+ review pages, manual diagram/formula/scientific QA and zero independent agent-certified repairs. Do not promise full completion by 23:10.
