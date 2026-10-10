# Academic Agent Company — evidence-first specialist operations

**Deployed 10 October 2026, private Supabase schema `nfcps_agent_ops`.** The specialist inspector is a deterministic audit program, not a separately reasoning LLM or completed OCR repair. No NFCPS UI, Vercel route, student source file, Android feature, payment configuration or non-Academic section is changed.

## Operating chain
1. Existing Academic company cron (`nfcps-academic-agent-company-council`, every 20 minutes) invokes `company_cycle()`.
2. `specialist_page_audit_tick()` reads **at most 180** existing indexed PDF pages, using a cursor and a non-overlapping advisory lock. It compares original-source-count evidence, OCR and historic audit statuses. It **never writes** `nfcps_academic_page_index` or original PDFs.
3. `specialist_observation` records a page ID, issue category, responsible specialist, measurements and deduplicated evidence **without copying handout text**. Four issue categories: verified-source page out of range; impossible historic audit pass; OCR exhausted with near-empty text; OCR marked ready with near-empty text. **A visually designed/image-only page is not automatically declared missing.**
4. `specialist_dispatch_tick()` moves up to three detected observations per run into `student_improvement` as **unverified investigations**. It confirms the material is an actual ready PDF in its declared level, and deduplicates source reports.
5. Existing `improvement_intake_tick()` presents tasks to the four-vote internal Board; `board_session()` assigns the correct `ocr_recovery`, `pagination_inspector` or other specialist. No arbitrary source rewriting or unreviewed production deployments occur.
6. `work_tick()` tracks the assignment; only separately reviewed source evidence may eventually justify a verified improvement. The CEO election still uses independently measured source completion, not the number of meetings or task assignments.

## Actual acceptance
- Six deterministic JavaScript inspection policy fixtures passed.
- First 180-page production scan: **two** `OCR_READY_WITHOUT_TEXT` findings (200-level *Integumentary System*, page 13; 200-level *Body Fluids and Circulation*, page 41).
- Both findings were dispatched and have corresponding Board-approved 200-level OCR Recovery work items. **These are not yet repaired.**
- Targeting one finding twice returned a single observation, showing duplicate-safe behavior.
- One subsequent live `company_cycle()` returned an actual 180-page inspection, preserved 0 paid calls and 0 source mutations, with Board, leadership and joint-mission operations still functioning.
- All specialist tables and functions remain in the private unexposed schema with `anon`, `authenticated` and `service_role` access revoked.

## Cautions and next work
- This worker detects **metadata-level** problems. It cannot see a missing diagram rendered by the PDF, judge correct text reading order visually, prove pharmacology calculations, or independently repair scanned notes. Native flow visual QA and original-file/OCR comparison remain separate requirements.
- Scores do not yet count student comprehension or fully verified issue closure. Expand only after independent evidence is measured and cannot be gamed by one branch.
- Existing 100-level missing source files and encrypted materials remain genuine human/source-owner blockers.
- Never use detected findings, task count or an internal Board vote as proof of academic correctness.
- The live application UI was intentionally not modified. Optional student issue reporting UI requires a separate privacy/UX review, and must keep existing designs unchanged.

## Subsequent live independent-recheck gate

The private `specialist_recheck_tick()` now runs through the existing `company_cycle()` after source inspection and Board dispatch. It checks up to 40 assigned page observations against the current source-page index. For text defects, merely resetting an OCR status to pending does **not** prove a fix; the page must have at least 40 source characters, a completed audit pass and a suitable OCR state. For out-of-range pages the stored page count must be independently source-verified. When a previous defect condition clears, the observation and CEO issue move to **review_required / review**; the operation never grants verified scientific correctness by itself. No original PDF/text/image mutation is performed. In the initial real test, 2 assigned issues were checked, **0** qualified for review, **0** were independently verified. A later full company cycle returned four reviewed observations, still **0** claims of completed repairs. Five pure policy fixtures passed, and the Academic CI workflow now runs them. The SQL source is tracked in `sql/specialist-independent-recheck.sql` and the updated `sql/company-cycle-specialists.sql`.
