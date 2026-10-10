# NFCPS Academic Night Agent — ₦0 API prototype

This is a **free-first, repeatedly scheduled coding agent** for NFCPS One. It stays in the existing repository and does not touch the live deployment. No paid OpenAI API key, Copilot upgrade, or server subscription is required for this prototype.

### Stack

- **GitHub Actions (public repository, standard Ubuntu runner)** — periodic runs; no billed standard-runner minutes under GitHub's public-repository policy.
- **Ollama + Qwen2.5-Coder:1.5B** — small open-source coding model downloaded and run locally during a job. The model is less capable than a full cloud coding agent.
- **Python standard library** — issue selection, one exact-string edit, input/output guardrails; no paid libraries or remote inference.
- **GitHub draft pull requests** — manual review before merging; nothing auto-publishes.

The workflow checks every **15 minutes, day and night**, after it reaches `main`. A push trigger attempts an initial run immediately upon installation. Actual GitHub start times can be delayed; this is not a continuously running server. A draft PR containing the workflow is not running by itself. GitHub scheduled jobs may start late or be skipped under load. The workflow also permits manual dispatch from the Actions tab.

### What the first edition can actually do

It reads the master and Academic continuity files, tries one of a few low-risk known issues (stale page error, previous/next button labels), asks the local model for a minimal replacement, rejects unexpected code, runs static checks, and opens a separate **draft PR** when a proposal survives. When no eligible issue remains, it stops.

This is **not** a fully independent autonomous software engineer. It uses short recurring jobs, not a permanently running 24/7 worker. A preflight skips model installation when there are no eligible fixes or an unreviewed agent PR is already open. It does not invent new repair missions, guarantee a correct code fix, inspect mobile screenshots, verify exam-content fidelity, or patch live Vercel/Supabase functions. It will not make the entire Academic Reader correct overnight just because it runs every night.

### Activation and safety

1. Review [PR #3](https://github.com/okoyeDelight/Nfcps-book-library/pull/3).
2. Keep `main` protected and draft PRs subject to human review. If repository settings prohibit Actions from creating PRs, allow that specifically.
3. Once installed on main, inspect the push-triggered first run and its logs/diff. Disable the scheduled workflow if runtime or scope checks are unexpected.
4. Check GitHub usage settings to prevent unexpected charges from any **other** nonstandard runner or paid service. This workflow uses only a standard public runner and a local free model.
5. Verify actual browser/mobile behavior and regression-test the installed app before any release. Production still depends on the separate patched-asset bridge.

### Next investment of engineering effort (not money)

Build deterministic semantic extraction tests (text/figures/tables/equations/pagination), replay representative PDF/DOCX/PPTX and scan fixtures, and reconnect the reader's clean source to a normal deploy. That creates reliable tasks for a more useful free agent.

The primary source of continuity is `NFCPS_ONE_MASTER_HANDOFF.md`. Update it after real architectural or production changes.
