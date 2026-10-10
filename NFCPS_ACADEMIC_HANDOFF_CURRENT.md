# NFCPS One — Academic Reader & Library Handoff
_Last updated: 2026-10-06_

## Read this first

This is the current source-of-truth handoff for the NFCPS One Academic Library work.

The user does **not** want a PDF viewer inside the app. The target is:

> Drive/PDF/PPT/DOCX is only the source format. NFCPS extracts the document structure, text, images, diagrams and layout, then renders the content natively inside NFCPS so it feels like the material was built into the app.

The reader must feel like a premium in-app book/document reader, not a browser, iframe, Google Drive preview, white PDF sheet, or OCR text dump.

Required UX:
- Material opens inside NFCPS.
- No Chrome, Drive login, or external viewer.
- Reader background blends with NFCPS/off-white reading surface.
- Text and images sit directly on the reader surface.
- Responsive typography; increasing size reflows cleanly.
- Slide decks can show two slides per reading screen.
- True pinch-to-zoom and panning while enlarged.
- Tap/swipe/arrow to next page; avoid long vertical PDF scrolling.
- Explicit Page X of N so users trust the material is complete.
- Reading tools: Reader, Reading/Reflow, Understand, Ask, Exam, Recall.
- Actual past questions must be clearly separated from predicted/generated questions.
- OCR/indexing enhances intelligence; it must not block reading.

Do not regress back to iframe/PDF-canvas/Google Drive.

---

## Repository and production

Repository: `okoyeDelight/Nfcps-book-library`

Important: this repository does **not** contain a clean React source tree for the full deployed app. Much of the production frontend is currently being patched by replacing the compiled JS/CSS assets through Vercel routing rules. This is technical debt and should eventually be replaced by proper source.

Production app:
`https://nfcps-book-library-source-vercel-po.vercel.app`

Vercel:
- teamId: `team_QjZ90dfgLtug5Rymf0bX6pIK`
- projectId: `prj_DHrwRxhZKegeE7yRWLSyqunb5PAk`

Supabase:
- project_id: `fuusztcioodflmgqawyl`

Production asset routes are exact-only:
- `/assets/index-TvqYqOBS.js`
- `/assets/style-CsaC4EK1.css`

Never add a catch-all route. A previous catch-all proxy caused a black screen.

---

# Academic library backend

## Core tables
- `nfcps_academic_materials`
- `nfcps_academic_page_index`
- `nfcps_past_question_sources`
- `nfcps_past_questions`
- `nfcps_past_question_sync_state`
- `nfcps_drive_sync_folders`

## Drive sync

The Academic Drive crawler is recursive. It previously ran only once per hour and checked about 30 folders per run, which caused deep lecturer folders to remain undiscovered.

A catch-up schedule was added to run every 2 minutes while the tree catches up.

At one audit there were:
- 324 tracked active folders
- 59 that had never been checked
- 171 due for checking

Later catch-up reduced this backlog. Keep monitoring it.

## Major false-failure bug fixed

A large set of files were incorrectly marked failed because:

`EXTRACT_URL is not defined`

This happened **after** polished files had already been created and uploaded.

Fix applied in `nfcps-academic-polish` by defining the extractor URL.

334 false-failed materials were recovered after confirming their polished storage objects existed. Do not revert this.

A small number of genuine unsupported/problem files remained, including odd/no-extension files and a macro-enabled PowerPoint.

---

# Academic API

Edge function: `nfcps-academic-library`

Responsibilities:
- course listing
- materials listing
- dedupe
- hide failed duplicate records
- Past Questions course injection
- return NFCPS material metadata

Important cleanup already done:
- duplicate broken Body Fluids record filtered out
- folder cards removed from normal material lists so folders are not treated as books

Example:
- `Body-Fluids-and-Circulation-1.pdf` existed twice
- one real copy had 41 indexed pages
- one bad duplicate had 0
- only the real copy should be shown

---

# Reader evolution — what was tried and rejected

## Google Drive/PDF iframe
Rejected because of blank iframe, browser/Drive feel, external navigation and CSP/cross-origin problems.

## Supabase HTML reader in iframe
Rejected because Supabase served the reader with `text/plain` and sandbox CSP, causing white screens.

## Render-hosted reader page
Technically worked, but free Render cold start caused ~30-second opens. Rejected as long-term architecture.

## OCR text dumped into a cream page
Rejected because it destroyed formatting:
- bullets became random glyphs
- superscripts split
- headings lost hierarchy
- tables/formulas/spacing broke
- documents looked incomplete

## Full PDF page rendered as JPEG/image
This preserved fidelity and completeness, but the user clarified that this is still **not** the final product. The app should not feel like it is carrying the PDF paper.

---

# Current correct architecture

The source file is **data**, not the UI.

For digitally created files:

`PDF/PPT/DOCX -> structured extraction -> native text spans + styles + images + layout -> NFCPS reader`

For scanned/image-only pages:

`scan -> OCR + layout reconstruction -> NFCPS reader`

The visible reader should be NFCPS-native HTML/content.

---

# Native structured extraction

Edge function: `nfcps-native-page`

This is now the foundation of the new reader.

It uses MuPDF structured text extraction to preserve:
- real text
- spans
- whitespace
- font/style information
- positions
- embedded images
- vector information where possible
- table/segment structure

It returns:
- material
- title
- page
- pages
- width
- height
- ratio
- layoutHint
- slideDeck
- html
- text
- hasText

It was tested on:
- Anatomy diagram-heavy page
- Body Fluids text-heavy page

The extractor returns real native HTML/text and embedded images rather than a screenshot of the whole PDF page.

Cache is version-aware: material + page + version.

A cleanup pass exists for source font oddities such as Wingdings bullets. Continue improving font/bullet normalization.

---

# Reader target UX

## Reader/Layout mode

Default should render reconstructed native content on the NFCPS cream/off-white surface.

Goals:
- no obvious white PDF paper rectangle
- preserve heading/image/caption relationships
- native text selectable where practical
- diagrams/images remain in the correct logical place
- mobile-readable typography

## Reading/Reflow mode

Separate mode for book-like responsive reading:
- A-/A+
- paragraphs reflow
- cream/dark
- no fixed PDF coordinates
- better for prose-heavy handouts

This is where “increase text size and let it rearrange beautifully” belongs.

## Slides

For actual slide decks/landscape pages:
- 2-slide view supported
- manual 1-page / 2-slides toggle
- next advances by 2 in two-slide mode
- do not force 2-up when diagrams/labels would become unreadable

## Zoom

Required:
- true two-finger pinch zoom
- + / - / Fit controls
- pan while zoomed
- swipe next/previous only around 1x so pinch/pan does not cause accidental page turns

## Navigation
- Page X of N
- prev/next
- swipe
- small arrows that do not cover content
- prefetch neighboring pages

## Reading tools
Keep:
- Reader
- Reading
- Understand
- Ask
- Exam
- Recall

Study Lens endpoint: `nfcps-study-lens`

Past-question rule:
- `kind: actual` = verified extracted past question
- `kind: prediction` = inferred/generated likely question

Never present predicted questions as real past questions.

---

# Frontend asset patch

Production frontend is patched through edge function:

`nfcps-academic-ui-assets-v3`

It dynamically fetches the compiled bundle, replaces the `NfcpsAcademicBookReader` block, and serves patched JS/CSS.

Latest reader patch points production to `nfcps-native-page` and uses native HTML rendering (`dangerouslySetInnerHTML`) for reconstructed pages.

Verify production after changes by fetching:
`https://nfcps-book-library-source-vercel-po.vercel.app/assets/index-TvqYqOBS.js`

Look for:
- `nfcps-native-page`
- `dangerouslySetInnerHTML`

Technical debt: stop bundle surgery once proper source is recovered.

---

# Book/package API

Edge function: `nfcps-academic-book-package`

Modes:
- `?mode=manifest&material=<id>`
- `?material=<id>&page=<n>`
- older whole-package mode exists for compatibility

Manifest returns:
- title
- course
- pageCount
- sourcePageCount
- layoutHint
- slideDeck
- version

Important behavior:
- if page index is absent, package API can derive page count from polished PDF
- extraction/indexing is triggered asynchronously
- readable source content should still open

Reader readiness must be independent from OCR/index completion.

Do not reintroduce “still preparing” for readable source files.

---

# OCR pipeline

OCR is still useful for:
- search
- Ask
- Understand
- Exam matching
- accessibility/reflow
- scanned pages

But OCR is **not** the gate for opening a material.

Do not confuse “OCR complete” with “readable”.

---

# PCT 203 special handling

PCT 203 had an old PDF/TIFF container and needed normalization.

Important:
- 615 pages
- normalized copy stored
- dedicated OCR path exists
- compressed JPEG used for OCR payloads instead of huge PNGs

It should remain readable while OCR continues.

---

# Known quality problems still to solve

Do **not** call the Academic reader finished yet.

## 1. Reconstructed content can still look too PDF-like
MuPDF structured HTML preserves source positioning. Need a normalization layer that blends content into NFCPS rather than drawing an obvious paper page.

## 2. Tiny source typography
Example: `BCH 201 Metabolism.docx` can reconstruct with source font sizes that are too small on mobile.

Need responsive typography rules:
- detect prose-heavy pages
- increase readable font sizes
- preserve paragraph order
- use Reflow mode for full responsive resizing

## 3. Image-heavy anatomy materials
Need density-aware layout:
- diagrams should be large enough to read
- use one-up when labels are dense
- only use two-up when readability remains good

## 4. Scanned pages
If a page is literally one scanned image, there are no original text objects to extract.

For these:
- OCR
- layout reconstruction
- source visual fallback only where necessary

## 5. Office files converted through PDF
Long-term better path:
- DOCX: parse semantic headings/paragraphs/tables before PDF conversion when possible
- PPTX: parse slide XML/text/shapes/images directly
- use PDF as fallback/interchange, not always the primary semantic source

This will be more faithful than reverse-engineering everything from PDF.

---

# Missing/empty courses audit

Some courses previously showed only course headings and “Browse all course materials”.

Root causes found:
1. 334 false failed materials from `EXTRACT_URL` bug
2. deep nested Drive folders not yet crawled
3. folder records being treated as books
4. genuine unsupported files

Audit 200/300/400/500 level courses. Do not test only ANA 201.

---

# Vercel deployment caution

Safe:
- exact JS asset route
- exact CSS asset route

Never route `/*` or the full app through Render/proxy. That previously caused a black screen.

The connector can stage Vercel routes but cannot publish/promote them. User publishes manually from Vercel -> CDN -> Routing Rules -> Publish.

Always verify exactly two asset routes before publish.

---

# Important endpoints

Production app:
`https://nfcps-book-library-source-vercel-po.vercel.app`

Academic library:
`https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-academic-library`

Book package:
`https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-academic-book-package`

Native structured page:
`https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-native-page`

Study Lens:
`https://fuusztcioodflmgqawyl.supabase.co/functions/v1/nfcps-study-lens`

Polish:
`nfcps-academic-polish`

Drive sync:
`nfcps-academic-drive-sync`

Extract/index:
`nfcps-academic-extract`

Reader asset patch:
`nfcps-academic-ui-assets-v3`

Do not store auth tokens in this handoff. Read them from existing environment/Vault/cron configuration.

---

# Immediate next actions

## 1. Finish responsive native reconstruction
Build a page normalization layer that:
- removes fixed “paper” presentation
- preserves hierarchy
- normalizes margins
- preserves lists, tables, captions, diagrams
- normalizes phone font sizes
- uses NFCPS cream reading surface
- does not flatten content to OCR lines

## 2. Classify page type
Classify each page/material as:
- prose
- slide
- diagram-heavy
- table-heavy
- scan

Then choose strategy:
- prose -> responsive reflow
- slide -> 2-up or 1-up based on density
- anatomy diagram -> 1-up large image + native labels/text when extractable
- scan -> OCR reconstruction + visual fallback where needed

## 3. Test representative materials
Must test at least:
- #1 Intro to Anatomy
- Muscle Histology
- Body Fluids
- 4-circulatory-system
- BCH 201 Metabolism
- CLI 501
- at least one 300-level
- at least one 400-level
- at least one 500-level

Check:
- full content
- correct page count
- no missing images
- readable font size
- pinch zoom
- 2-slide mode
- no white PDF paper feel
- Study tools still work
- no “Still preparing” for readable source files

## 4. Resolve remaining real failed files
Query `nfcps_academic_materials` where `item_type='file' and polish_status='failed'` and fix/classify every remaining case.

## 5. Continue Drive catch-up
Verify:
- no never-checked folders
- due backlog trends down
- previously empty courses populate

---

# Product principle

> NFCPS Academic is not a PDF viewer. It is an intelligent academic reading system that imports source documents and reconstructs them natively.

The source remains authoritative.

NFCPS adds:
- responsive reading
- zoom/layout controls
- Study Lens
- Past Questions
- Ask
- Recall
- Exam intelligence
- future offline/cache

But it must never make students feel content is missing, scrambled, or incorrectly reconstructed.

When fidelity and reflow conflict:
- preserve meaning/structure first
- provide separate Reflow/Reading view
- never silently alter diagrams, equations, tables or question wording

---

# User feedback that must not be forgotten

Rejected:
- giant OCR serif text
- weird line breaks
- white PDF paper floating on cream background
- tiny text requiring excessive zoom
- incomplete-looking materials
- folders opening like books
- “still preparing” for content that exists

Wanted:
- text and images directly on NFCPS reader
- clean book-like organization
- full material
- swipe/tap next page
- responsive typography
- pinch zoom
- two slides per page when appropriate
- integrated Study tools
- premium native feel

---

# Final instruction to next agent

Before declaring success, test:
1. prose-heavy handout
2. slide deck
3. image-heavy anatomy material
4. scanned material
5. DOCX-derived material
6. recovered 300/400/500-level file

Do not conclude success from one Anatomy PDF.


---

# 10 October 2026 — Agentic Academic company: phase-1 source update

This section is a chronology addendum, not a claim of production deployment.

**UI constraint (permanent):** Preserve the current NFCPS Academic native design, cream reading surface, layout, classes, tools, and established navigation; no redesign when adding teaching capabilities. Students should never see AI infrastructure or a different app.

**Source branch work:** new \`academic-reader/agentic-company/\` contracts, independent verifier and tests; under source integration the frontend retry no longer uses a full-app reload and existing exam cards identify actual-question source details and visibly label predictions. The compiled bridge source \`academic-reader/supabase/nfcps-academic-ui-assets-v3/index.ts\` is regenerated from the same readable JSX.

**Correct capability labels:** Deterministic fidelity tests use synthetic fixtures only. They do not prove all actual textbook pages, figures, formulas, or mobile layouts are correct. Rich English/Pidgin explanations, personalised calculations, interactive moving diagrams and video remain designed roadmap items requiring source evidence and careful review. The current \`nfcps-study-lens\` remains primarily extractive, not unlimited AI tutoring. The current frontend still uses \`nfcps-flow-page\`, not mirrored in this repo at the expected location.

**Deployment:** This GitHub source work is not the live Supabase Edge Function and does not update the installed app until the connected project's \`nfcps-academic-ui-assets-v3\` function is safely deployed and checked. Keep the current exact two Vercel asset routes unchanged. Do not add proxies or replace the whole frontend. Record exact deployment/version/verification after deployment, not before.
