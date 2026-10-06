# NFCPS One — START HERE

> **For any new ChatGPT account, developer, agent or maintainer:** read [NFCPS_ONE_MASTER_HANDOFF.md](./NFCPS_ONE_MASTER_HANDOFF.md) **before changing anything**.
>
> It is the canonical whole-product continuity file: history, product decisions, UI/UX, infrastructure, Android, auth, Watch, Movies/Cinema, Watch Together, Family/Welfare, Publish/admin, notifications, Books, Academic, deployments, regressions, dependencies, tools, current topology, unresolved work, and the exhaustive change log explaining why earlier approaches were changed or rejected.
>
> [NFCPS_ACADEMIC_HANDOFF_CURRENT.md](./NFCPS_ACADEMIC_HANDOFF_CURRENT.md) is the specialised Academic companion. It is **not** the whole NFCPS One history.

---

# NFCPS One — Academic Reader Source

This repository now contains the maintainable source for the NFCPS One Academic Reader.

## Product goal

Academic materials are **not shown as PDF paper** in the reader.

The source PDF/Office file is treated as an ingestion format. NFCPS reconstructs each source page from:

- positioned text spans
- headings and typography
- embedded images/diagrams
- vector/page layout information
- OCR only where the source is a scan

The reconstructed content is rendered inside the NFCPS reader UI.

## Reader modes

- **Reader** — reconstructed native layout with text and images.
- **Reading** — reflowed text for comfortable reading and text-size changes.
- **Understand** — page-grounded explanations.
- **Ask** — ask questions from the handout.
- **Exam** — actual matched past questions plus separately-labelled predictions.
- **Recall** — active-recall prompts.

Slide-like material supports 2-up presentation and pinch zoom.

## Source layout

```
academic-reader/
  frontend/
    NfcpsAcademicBookReader.jsx
    academic-reader.css
  supabase/
    nfcps-native-page/index.ts
    nfcps-academic-book-package/index.ts
    nfcps-academic-library/index.ts
    nfcps-study-lens/index.ts
  ARCHITECTURE.md
  .env.example
```

## Important

The live app is currently delivered through a compiled frontend bundle and Vercel asset routing. The source in this folder is the canonical readable version that future frontend work should migrate into the real app source tree.

Do not reintroduce an iframe/PDF viewer as the primary Academic reading experience.
