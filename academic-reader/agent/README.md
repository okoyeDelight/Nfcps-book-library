# NFCPS Academic Night Agent — ₦0 API prototype

This is a **draft, free-first nightly coding agent** for NFCPS One. It stays in the existing repository and does not touch the live deployment. No paid OpenAI API key, Copilot upgrade, or server subscription is required for this prototype.

### Stack

- **GitHub Actions (public repository, standard Ubuntu runner)** — scheduled job; no billed runner minutes under GitHub's public-repository policy.
- **Ollama + Qwen2.5-Coder:1.5B** — small open-source coding model downloaded and run locally during a job. The model is less capable than a full cloud coding agent.
- **Python standard library** — issue selection, one exact-string edit, input/output guardrails; no paid libraries or remote inference.
- **GitHub draft pull requests** — manual review before merging; nothing auto-publishes.

The job is scheduled for 00:37 UTC (01:37 West Africa Time) once the workflow is **merged into `main`**. A draft PR containing the workflow is not running by itself. GitHub scheduled jobs may start late or be skipped under load. The workflow also permits manual dispatch from the Actions tab.

### What the first edition can actually do

It reads the master and Academic continuity files, tries one of a few low-risk known issues (stale page error, previous/next button labels), asks the local model for a minimal replacement, rejects unexpected code, runs static checks, and opens a separate **draft PR** when a proposal survives. When no eligible issue remains, it stops.

This is **not** a fully independent autonomous software engineer. It does not invent new repair missions, guarantee a correct code fix, inspect mobile screenshots, verify exam-content fidelity, or patch live Vercel/Supabase functions. It will not make the entire Academic Reader correct overnight just because it runs every night.

### Activation and safety

1. Review [PR #3](https://github.com/okoyeDelight/Nfcps-book-library/pull/3).
2. Keep `main` protected and draft PRs subject to human review. If repository settings prohibit Actions from creating PRs, allow that specifically.
3. After merging, run the workflow manually once and inspect runtime logs/diffs before trusting its nightly schedule.
4. Check GitHub usage settings to prevent unexpected charges from any **other** nonstandard runner or paid service. This workflow uses only a standard public runner and a local free model.
5. Verify actual browser/mobile behavior and regression-test the installed app before any release. Production still depends on the separate patched-asset bridge.

### Next investment of engineering effort (not money)

Build deterministic semantic extraction tests (text/figures/tables/equations/pagination), replay representative PDF/DOCX/PPTX and scan fixtures, and reconnect the reader's clean source to a normal deploy. That creates reliable tasks for a more useful free agent.

The primary source of continuity is `NFCPS_ONE_MASTER_HANDOFF.md`. Update it after real architectural or production changes.
