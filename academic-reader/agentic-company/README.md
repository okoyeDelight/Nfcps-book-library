# NFCPS Academic — agentic company foundation

**Scope:** The company is a set of accountable, cost-limited tasks, not unrelated model personas. Student UI stays unchanged. The original source document always remains the immutable evidence.

## Roles

- CEO / Dispatcher: select priority work without paid services or writes to production.
- Reader Quality: examine source-page coverage, content order, clipping and responsive pagination.
- Image Guardian: compare stable hashes for every original image/diagram and rendered occurrence.
- Academic Tutor: create anchored and attributed explanations; scientific truth requires review.
- Calculation Auditor: independently verify formula transcription, numeric work and units.
- Past Question Guardian: link to actually verified source questions; never label generated predictions as actual.
- Animation Studio: propose reviewed overlays/storyboards anchored to original figures, never mutate the original file.
- Security Gatekeeper: check provenance, permission scopes and rollback paths.
- Finance: enforce ₦0 paid-API tasks, runtime budgets and bounded workloads.
- Student Success: use aggregate opt-in outcomes, not sensitive or identifiable student data.

## Available now (source implementation, not live application)

`academic-quality.mjs` has three pure functions:

- `auditAcademicFidelity(source, rendered)`: fails missing pages, missing/altered images, lost/reordered blocks, clipped content, mismatched formulas/tables and source-version inconsistencies; warns when actual mobile visual checks were not performed.
- `auditTeachingArtifact(lesson, source, verifiedQuestions)`: validates source-linked explanations, actual-versus-predicted exam question provenance, review requirements and unchanged source image evidence.
- `chooseAgentJob(jobs, options)`: bounded priority scheduling that rejects paid API tasks, production writes, locked jobs and excessive compute.

All inputs are proposed structured manifests; they do NOT magically exist for every NFCPS document yet. The engine has unit fixtures, but is not connected to the live ingestion/render pipeline or real material inventory. Integrating source manifests, rendered DOM measurements and offline fixtures is the next development milestone.

## Non-negotiable release conditions

1. Preserve the complete original document and all readable pages; OCR enhancement may run in the background.
2. Preserve existing NFCPS visual layout; no new tab, panel, theme or unrelated navigation without separate review.
3. Source version and page/block/image hashes must match.
4. Validate text layout on real devices and 200/300/400/500-level documents.
5. Past questions must be verified as *actual* before being displayed that way.
6. No silent edits to formulas, diagrams, tables or lecturers' source materials.
7. No paid model inference without explicit authorization.
8. Source mirror changes are not production deployments: the live bridge is Supabase `nfcps-academic-ui-assets-v3` with exact Vercel JS/CSS asset rewrites.
9. Never auto-merge or auto-publish agent-generated production code.
10. Update `NFCPS_ONE_MASTER_HANDOFF.md` after any architectural/production change, maintaining an accurate tested-versus-unverified distinction.

## Important caveat

Static completeness checks cannot prove scientific correctness or pixel-accurate visual fidelity. `pass` means only that the provided manifests satisfied these specific invariants. Human scientific and mobile browser testing remains required.
