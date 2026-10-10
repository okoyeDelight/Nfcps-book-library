# Academic Night Agent — staged proposal

This folder contains a proposed, review-only nightly coding agent for the **existing** NFCPS One Academic Reader.

The source of product continuity is the root `NFCPS_ONE_MASTER_HANDOFF.md`; the specialised companion is `NFCPS_ACADEMIC_HANDOFF_CURRENT.md`.

## What happens after this proposal is reviewed and merged

At approximately **01:37 WAT** each day (GitHub Actions cron 00:37 UTC; actual starts may be delayed), the workflow checks the Academic Reader reference source. With a separately configured GitHub Actions repository secret named `OPENAI_API_KEY`, it uses the official `openai/codex-action@v1` to propose **one** narrowly scoped fix. The AI runs without write-access Git credentials in its checkout. A post-run guard rejects changes outside `academic-reader/frontend/` and `academic-reader/agent/tests/`, runs syntax and contract checks, and proposes a **draft pull request** for human review. If no safe change is found, it opens no PR.

Without the API secret, the scheduled job only performs baseline checks; **it does not run Codex**. The API may incur usage charges and must be budgeted/opted into deliberately. GitHub repository settings may also need **Allow GitHub Actions to create pull requests** enabled. Never put keys in this public repository.

This automation **cannot** autonomously change production. The deployed Academic Reader currently depends on Supabase/Vercel asset patching, and the `nfcps-flow-page` source is not mirrored in the expected path. Fixing real production problems will require a separate, traceable source-of-truth restoration and deployment workflow, with installed-app validation.

## Required safeguards before activating

- Review and approve this draft PR, including scope and cost controls.
- Use a tightly budgeted API key stored only in GitHub Actions secrets; consider repo environments and manual approvals where available.
- Protect `main`, prohibit workflow-driven auto-merge and production publish, and require code review.
- Restore/build a full local test harness (Deno/TypeScript backend, reader component, browser/mobile smoke tests) before granting more autonomy.
- Add representative fixtures: prose; PDF; DOCX; PPTX/slides; diagrams; tables/equations; scan; long document; 200–500 level materials; nested folders; slow/offline network.
- Check Vercel's two exact live JS/CSS routes before any deployment and rerun regression checks across Auth, Watch, Movies, Family, Publish, and Android.
- When a meaningful architecture change reaches production, update the canonical master handoff **in the same work session**.

## Limits of this first version

Its tests are simple baseline guards, **not proof of a working production reader**. It must not claim performance, visual fidelity, content completeness, OCR, API readiness, production parity, or security are verified. Start with draft PRs, not self-deploying agents.
