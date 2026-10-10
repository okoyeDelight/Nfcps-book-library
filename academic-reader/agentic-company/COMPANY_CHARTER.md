# NFCPS Academic Intelligence Company — Engineering Charter (Phase 1)

This is an **internal architecture**, not a separate app, redesign, or set of human impersonations. It must stay invisible to students: NFCPS One retains its exact established UI surfaces, type, spacing, navigation, identity, and reading flow.

**Canonical continuity:** Read root \`NFCPS_ONE_MASTER_HANDOFF.md\` and \`NFCPS_ACADEMIC_HANDOFF_CURRENT.md\` before implementation. Preserve the existing installed-app origin and its exact two Vercel JS/CSS rewrites. Never add a catch-all proxy, iframe, external Drive UI, or white PDF-paper layer. Source materials are immutable evidence.

## Governance

- **Human product board:** approves data-policy changes, teaching-quality criteria, scientific correctness policies, and anything involving clinical advice, member privacy, deployment, or spending.
- **Orchestrator/CEO (code):** schedules bounded jobs and records why each was chosen. Has no permission to merge, spend money, or publish.
- **Academic source librarian:** inventories pages and semantic blocks from existing polished sources, preserving source versions.
- **Reader-quality inspector:** compares the source's block/page IDs and text to the actual DOM after reflow; detects clipping, duplicate/missing pages, font sizes, and navigation errors. Inspects multiple viewport sizes.
- **Image guardian:** compares immutable hashes and visibility for diagrams; never changes the original image to make it fit.
- **Calculation auditor:** tests formulas, unit conversions, table integrity, and worked-example arithmetic; clinical claims need qualified review.
- **Exam officer:** matches verified actual past questions to evidence; predictions are never labelled historical or actual.
- **Tutoring team:** develops source-cited, layered explanations (plain English, Pidgin, prerequisite steps, examples, calculations, mnemonics, active recall). A source citation alone does not certify correctness; a separate factual review is needed.
- **Visual teaching studio:** prepares reviewed SVG/Canvas animation overlays and storyboards attached to immutable image hashes. Generated videos are optional, never required for basic reading. No default high-bandwidth playback.
- **Student safety/gatekeeper:** checks privacy, prompt injection, unverified scientific claims, and confusing external service labels.
- **CFO/resource scheduler:** rejects paid APIs, GPU assumptions, unbounded inference loops, and excess free-tier compute.
- **Digital cleaner/courier:** audits broken duplicate material, missing folder indexing, page prefetch, and cache delivery; cannot delete originals without approval.

## Shared artifact contracts

1. **Source manifest**: \`materialId\`, immutable \`version\`, exact \`pageCount\`, and \`pages[]\` with \`number\`, \`pageType\`, and stable \`blocks[]\` entries (\`id\`, \`kind\`, \`text\`, optional \`assetHash\` / \`structureHash\`).
2. **Rendered capture**: \`sourceVersion\`, \`sourcePageCount\`, \`pages[]\` mapping \`sourceNumber\` to ordered DOM \`sourceBlockId\`, \`assetHash\`, \`text\`, \`visible\`, and \`clipped\`; \`deviceChecks\` records actual browser checks.
3. **Teaching artifact**: \`materialId\`, \`sourceVersion\`, \`language\`, \`evidence: [{page,blockId}]\`, questions labelled \`actual\` or \`prediction\`, optional animation provenance, and separate scientific/clinical review fields.
4. **Work ticket**: stable \`id\`, \`owner\`, \`severity\`, \`state\`, \`estimatedLocalMinutes\`, safety flags and evidence. No autonomous production mutations or paid API jobs.

The pure verifier in \`academic-quality.mjs\` is the **first guardrail**, not a proof of medical or educational correctness. A complete status requires tests against *actual* extracted sources and real rendered pages, not synthetic fixtures alone.

## Routing and deployment boundaries

**Current production (handoff 6 October 2026, rechecked 10 October):**
- Stable app: \`https://nfcps-book-library-source-vercel-po.vercel.app/exact/\`
- Exactly two scoped Vercel asset rewrites (JS, CSS), not an entire-app proxy
- Supabase Edge \`nfcps-academic-ui-assets-v3\` stitches the native reader into the compiled JS from \`nfcps-faithful-academic-ui\`.
- Frontend uses Supabase \`nfcps-academic-book-package\`, \`nfcps-flow-page\`, and \`nfcps-study-lens\`.
- The source for \`nfcps-flow-page\` is not mirrored in the expected public repo path: do not invent its semantics.
- Mirror \`academic-reader/frontend/NfcpsAcademicBookReader.jsx\` into \`academic-reader/supabase/nfcps-academic-ui-assets-v3/index.ts\` and run the bridge contract test *before deployment*.

**Safety:** Nothing in this foundation PR constitutes a production deploy. A connected Supabase administrator must verify and deploy that Edge Function source; after deployment, verify the served live JS contains the new reader only, that Vercel has exactly two original scoped routes, and that the installed Android app sees the change without new APK.

## Immediate engineering increments

- R0: Establish a source-of-truth and fidelity contract; get initial deterministic tests green.
- R1: Preserve UI while fixing in-place reader retry and improving provenance shown by existing Exam cards.
- R2: Inventory actual representative course materials (200–500 level, image-heavy, DOCX, PPTX, scan, PCT203); compare semantic source to DOM with at least three small-screen sizes and poor network.
- R3: Build curated evidence-linked teaching artifacts. Support plain language/Pidgin, worked calculations with unit tests, prerequisites, matched actual past questions, and predictions only when labelled.
- R4: Add pre-approved image animation overlays with immutable source + scientific review. Reuse cached low-data lessons; do not require generation on every read.
- R5: Extend the continuous GitHub agent from a couple of hardcoded issues to approved, test-defined tickets and human-reviewed PRs.

## Release gate

No student-visible change is *done* without: baseline syntax/tests, no source losses, image hash comparison, pagination/overflow checks, mobile visual validation, Study/Exam regression tests, unchanged NFCPS UI, unchanged Watch/Family/Auth routes, actual deployed asset verification, and updated master handoff.

**Truthful status labels:** designed → in repository → tested locally → deployed to Edge → served by Vercel → verified in app. Never collapse these into "done".