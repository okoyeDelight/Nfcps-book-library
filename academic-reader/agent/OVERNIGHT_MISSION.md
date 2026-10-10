# NFCPS Academic Continuous Agent — free prototype, protected mission

This repository holds an existing NFCPS One app and an Academic Reader **source mirror**, not a complete normal deployment source tree.

Before any engineering change, read:
1. `NFCPS_ONE_MASTER_HANDOFF.md` (the whole-product continuity file)
2. `NFCPS_ACADEMIC_HANDOFF_CURRENT.md` (specialized history)
3. `academic-reader/ARCHITECTURE.md` and `academic-reader/README.md`

## Phase-1 mission: deliberately small

This edition uses **Ollama + Qwen2.5-Coder 1.5B locally on a standard public GitHub Actions runner**, checking the repository every 15 minutes but only loading the model when a known issue remains and no existing agent PR awaits human review. It does not require `OPENAI_API_KEY` or a Copilot subscription.

The free model can propose exactly one replacement snippet for a **pre-reviewed issue** in `academic-reader/frontend/NfcpsAcademicBookReader.jsx`. The Python driver controls what code is in scope and refuses responses that do not exactly reproduce the original snippet or introduce suspicious capabilities.

The initial issue catalog contains:
- Clear a stale global page-request error when navigating to another source page.
- Add descriptive accessibility labels to the previous and next navigation arrows.

Once those small issues are resolved, the agent stops making proposals until its catalog is extended and reviewed. It does **not** autonomously design arbitrary new features, solve semantic extraction, or deploy the live Academic Reader.

## Non-negotiable behavior

Preserve complete source material, figures, superscripts, lists, tables, source page count, native NFCPS styling, Study tools, and the separation between actual verified exam questions and predictions. Never restore Drive iframe / PDF screenshot as the normal UI. Never claim production validation after static tests. Never edit auth, Family, Movies, Watch, updater, native Android, Supabase, Vercel, Render, private data, credentials, or deployment routes.

A changed source is first validated by JavaScript syntax checks, narrow policy tests, and existing feature-contract checks. It is then submitted as a **draft PR only**. The production bridge remains separate and untouched. Human review and real student experience testing are mandatory before production changes.

## Cost and trust

GitHub currently allows standard hosted runners for public repositories at no cost, subject to fair-use and platform policies. Ollama/Qwen inference on the runner needs no paid model API. Schedules can be delayed; CPU-only inference may be slow or fail. If model download, startup, or a verification test fails, the run should stop rather than bypass guardrails.

The model is an untrusted proposer, not an authority. The model receives brief handoff excerpts and a single source snippet. It cannot edit any file itself, receive the repository token, merge, or deploy. Its suggestions are applied only through constrained validation.

### Known limitation

The Academic live frontend still uses patched compiled assets, and the referenced `nfcps-flow-page` implementation is missing from the expected public source path. We must recover the true deployment sources and create mobile/content-fidelity tests before increasing autonomy.
