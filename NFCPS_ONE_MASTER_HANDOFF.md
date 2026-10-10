# NFCPS ONE — MASTER HANDOFF, HISTORY, ARCHITECTURE AND CONTINUITY FILE

Last comprehensively updated: 6 October 2026, 18:20 WAT
Project: NFCPS One / NFCPS UNIZIK Library
Organisation: National Fellowship of Christian Pharmacy Students, Nnamdi Azikiwe University Chapter
Public compatibility repository: https://github.com/okoyeDelight/Nfcps-book-library
Canonical repo continuity file: `NFCPS_ONE_MASTER_HANDOFF.md`
Specialised Academic companion: `NFCPS_ACADEMIC_HANDOFF_CURRENT.md`
Owner/product lead: Delight Chiagozie Okoye / AYOMIDE
Primary product principle: Expose the benefit. Hide the machinery.

> READ THIS FILE FIRST.
>
> As of 6 October 2026, this repo copy is the canonical whole-product continuity document. `NFCPS_ACADEMIC_HANDOFF_CURRENT.md` is a specialised companion for Academic only and must not be mistaken for the complete NFCPS One history.
>
> This is the continuity document for any future ChatGPT account, developer, agent or maintainer working on NFCPS One. Do not restart the project, create a demo replacement, redesign from zero, or assume a feature is live just because code exists. Inspect the current production path and this file first.
>
> IMPORTANT: this repository is public. Secret values, passwords, signing keys, sync tokens, service-role keys, private Drive credentials and auth secrets are intentionally NOT written here. Their names, owners and locations are documented so a connected account can retrieve them from the relevant platform. Never paste secret values into this repo.

---

# 1. What NFCPS One is

NFCPS One began as “NFCPS BOOK LIBRARY”, a digital/physical library for the NFCPS UNIZIK chapter, with the tagline:

**Christ, the Therapy for All.**

It evolved into a broader fellowship app. The product now aims to be one coherent NFCPS experience covering:

- digital books and reading
- academic pharmacy materials
- physical book borrowing
- sermon/teaching discovery and Watch
- Christian Cinema / Movies
- Watch Together
- announcements and fellowship events
- Family care, welfare and support
- member/account sync and personal progress
- executive publishing and role administration
- push notifications, deep links, PWA/native Android behaviour
- personal growth, saved notes, Scripture, reminders and Moments

Do not describe NFCPS One as “just a library website” anymore.

The user’s desired feeling is premium, calm, mobile-first, polished, human-designed, Apple/Netflix/YouTube quality where appropriate, but still clearly NFCPS and spiritually grounded. The user repeatedly rejects designs that feel “AI-ish”, demo-like, cluttered, generic, or visibly stitched together from unrelated tools.

---

# 2. Non-negotiable product principles

These instructions have been repeated throughout the build and should be treated as product constraints.

## 2.1 Preserve the existing product

- Never restart NFCPS One from scratch unless explicitly asked.
- Never make a parallel demo and claim the app is fixed.
- Inspect the current production experience before changing it.
- Preserve the existing UI/UX language and improve it rather than replacing it randomly.
- Preserve existing users, sessions and progress when moving hosts.
- Web/UI changes should normally reach installed users remotely without requiring a new APK.
- Only rebuild the Android app when native behaviour actually changes.

## 2.2 Hide infrastructure from students

The student should see:

- a book
- a movie
- a teaching
- a care request
- an announcement
- a reader

They should not see:

- Google Drive
- raw JSON
- Supabase
- Render
- AppDeploy
- storage bucket URLs
- crawlers
- OCR queues
- internal error codes
- provider branding

“Expose the benefit. Hide the machinery.”

## 2.3 Mobile first

Most users will use phones. The product must be designed primarily for Android/iPhone/PWA behaviour, not desktop-first assumptions.

## 2.4 No unnecessary cost

The fellowship has little/no infrastructure budget. The build has deliberately used free plans, static/CDN delivery, GitHub Actions, free Render/Supabase/Vercel allowances and free/open tools where practical.

Do not casually replace working free infrastructure with a paid dependency.

## 2.5 Truthful capability

Do not claim a feature works because a route/table/component exists.

Always distinguish:

- implemented
- connected
- live
- conditional
- legacy
- experimental
- unverified

This matters especially for notifications, realtime, offline behaviour, native Android actions, OCR, Family/Welfare routing and old admin features.

---

# 3. Branding and UI identity

Official early branding:

- Name: NFCPS BOOK LIBRARY
- Later/expanded name: NFCPS One / NFCPS UNIZIK Library
- Tagline: Christ, the Therapy for All.

The app has gone through several visual phases. The current product shell is dark, premium and mobile-focused. Do not infer that old early-library colours must override the present shell.

Important historical design preferences:

- premium, sleek, calm, welcoming
- Apple-like restraint
- Netflix/YouTube quality for media surfaces
- mobile-first
- uncluttered
- smooth motion
- dark navy/near-black surfaces
- green/gold were used earlier
- current product uses dark surfaces with purple/pink/accent treatment in some sections
- academic reader uses a warm off-white/cream reading surface
- never let an inserted feature feel like a foreign website inside the app

Current bottom navigation seen in production:

- Home
- Books
- Watch
- Movies
- Family
- You

Academic is a category inside Books.

The user explicitly asked that newer features “look like they were already there.”

---

# 4. Current production topology — 6 October 2026 snapshot

This project has accumulated infrastructure from several generations. Do not assume every service listed below is still part of the critical path.

## 4.1 Public compatibility repository

Repository:

https://github.com/okoyeDelight/Nfcps-book-library

This repo is intentionally lightweight. It currently contains bootstrap/update manifests and GitHub Actions workflows rather than the complete historical frontend/backend source.

Important files:

- nfcps-bootstrap.json
- nfcps-bootstrap-v2.json
- nfcps-update.json
- .github/workflows/movie-crawler.yml
- .github/workflows/watch-crawler.yml
- .github/workflows/publish-apk-raw.yml
- .github/workflows/publish-cinema-web.yml
- this handoff file

## 4.2 Historical/private source

A private source repository existed and was reviewed at:

Nfcps-book-library-source

Reviewed historical commit:

fbe9bfc92116fa9815da46d3f18cea5235943994

Historical review branch:

feature/watch-agent-v2

The source repo was later renamed/reorganised during Android updater work. The public repository became the compatibility/release repository.

A future account may not have automatic access to the private source. If it is connected, inspect it before editing compiled assets.

## 4.3 AppDeploy

Historical AppDeploy app:

nfcps-book-library-c2ma7y

Older production relied heavily on AppDeploy and mirrored meaningful source under appdeploy-live/.

At one point AppDeploy production was explicitly the source of truth.

Later, frontend delivery and compatibility moved toward Vercel/Hatchable/Render/Supabase due limits, build failures and the need to preserve the installed native shell.

AppDeploy remains part of the historical architecture and legacy host list.

## 4.4 Vercel

Current stable production web origin:

https://nfcps-book-library-source-vercel-po.vercel.app

Bootstrap currently points app_url to:

https://nfcps-book-library-source-vercel-po.vercel.app/exact/

Known Vercel identifiers:

- team id: team_QjZ90dfgLtug5Rymf0bX6pIK
- project id: prj_DHrwRxhZKegeE7yRWLSyqunb5PAk

Current CDN route patching is deliberate and narrow.

As of the 6 October 2026 snapshot, the live route version is:

a5e8849f-474c-46da-957e-754726c959bc

The live rules are only:

1. the existing compiled JS asset path is rewritten to the Academic reader patch asset
2. the existing compiled CSS asset path is rewritten to the Academic reader patch CSS

Do NOT recreate the old catch-all rewrite to Render. A catch-all proxy previously caused a black screen and was rolled back.

## 4.5 Hatchable

Historical/compatibility Hatchable project:

proj_Z583a1uATsyK

The bootstrap service_gateway currently points to:

https://nfcps-one.hatchable.site/api/compat

A source review on 30 September found Hatchable version 88 with 14 table schemas and 32 registered routes, 30 active and two disabled.

Hatchable caused regressions during one migration, especially Watch/Family/sign-in. Treat it as compatibility infrastructure, not automatically as the preferred frontend host.

## 4.6 Supabase

Current major backend/data project ref:

fuusztcioodflmgqawyl

Supabase now owns much of the newer Academic, Past Questions, Cinema, books, Family/Welfare and Watch Together data/function layer.

Do not expose the service-role key.

The public project ref is not a secret, but authenticated/admin operations require connected tooling or server-side credentials.

## 4.7 Render

Render workspace used during this build:

tea-daoms1dg1s2s738si9o0

Render has many NFCPS services because several reader/OCR approaches were tested.

Some are current dependencies; many are experimental/obsolete. See the Render section later in this document before deleting anything.

---

# 5. Bootstrap and Android compatibility

Current nfcps-bootstrap.json snapshot:

- revision: 15
- app_url: https://nfcps-book-library-source-vercel-po.vercel.app/exact/
- service_gateway: https://nfcps-one.hatchable.site/api/compat
- internal hosts include:
  - nfcps-book-library-source-vercel-po.vercel.app
  - nfcps-one.hatchable.site
  - nfcps-book-library-c2ma7y.v2.appdeploy.ai
- /publish routes to the Vercel origin
- /__legacy_appdeploy routes to AppDeploy

The native shell has historically loaded the remote product so web changes reach installed users without an APK rebuild.

Android package:

org.nfcpsunizik.one

Native shell features have included:

- web app loading/bridge
- deep links
- push/FCM integration
- picture-in-picture/media integration
- native speech/Scripture Lens work
- in-app update system
- reading reminders
- native app identity assets

---

# 6. Android update system

The user explicitly rejected browser/Downloads-based updating.

Required update behaviour:

- update stays inside NFCPS
- tap update
- in-app progress 0–100%
- download and install without opening Chrome or Downloads
- preserve existing installed app rather than forcing users to find a new APK manually

Current public update manifest nfcps-update.json snapshot:

- revision: 48
- enabled: true
- latest version code: 39
- latest version name: 1.8.14
- minimum supported version code: 29
- APK release URL points to the GitHub release nfcps-one-latest
- current release title references Watch Together links
- 1.8.14 improved NFCPS HTTPS room links and Android deep-link opening

Current update manifest URL should be retrieved from the public repo rather than hardcoded elsewhere.

Historical updater work:

- private source repo was separated from public compatibility/release repo
- signed slim APK bridge was created
- static hosting/CDN was preferred to sleeping hosts for APK delivery
- Google Drive was rejected as primary APK delivery because Drive restricted APK files under malware-policy review
- repeated GitHub Actions Android build failures occurred during September/October; do not assume the signing workflow is healthy without testing

---

# 7. GitHub Actions branches and automation

## 7.1 Watch feed

Workflow:

.github/workflows/watch-crawler.yml

Schedule:

every 5 minutes

It crawls trusted Christian YouTube channels and publishes generated watch-feed.json to orphan branch:

nfcps-live

Sources currently include names such as:

- Apostle Arome Osayi
- Apostle Michael Orokpo
- Lawrence Oyor
- Apostle Emmanuel Iren
- Godswill Ukeme
- Apostle Effa Emmanuel Isaac
- Apostle Edu Udechukwu
- Bro. Gbile Akanni
- Theophilus Sunday
- Dunsin Oyekan
- Apostle Joshua Selman / Koinonia
- Apostle Femi Lazarus
- Victoria Orenze
- Greatman Takit
- Kaestrings
- Godswill Oyor

The crawler categorises teachings by prayer, worship, revival, purpose, Bible teaching, evangelism, relationships and fallback category.

## 7.2 Cinema index

Workflow:

.github/workflows/movie-crawler.yml

Schedule:

17 minutes past every 6 hours

It searches YouTube for Christian/gospel movies, premieres, Mount Zion content, African Christian cinema, faith films, youth/campus/marriage/family titles and similar queries.

It rejects obvious trailers/reviews/sermons/music videos, applies duration/content checks and publishes movie-catalog.json to orphan branch:

nfcps-movies

Target limit is up to roughly 1,200 indexed films.

## 7.3 Cinema web branch

Workflow:

.github/workflows/publish-cinema-web.yml

Publishes a built Cinema frontend to orphan branch:

nfcps-web

This workflow was created during the period when Vercel/Hatchable limits pushed us to alternate static publication.

## 7.4 APK mirror

Workflow:

.github/workflows/publish-apk-raw.yml

Publishes an APK mirror to orphan branch:

nfcps-apk

Historical workflow content still references an older 1.8.9 slim APK source. Do not treat this workflow as the canonical current 1.8.14 publisher without reviewing/updating it.

---

# 8. Product evolution timeline

## 8.1 4–7 September 2026 — book library origins

The project began as an NFCPS digital library with animated/3D book covers, title/author, read/download actions, resources/external links and premium library presentation.

Physical borrowing was then designed to be fully automated:

- no QR requirement
- no routine admin approval
- borrower self-confirms collection and return
- 24-hour reservation expiry
- 30-day loan
- one 30-day renewal
- waitlist rules
- overdue blocking
- reminders

## 8.2 9 September — production continuity

The instruction became explicit: continue the existing live app, do not restart. AppDeploy and the Android shell already existed. Remote UI changes should flow to installed users.

Reader work included pagination, chapters, reading progress, continue reading, history, offline state, search, table of contents, typography/themes/layout/brightness, highlights, notes, bookmarks and saved positions.

## 8.3 11 September — Watch autonomy

Watch evolved into a self-updating content system with trusted sources, discovery/classification, source quality controls and GitHub Actions scheduling after AppDeploy cron unreliability.

## 8.4 Late September — product broadening

The product expanded into Watch, Family, Welfare, executive publishing, announcements/events, Moments/reminders, Watch Together, deeper reader intelligence and Android native features.

## 8.5 29–30 September — notifications/native updater

google-services.json was supplied for FCM work. Publish announcements were expected to trigger phone notifications. Member/admin role and handover features were expanded. The user strongly required in-app updates rather than browser downloads.

## 8.6 30 September–3 October — intro/auth/UI migration problems

A cinematic astronaut intro existed. The user later explicitly said: Leave the intro. Stop touching the intro. Continue the UI/UX.

After host migrations, sign-up/create-account, Watch, Family and Watch Together all experienced regressions. Raw JSON appeared in consent UI in one state. iPhone/PWA issues were also discussed.

## 8.7 1–2 October — Cinema

Movies became a dedicated section separate from Watch, with Christian movie discovery, in-app playback, endless catalogue, carousels, premieres/countdowns, children/cartoon grouping and Watch Together integration.

## 8.8 2 October — Books + Academic expansion

User requested large Christian/general book catalogue plus a 200–500 level Academic section sourced from SOPA e-Library Google Drive.

## 8.9 3–6 October — Academic overhaul

The Academic reader went through multiple architectures: Drive iframe → study reader/PDF canvas → reflowed Book Mode → iframe blank-screen fixes → Render proxy → data URL reader → native React reader → faithful page image → current native structured extraction.

---

# 9. Feature inventory and status

Use these labels when assessing code:

- Present — source-backed implementation exists
- Reconnect — implementation exists but current loading path was not found
- Conditional — depends on source/permission/device/integration
- Legacy — older separate implementation, current deployment not established

## 9.1 Accounts

Historical implementation includes name, email, password, optional WhatsApp number, create account, sign in, current account, sign out and persistent sessions. Guest progress can be local.

Identity fragmentation remains a real architectural issue between custom account, care/publishing auth and older admin/platform identities.

## 9.2 Personal sync

Includes reading state/settings, bookmarks, annotations, Watch history, likes, saved items, followed speakers, goals, notes, takeaways, growth memory, Moments settings and borrowing references.

## 9.3 Digital Books

Core reader history includes resume, chapters, search, bookmarks/favourites, highlights, margin notes, page/scroll modes, typography, spacing, margins, brightness, text colour, themes, offline cache, retry/unavailable state and page-turn sound.

Earlier reading-intelligence features included Explain/Scripture/Reflect, quote sharing, reading paths, margins/notebook, Reading Rooms and read-to-Watch connections. Some require reconnection/verification.

## 9.4 Physical borrowing

Keep these policies consistent: 24-hour reservation, 30-day loan, one 30-day renewal, waitlist restrictions, overdue blocking/reminders, and low-friction self-confirmed collection/return.

## 9.5 Watch

Watch is sermons/teachings, separate from Cinema. Desired UX: Continue, For You, Live, Shorts, Saved, followed speakers and topic discovery. Sermon intelligence historically includes transcripts, summaries, themes, chapters, Scripture references and evidence-grounded Ask This Sermon.

## 9.6 Watch Together

Room creation/invite/join, presence, host control, guest resync, chat/prayer/Scripture messages, reactions, leave/end and expiry exist conceptually/technically. Android 1.8.14 improved deep-linked room URLs. iPhone/realtime/playback edge cases must still be tested.

## 9.7 Cinema

Current Supabase snapshot: roughly 1,178 movie rows. GitHub crawler can publish about 1,200 items. Categories include Faith & Drama, African Christian Cinema, Love & Family, Young Believers, True Stories, Faith Under Fire, Family Night and Documentary.

## 9.8 Family

Care surface includes welcome/check-in, prayer/academic support, connector availability, matching, accept/decline, complete/cancel, reassign/remind and consent-controlled contact sharing.

## 9.9 Welfare

Requests should route discreetly to authorised welfare leadership with WhatsApp follow-up where consented. Do not expose sensitive requests broadly.

## 9.10 Announcements / Publish

Historical model includes access request, approved roles, drafts, submit, approve/reject, publish/remove, audience/direct-publish rules, terms, suspension/revocation and audit records. Announcement edit/versioning remains incomplete historically.

## 9.11 Notifications

General/wing subscriptions, FCM/native channels, deep links and reminder logic exist historically. OS permission, subscription and actual delivery are separate states. Unified persistent notification inbox was not established.

## 9.12 Moments

Devotional reminders: verses, book excerpts, cadence, quiet hours, reader-linked excerpts, local/offline content and test notifications.

## 9.13 Wings

Mostly invitation/targeting/join-link behaviour, not a complete in-app wing-membership system.

---

# 10. Current Supabase data model

Important tables:

Academic:
- nfcps_academic_materials
- nfcps_academic_page_index

Accounts/sync:
- nfcps_accounts
- nfcps_sessions
- nfcps_member_sync

Books:
- nfcps_book_catalog
- nfcps_book_crawl_state

Cinema:
- nfcps_cinema_movies
- nfcps_cinema_crawl_state

Drive sync:
- nfcps_drive_sync_folders

Family/Welfare:
- nfcps_family_official_contacts
- nfcps_family_profiles
- nfcps_family_publish_access
- nfcps_family_requests
- nfcps_family_welfare_log
- nfcps_welfare_cases
- nfcps_welfare_routes

Past Questions:
- nfcps_past_question_sources
- nfcps_past_questions
- nfcps_past_question_sync_state

Watch Together:
- nfcps_watch_rooms

---

# 11. Current data snapshot — 6 October 2026

Operational snapshot only; numbers change.

Academic:
- 469 file rows
- 469 ready
- 0 failed at latest check
- 323 material-folder rows
- 324 Drive sync folders tracked
- 0 never checked
- 0 due at latest check
- 3,887 indexed pages
- 1,466 OCR ready
- 2,286 native/text-not-needed
- 123 OCR pending
- 10 processing
- 2 needs review

Past Questions:
- 8 source documents
- 124 question rows

Book catalogue:
- about 1,523 rows

Cinema:
- about 1,178 rows

Watch Together:
- about 10 room rows at snapshot

Accounts:
- about 12 rows at snapshot

Never expose personal/member data in public logs/docs.

---

# 12. Academic product goal

Academic belongs in Books and is sourced from SOPA e-Library / Drive. Students should never feel sent to Google Drive or a generic PDF website. The material should feel built into NFCPS.

Academic should support level → semester → course → material, with Past Questions, full material completeness, native reader navigation, Study tools and background/offline intelligence.

---

# 13. Academic architectures tried and lessons learned

## Direct Drive
Rejected because of external UI, sign-in/provider branding and inconsistent mobile behaviour.

## PDF canvas / Study Reader
Useful for intelligence, but rejected as final UX because user did not want a document viewer.

## Reflowed Book Mode
Looked book-like but raw extraction destroyed bullets, equations, superscripts, hierarchy and layout; artificial sections made materials feel incomplete.

## Blank iframe
Supabase/cross-origin sandbox behaviour produced white reader panes.

## Render frame proxy
Worked when warm but free cold starts caused ~30-second waits.

## Data URL reader
Removed one network hop but remained transitional.

## Native React reader
Correct direction because the reader surface lives inside NFCPS.

## Faithful original-page reader
Restored completeness/layout, but still looked like “PDF paper”.

## Current direction
PDF/source file is only the source format. Extract text/images/styles/structure, rebuild native NFCPS content, render on NFCPS off-white surface.

---

# 14. Latest Academic reader requirement

This overrides earlier “faithful PDF page” defaults.

## Visual surface
Warm off-white/cream reader. No white floating PDF rectangle.

## Text
Native/selectable, book typography, sensible margins, preserved headings/emphasis/lists/superscripts/equations where possible, and true reflow when text size changes.

## Images
Inline diagrams/images on the same reader surface, zoomable and context-preserving.

## Navigation
Page-like rhythm: swipe/tap next; avoid unnecessary long vertical scrolling; responsive pagination as font size changes.

## Slides
2-up available/default where appropriate, one-page toggle, pinch zoom, plus/minus/fit and panning while zoomed.

## Completeness
Show full source completeness. Never hide that a source has N pages/slides.

---

# 15. Native extraction implementation

Primary current function:
- nfcps-native-page

It uses MuPDF StructuredText with preserved images/spans/whitespace/styles, segmentation, table hunting and vector/structured extraction. It returns extracted HTML and plain text and caches by material/page/version.

Current package family includes mupdf around 1.28.1.

The next improvement is critical: stop relying mainly on absolute-position StructuredText HTML. Use StructuredText JSON to build semantic blocks:
- heading
- paragraph
- bullet/list
- table
- figure/image
- caption
- callout
- equation/formula
- break/spacer

Then paginate those blocks into the off-white NFCPS reader.

Experimental helper functions include:
- nfcps-native-page-probe
- nfcps-structured-probe
- nfcps-flow-page

---

# 16. Current compiled frontend patch

The public repo does not hold the full clean React source of the currently deployed Vercel app.

Production is surgically patched through Vercel CDN asset rewrites to:
- nfcps-academic-ui-assets-v3

That Edge function fetches a known base JS/CSS build, replaces the NfcpsAcademicBookReader function and serves patched assets.

Current base static source:
https://nfcps-faithful-academic-ui.onrender.com

This is fragile technical debt. Long-term, move the final reader into the real private source repo and deploy normally.

Do not delete the base static site while the patch function still fetches it.

---

# 17. Academic Drive ingest / polish

Current Drive sync:
- nfcps-academic-drive-sync

Historical crawler issue:
- only 30 folders per run
- once-per-hour schedule
- at one point 324 tracked, 171 due, 59 never checked

Catch-up was accelerated to every 2 minutes. Latest snapshot: all 324 tracked folders have been checked.

Polisher:
- nfcps-academic-polish

Handles PDF, PPT/PPTX, DOC/DOCX, images/scans, normalisation, large-PDF preservation and scan restoration.

Critical bug found:
334 files were falsely marked failed because EXTRACT_URL was undefined after successful conversion/upload. Their polished objects already existed. The constant was fixed and rows recovered without reconverting. Latest snapshot: 469 ready, 0 failed.

---

# 18. Academic page index / OCR

nfcps_academic_page_index stores extracted text, heading/topics, visual URL, OCR state/confidence/retry/audit metadata.

OCR is an enhancement layer, not a reading gate.

States include:
- ready
- not_needed
- pending
- processing
- needs_review

---

# 19. PCT 203 stress case

A 615-page old scanned PDF forced special handling.

Solution path:
1. pdf-lib normalised the old container.
2. Normalised 615-page PDF saved.
3. MuPDF could open it.
4. Rendering separated from OCR.
5. Supabase coordinates page work.
6. Render/Tesseract OCRs images.
7. Results save to page index.
8. advisory claims prevent duplicate work.
9. failed pages rotate behind fresh pages.
10. audit checks finished pages.

Experiments included Tesseract.js, RapidOCR, pdfjs-dist, @napi-rs/canvas, MuPDF WASM, Poppler and PyMuPDF.

Important bug fixed: row lock held during external OCR call caused save-back timeout. Replaced with advisory claim approach.

---

# 20. OCR audit

Audit checks include empty/short text, garbled ratio, missing/low confidence and missing source visual.

Clean pages are left alone. Suspicious pages can be requeued later, after first-pass backlog is low.

---

# 21. Academic cron jobs

Inspect cron.job before editing because schedules change.

Known jobs:
- nfcps-academic-pdf-polisher — every minute
- nfcps-academic-drive-sync-catchup — every 2 minutes
- nfcps-academic-book-bootstrap — every 2 minutes
- nfcps-academic-book-sync — every 10 minutes
- nfcps-academic-ocr-worker-a — 10 seconds
- nfcps-academic-ocr-worker-b — 10 seconds
- nfcps-pct-worker-3 — 10 seconds
- nfcps-pct-worker-4 — 10 seconds
- nfcps-pct-worker-5 — 10 seconds
- nfcps-academic-audit — every minute
- nfcps-academic-audit-recheck — every 5 minutes
- nfcps-academic-visual-keep-warm — every minute
- nfcps-book-reader-keep-warm — every minute

Secret header values are intentionally omitted from this public file.

---

# 22. Academic Edge functions

Core:
- nfcps-academic-library
- nfcps-academic-polish
- nfcps-academic-polished-upload
- nfcps-academic-drive-sync
- nfcps-academic-folder
- nfcps-academic-extract
- nfcps-academic-book
- nfcps-academic-book-shell
- nfcps-academic-book-sync
- nfcps-academic-book-bootstrap
- nfcps-academic-book-package
- nfcps-academic-ocr-sync
- nfcps-study-lens
- nfcps-native-page
- nfcps-academic-ui-assets-v3

Past Questions:
- nfcps-past-question-upload
- nfcps-past-questions
- nfcps-past-question-browser
- nfcps-past-question-sync

Probes/experiments:
- nfcps-drive-probe
- nfcps-file-probe
- nfcps-native-page-probe
- nfcps-structured-probe
- nfcps-flow-page
- nfcps-pct203-normalize-test
- nfcps-pct203-normalize-store

PCT special:
- nfcps-pct203-ocr

---

# 23. Past Questions

Past Questions is a first-class Academic area.

Private Drive source produced 8 unique source rows and currently 124 verified question rows.

Some PDFs were image-only and needed visual/manual extraction.

Do not infer course code from compilation filename alone. Tag from printed exam evidence/page.

Actual questions must be clearly actual. Generated likely questions must be clearly predictions.

---

# 24. Study Lens

Function:
- nfcps-study-lens

Modes:
- sources/questions
- study
- ask

User-facing tools:
- Understand
- Ask
- Exam
- Recall

Ask-this-handout must stay grounded in page/handout evidence and say when unsupported.

At build time there was no model provider key in Supabase Vault, so extractive answers were used instead of pretending unrestricted LLM tutoring.

---

# 25. File/folder behaviour

Folders are not books.

A bug allowed folder cards such as PROF OLI to open as books and show “still preparing.”

Material lists were adjusted to prefer real files.

Duplicate placeholders also existed. Example: Body-Fluids-and-Circulation-1.pdf had a broken duplicate and a real indexed copy. Dedupe must prefer ready/polished/non-zero source.

---

# 26. Render services

Likely/currently relevant Academic services:
- nfcps-faithful-academic-ui
- nfcps-academic-visual
- nfcps-academic-ocr
- nfcps-academic-ocr-2
- nfcps-image-ocr
- nfcps-image-ocr-2
- nfcps-image-ocr-pool

Experimental/obsolete candidates include:
- nfcps-native-academic-ui
- nfcps-book-frame
- nfcps-book-frame-v2
- nfcps-academic-mupdf-ocr
- nfcps-academic-poppler-ocr
- nfcps-one-study-reader
- nfcps-one-study-reader-v2
- nfcps-one-study-reader-v3
- extra image OCR workers 4/6/7/8
- bridge/update/foundation test services

Do not delete services until all live code and routes are searched for their URL.

---

# 27. Non-Academic Supabase functions

Active newer functions include:
- nfcps-family
- nfcps-watch-room
- nfcps-watch-invite
- nfcps-account
- nfcps-intro-import
- nfcps-youtube-movies
- nfcps-cinema-crawler
- nfcps-cinema-library
- nfcps-book-crawler
- nfcps-book-library
- nfcps-drive-sync

Historical AppDeploy/Hatchable routes still matter elsewhere.

---

# 28. Book catalogue automation

Tables:
- nfcps_book_catalog
- nfcps_book_crawl_state

Current snapshot: about 1,523 catalogue rows.

Do not assume every record is a full legal copy. Access type/rights matter.

---

# 29. Cinema automation

Supabase schedules include regular refresh and premiere watch.

Current movie rows: about 1,178.

GitHub also generates nfcps-movies branch.

Avoid conflicting sources of truth.

---

# 30. Free-data / no-data video idea — not solved

The user explored zero-data viewing without payment. Peer-to-peer suggestions were rejected.

There is no legitimate software trick that turns carrier radio/network access into free data without zero-rating, local network/cache, partnership or predownload.

Do not reintroduce unsafe/illegal “free internet” bypass ideas.

---

# 31. PWA/iPhone

Requested:
- install prompt / Add to Home Screen guidance
- Watch Together support
- installed-app deep links

Platform-specific behaviour must be verified.

---

# 32. Intro

Cinematic astronaut/spaceman intro was built and revised.

The explicit later instruction remains:

**Leave the intro.**

Do not touch unless asked.

---

# 33. Background audio idea

Optional devotional ambience/chant atmosphere was requested with toggle and automatic reduction/off during video. Verify implementation before claiming it works.

---

# 34. UI states required

Every meaningful flow needs loading, empty, error, offline, denied-permission where relevant, reduced-motion where relevant, retry/recovery and truthful sync/notification state.

Never animate success before server success.

---

# 35. Architecture debt

- identity fragmentation
- compiled bundle patching
- many temporary Render services
- duplicate content-source systems
- legacy admin identity
- incomplete account lifecycle
- no unified notification inbox
- incomplete RSVP/calendar
- Academic semantic renderer not fully finished

---

# 36. Things that broke before — do not repeat

1. Vercel catch-all proxy to Render caused black screen.
2. Redirecting stable origin caused Android to open Chrome first.
3. Supabase HTML iframe was sandboxed/blank.
4. Render cold starts produced ~30-second opens.
5. Raw OCR reflow destroyed bullets/formulas/layout.
6. Requiring OCR before reading made large scans feel unfinished.
7. Artificial section grouping made files feel incomplete.
8. Folder-as-book produced “still preparing.”
9. Duplicate failed placeholders hid real files.
10. EXTRACT_URL bug falsely failed hundreds of files.
11. Row lock + save-back caused statement timeout.
12. Too much OCR concurrency caused 500/502.
13. parity routing overloaded one executor.
14. repeated 615-page normalisation wasted resources.
15. PNG OCR payloads were too heavy.
16. Render free services cold-start/restart.
17. Google Drive is poor APK delivery.
18. GitHub/Vercel builds have repeatedly failed.
19. Hatchable migration broke Watch/Family/auth.
20. “deployed” is not the same as “visible in installed app.”

---

# 37. Final Academic architecture recommendation

Layer A: immutable polished source as evidence.
Layer B: structured extraction into semantic blocks.
Layer C: native NFCPS renderer on off-white background.
Layer D: true reflow/pagination on text-size change.
Layer E: Study intelligence/search/Past Questions.
Layer F: image fallback only for scan-only pages.

Do not make a PDF screenshot the normal UI.

---

# 38. Highest-priority next actions

1. Read this file.
2. Inspect production before changing it.
3. Verify live Vercel two-rule routing.
4. Fetch nfcps-academic-ui-assets-v3 and nfcps-native-page.
5. Do not revert to iframe, book-frame or PDF canvas.
6. Replace absolute-position StructuredText HTML with semantic block rendering from StructuredText JSON.
7. Make off-white reader background itself the page.
8. Keep diagrams/images inline.
9. Implement true responsive reflow and book-style pagination.
10. Keep page/slide completeness explicit.
11. Keep 2-slide mode and pinch zoom.
12. Use page-image fallback only for scans.
13. Keep OCR in background.
14. Test 200/300/400/500 level.
15. Test PDF, DOCX, PPTX, scan, large file and nested-folder material.
16. Move final reader back into clean private source repo when accessible.
17. Regress-test Watch, Movies, Family, auth, Publish and update flow.

---

# 39. Academic test matrix

Normal text handout:
- page count
- readable native typography
- no fused/missing paragraphs
- proper superscript/subscript
- reflow

Diagram-heavy anatomy:
- diagram retained
- labels readable
- image/context preserved
- zoom
- Study tools evidence

PPT:
- slide detection
- 2-up and 1-up
- pinch zoom
- no dead space
- correct advance

Scan:
- readable before OCR
- OCR not blocking
- audit low-confidence

Large file:
- fast open
- correct page count
- deep random page
- no full reprocessing
- bounded memory

Nested folder:
- discovered
- course non-empty
- folder not opened as book

---

# 40. Secrets and credentials

DO NOT COMMIT VALUES.

Secret categories include:
- Supabase service-role key
- Edge/internal sync tokens
- Academic drive/book/OCR sync tokens
- Past Question sync token
- crawler keys
- Render OCR token
- Android signing credentials
- FCM/server credentials
- Google Drive connected-account credentials
- GitHub/Vercel/Render API auth
- private WhatsApp/contact data

Retrieve through connected platform settings/tools.

---

# 41. Tools/connectors used

- GitHub
- Supabase
- Vercel
- Render
- Google Drive
- Files
- web/browser validation
- AppDeploy/Hatchable connectors where available

Firecrawl/browser visual checks were used but are not production dependencies.

---

# 42. How to work with the user

The user prefers implementation over long theory.

Do:
- inspect current product
- fix real issue
- verify production
- say what remains broken
- preserve UI
- test the exact path the user sees

Do not:
- call backend rows “done”
- say “should work” without checking
- redesign unrelated surfaces
- touch intro casually
- hide faults
- sugar-coat
- ask the user to repeat known context

Treat screenshots as product evidence.

---

# 43. Product-specific do-not-do list

- no Drive reader
- no raw provider URLs
- no folder-as-book
- no OCR gate to reading
- no permanent PDF screenshot UI
- no giant flattened OCR paragraphs
- no fake Past Questions
- no APK rebuild for web-only changes
- no Chrome/Downloads updater
- keep Watch and Movies separate
- no fake free-data bypass
- no Vercel catch-all proxy
- no untested host migration
- no unverified native parity claims

---

# 44. Current Vercel routing

Production uses only two Academic asset rules:
- compiled JS filename → nfcps-academic-ui-assets-v3 / index.js
- compiled CSS filename → nfcps-academic-ui-assets-v3 / style.css

If a full frontend rebuild changes asset hashes, update these route patterns.

Do not use a catch-all proxy.

---

# 45. Legacy source review reference

A detailed planning inventory exists as NFCPS-feature-map-and-UI-plan.md.

Reviewed:
- private source commit fbe9bfc92116fa9815da46d3f18cea5235943994
- AppDeploy snapshot 1790777881753
- Hatchable version 88

Historical source paths include:
- appdeploy-live/backend/member-sync.ts
- appdeploy-live/backend/care.ts
- appdeploy-live/backend/publish.ts
- appdeploy-live/backend/index.ts
- appdeploy-live/backend/watch-together.ts
- appdeploy-live/backend/sermon-intelligence.ts
- appdeploy-live/src/ProductShell.tsx
- appdeploy-live/src/ReaderExperience.tsx
- appdeploy-live/cron.json
- netlify/functions/admin-add-book.mjs

---

# 46. Public repo role

This public repo is not the full product source.

It is used for:
- compatibility manifests
- update/bootstrap discovery
- releases
- crawler workflows/generated branches
- continuity documentation

Do not conclude the app has no source because this repo is sparse.

---

# 47. Definition of done — Academic reader

Not done until:
- opens under ~5 seconds
- no Drive/browser
- no white PDF-paper UI
- text native/selectable
- off-white NFCPS surface
- book-like default type
- font-size truly reflows
- images inline
- 2-up slides
- pinch zoom
- unobtrusive navigation
- Page X of N / completeness
- entire source reachable
- no “still preparing” for readable source
- Study/OCR can lag without blocking reading
- grounded Ask
- actual vs prediction explicit
- all levels have content
- nested sync works
- duplicates hidden
- offline/error states graceful

---

# 48. Definition of done — whole NFCPS One

Regression-test:
- intro
- auth
- Home
- Books
- digital reader
- physical borrowing
- Academic
- Watch
- Shorts
- Movies
- Watch Together
- Family
- Welfare
- Publish
- announcements
- push
- deep links
- PWA
- Android update
- role handover
- offline/retry states

---

# 49. Verification-needed / unresolved

- unified identity/recovery
- account deletion/verification
- notification delivery
- notification inbox
- RSVP/calendar
- wing membership
- announcement editing
- Publish edge cases
- Welfare WhatsApp end-to-end
- iPhone Watch Together
- PiP/background playback
- legacy catalog admin
- Reading Rooms/read-to-Watch reconnection
- compiled bundle patch removal
- Render cleanup
- final semantic Academic renderer

---

# 50. Handoff protocol for another ChatGPT account

1. Do not ask the user to explain NFCPS again.
2. Read this file.
3. Inspect live Vercel app.
4. Inspect bootstrap/update manifests.
5. Inspect Vercel routing.
6. Inspect nfcps-academic-ui-assets-v3 for Academic work.
7. Inspect Supabase tables/functions.
8. Inspect cron.
9. Verify Render dependencies.
10. Search private source if connected.
11. Preserve users/native shell.
12. Make smallest production-safe change.
13. Verify stable path.
14. State what changed and what remains.
15. Update this file after architectural change.

---

# 51. Why this handoff exists

Without continuity, a future agent can easily rebuild the wrong app, break the native shell, restore discarded PDF architecture, expose Drive, duplicate crawlers, delete a live Render dependency, undo Vercel rollback, mistake experiments for production, force unnecessary APK churn or break Family/Watch/auth while fixing Academic.

---

# 52. Final product direction

NFCPS One should feel like one native fellowship product, not a set of integrations. Books, Academic, Watch, Movies, Family and personal growth share one premium shell. Infrastructure stays invisible. Academic source files are transformed into native reading content; OCR/AI are intelligence layers, not UI. Media discovery updates automatically but stays curated and truthful. Family/Welfare protect privacy. Executive tools enforce approved roles. Web changes should reach existing users without unnecessary APK churn. Every feature must be tested in the real app.

---

# 53. Maintenance rule

Whenever a future agent makes a meaningful architectural, deployment, data-model, reader, native-app or product-direction change:

**update this file in the same work session.**

Do not allow the handoff to drift away from reality.

---

# 54. Exhaustive change log and why each direction changed

This section is intentionally repetitive. It exists so a future agent can understand not only what exists, but **why** the product moved from one architecture to another. When in doubt, preserve the latest direction and treat older approaches as historical evidence, not instructions to revert.

## 54.1 4 September 2026 — original library concept

The project started as a student/fellowship book library for NFCPS UNIZIK. Core idea:
- animated/3D-looking book covers
- title + author
- search/categories
- tap to read/download free material
- a resources area for external links
- premium but simple mobile presentation

Naming stabilised around **NFCPS BOOK LIBRARY**, later expanded to **NFCPS One / NFCPS UNIZIK Library**. The tagline remained **Christ, the Therapy for All.**

The user did not want a generic website. Even in the earliest phase, the direction was immersive, mobile-first and “human designer” rather than template/AI-looking.

## 54.2 7–9 September — circulation, reminders, Reader V2, installed-app continuity

Physical borrowing was added as a second experience beside digital reading. The key policy decisions were:
- no QR dependency
- no routine librarian approval for every action
- 24-hour reservation expiry
- 30-day loan
- one 30-day renewal
- waitlist handling
- overdue blocking/reminders
- student self-confirmed pickup/return flow where safe

Push/reminder branding was requested as **NFCPS UNIZIK LIBRARY**.

AppDeploy became the operational host, with live app id `nfcps-book-library-c2ma7y`. The Android APK was treated as a shell around remote product content, so remote web/UI changes should normally reach installed users without a fresh APK.

Reader V2 work included pagination, chapters, progress, continue reading, history, search, themes, notes/highlights/bookmarks, offline copies and saved position. The design principle was already: preserve the existing product and improve it rather than starting over.

## 54.3 9–18 September — Watch becomes a separate product surface

Watch was intentionally separated from the Books home. It evolved into a Christian teaching/sermon experience with:
- trusted speaker/channel discovery
- Continue watching
- search/categories
- long-form teaching and Shorts-like clips
- background/PiP ambitions
- save/history/follow behaviour
- live-source signals
- topic classification

The preferred speaker universe included names such as Arome Osayi, Michael Orokpo, Lawrence Oyor, Emmanuel Iren, Effa Emmanuel Isaac, Godswill Ukeme, Edu Udechukwu, Gbile Akanni, Theophilus Sunday, Dunsin Oyekan and others added later.

The Watch crawler eventually moved to GitHub Actions because AppDeploy scheduling was unreliable. The crawler publishes to branch `nfcps-live`.

## 54.4 Late September — Family, Welfare, Publish, member administration

The app broadened from media/reading into fellowship operations. Family/Welfare goals included:
- one-time consent before care matching/contact sharing
- WhatsApp number only where needed/consented
- prayer/academic-support/care requests
- authorised welfare routing
- two-way follow-up
- “talk to someone” entry
- volunteers/official contacts
- request state and reassignment/reminder handling

Publish/executive tooling expanded around:
- role-based access requests
- president/owner approval
- drafts
- submit/review
- approve/reject with reason
- publish/remove
- audience selection
- direct-publish rules
- terms, suspension/revocation and audit trail
- member/role handover rather than making a president sign up again after transition

The product rule was explicit: students should never see raw JSON, provider mechanics or admin infrastructure.

## 54.5 29–30 September — FCM, announcement notifications, in-app updater

A `google-services.json` file was supplied for Android FCM work. Announcements published from the executive surface were expected to create phone notifications.

The updater requirement became strict:
- no Chrome
- no Downloads app
- no “go download another APK manually” experience
- in-app update UI/progress
- preserve existing installed app

Android package identity: `org.nfcpsunizik.one`.

The public update manifest later stabilised at revision 48 / NFCPS One 1.8.14, version code 39, minimum supported version code 29.

## 54.6 30 September–3 October — intro, auth and host-migration regressions

A cinematic astronaut/spaceman intro was designed and revised multiple times. Later instruction overrides earlier intro experimentation:

**Leave the intro. Do not touch it unless explicitly asked.**

Sign-in/create-account should appear correctly after intro. Remember Me, consent and first-run flows were repeatedly discussed.

Host migrations caused serious regressions:
- Watch broke
- Family connectors failed
- sign-in/create-account broke
- Watch Together rooms opened but controls did not work
- raw JSON appeared in consent UI in at least one version
- iPhone/PWA behaviour regressed

The lesson: never migrate the entire app simply because one host is blocked. Use the smallest compatibility change and verify the installed app path.

## 54.7 1 October — zero-data/free-video brainstorming, explicitly unresolved

The user wanted an innovation where members could watch/use the app without paid mobile data. P2P suggestions were rejected. The desired analogy was “solar instead of fuel” — reuse existing phone/network infrastructure creatively.

No legitimate software-only method was found that turns carrier access into free mobile data. This remains unresolved. Do not invent illegal bypasses or pretend a carrier-free solution exists. Lawful options remain zero-rating partnerships, predownload/cache/local networks or sponsored access.

## 54.8 2 October — Cinema and large catalogue expansion

Cinema was created as a separate section from Watch. Desired behaviour:
- Netflix-like presentation
- Christian films, not sermon feed
- premieres + countdowns
- in-app playback
- Watch Together integration
- endless/infinite-feeling catalogue
- auto-moving carousels
- centred/larger active card
- children/cartoon grouping
- variety across sections

Movie discovery eventually became both a GitHub crawler (`nfcps-movies`) and Supabase crawler/library flow. Avoid duplicate/conflicting sources of truth when changing this.

Books expansion target became roughly 1,000+ Christian/general titles, with covers. General-life books such as Atomic Habits / Ikigai were discussed alongside Christian material. Copyright/access rights must still be respected; a catalogue record does not automatically mean a full legal copy is stored.

## 54.9 2 October — Academic added from SOPA e-Library

Public source root discussed:
`https://drive.google.com/drive/folders/1IPXjwTcRCfcwhxFqeZVp_Gavbgwq82rJ`

Goal:
- 200–500 level
- semester
- course
- lecturer/nested folders where present
- all materials visible in app
- no Google Drive UI
- student should feel material was built into NFCPS

Past Questions was added as a first-class Academic area rather than a random folder.

## 54.10 2–3 October — Vercel/Hatchable/AppDeploy juggling

Vercel limits and Hatchable limits forced temporary alternate deployment ideas. Hatchable caused several regressions. AppDeploy branding/limits were also a concern. The user wanted a single stable link and installed-app continuity rather than “new APK every time”.

A critical Vercel incident occurred later: a catch-all CDN rewrite to Render produced a black screen. It was rolled back. Never reintroduce catch-all routing for the app.

Another incident: redirecting the stable origin made Android open Chrome first. Stable-origin redirects are not acceptable for the installed shell unless explicitly verified.

## 54.11 3–4 October — PWA/iPhone and Watch Together

Requested:
- iPhone install/Add to Home Screen guidance
- deep links into NFCPS One
- Watch Together room links under NFCPS domain
- continue-room state
- in-app YouTube framing/masking
- shared play/pause/seek
- background/PiP ambitions

Android 1.8.14 specifically improved NFCPS HTTPS room links/deep-link behaviour. iPhone Watch Together still requires regression testing.

## 54.12 4–6 October — Academic reader architecture sequence

This is the most important architecture history in the project because multiple versions were built and rejected.

### Stage A — Drive embed / preview
The original Academic list could point at Google Drive folder/file embeds. Rejected because students saw external/provider UI and could be forced into Drive/Chrome/sign-in.

### Stage B — Study Reader / PDF canvas
A reader with Study Lens tabs (`Understand / Ask / Exam / Recall`) was built. It rendered PDF content/canvas inside an in-app frame. Intelligence was useful, but the user rejected “it looks like a document/PDF viewer.”

### Stage C — Reflowed Book Mode
The app extracted text into book-like cream pages. It looked closer to an ebook, but raw extraction broke:
- bullets (`y`/Wingdings artefacts)
- superscripts/subscripts (`mm⁻³` etc.)
- formulas/equations
- headings
- paragraph grouping
- slide structure
- layout hierarchy

Grouping many PDF pages into artificial book sections also made users suspect files were incomplete.

### Stage D — blank iframe diagnosis
Supabase served reader HTML with restrictive/sandbox behaviour in an iframe. This produced the white reader pane. The issue was not missing manuscript data.

### Stage E — Render frame proxy
An unsandboxed Render reader host fixed framing but free-tier cold starts caused 20–30+ second opens. A keep-warm job helped when warm but did not solve the product architecture.

### Stage F — data URL reader
A self-contained `data:` reader removed one network hop. This was transitional and not considered the final architecture.

### Stage G — native React reader injected into live app
The compiled Academic iframe was surgically replaced by a React reader component inside NFCPS. This was the first architecture matching “reader belongs to the app”.

### Stage H — faithful original-page view
After raw reflow proved disorganised, Original View rendered the exact source page. This restored page count/completeness and layout. It was useful as a truth-preserving reference and for diagrams, but still looked like “white PDF paper”.

### Stage I — recovered library ingest
A major backend audit found 334 files incorrectly marked failed because `EXTRACT_URL` was undefined **after** conversion/upload succeeded. The constant was fixed. The 334 existing polished files were recovered without reconversion. Nested folder sync was accelerated from once/hour to every 2 minutes during catch-up.

### Stage J — current native structured extraction
The current user requirement overrides “faithful PDF page as normal UI”. The PDF/source is evidence only. NFCPS should extract:
- text
- spans/fonts/emphasis
- headings
- lists
- tables
- embedded images
- vector/drawing content where possible
- captions/equations/callouts

and render them directly on the NFCPS warm off-white reader surface. `nfcps-native-page` currently uses MuPDF StructuredText and serves extracted HTML/plain text per page. The next improvement is to replace absolute-position HTML with semantic block rendering and true responsive pagination/reflow.

Slides must support 2-up and 1-up, pinch zoom, +/-/Fit and panning. Normal reading should be swipe/tap next, not endless document scrolling.

## 54.13 PCT 203 — why the OCR system became complex

One 615-page legacy scan forced several experiments:
- Poppler attempt failed on Render due unavailable system package installation
- PyMuPDF / RapidOCR experiment
- MuPDF WASM
- pdf-lib normalisation
- Tesseract.js
- image-only OCR workers
- pooled workers
- pg_cron and HTTP extension scheduling

The original file structure was old/quirky. `pdf-lib` normalised it successfully to 615 pages. The fixed copy was stored and processed page by page.

Important bugs/lessons:
- do not normalise the 615-page file on every page request
- PNG page payloads were unnecessarily heavy; JPEG reduced failures
- row locks held across external OCR calls caused save-back statement timeouts
- advisory claiming is safer
- worker parity routing accidentally overloaded one OCR executor
- too much concurrency caused 500/502 or memory restarts
- failed pages must rotate behind fresh pages rather than block the queue
- clean pages should not be reprocessed

## 54.14 Latest user clarification — the final reader feeling

The user does **not** want:
- a white PDF rectangle
- a page screenshot presented as the product
- giant plain OCR paragraphs
- document-viewer feeling

The user wants:
- warm off-white NFCPS reader background itself as the “page”
- extracted native text/images blended into that surface
- book-like typography and spacing
- useful edge-to-edge space without cramped layout
- swipe/tap next rather than long continuous scrolling
- responsive repagination when text size changes
- images/diagrams inline
- page/slide completeness preserved
- 2 slides in one reader screen where appropriate
- pinch-to-zoom and buttons
- Study tools as intelligence layered on top

---

# 55. UI/UX thought history and design tokens

## 55.1 Global product feeling

Repeated user instructions:
- maintain our UI/UX
- premium build
- do not break what already works
- make new surfaces feel like they were always part of NFCPS
- not AI-ish
- clean, mature, polished
- mobile first

Current shell commonly uses dark surfaces with restrained accent colour and large rounded cards. Media experiences can borrow Netflix/YouTube interaction quality, but branding remains NFCPS.

## 55.2 Known/current tokens used during Academic work

Representative current tokens:
- background/near black: `#101217`
- surface: `#191c23`
- light accent: `#9bb3ff`
- action blue: `#4668e8`
- light ink: `#f3f3ef`
- Academic cream/off-white: around `#f5f0e5`
- cream panel: around `#fffdf7`

Do not treat these as a permanent design system file; inspect production CSS before changing. They document the visual language that produced the accepted current shell.

## 55.3 Bottom navigation

Current production bottom navigation seen during October work:
- Home
- Books
- Watch
- Movies
- Family
- You

Academic lives inside Books.

## 55.4 Books

Early visual goal:
- 3D/physical-feeling covers
- animated shelves/cards
- beautiful cover art
- title/author metadata
- premium discovery rather than file list

Current catalogue automation should not erase that original product intention.

## 55.5 Watch

Do not turn Watch into Cinema. Watch is teaching/sermon discovery.

Desired surfaces historically included:
- Continue
- For You
- Live
- Shorts
- Saved
- followed speakers
- topic browsing

Player intelligence can show transcript/chapter/Scripture/Ask where grounded data exists.

## 55.6 Movies/Cinema

Separate bottom-nav destination. Desired look is cinematic/Netflix-like:
- horizontal themed carousels
- large active/center card
- auto movement (historically ~3 seconds was discussed)
- long catalogue/infinite feel
- premiere countdowns
- children/cartoon grouping
- Watch Together entry

## 55.7 Family/Welfare

Should feel reassuring, discreet and private. Never gamify private care. Avoid exposing request text on public/shared surfaces.

## 55.8 Publish/executive

Should look like an authorised product workspace, not a hidden admin console. Access request, pending, approved, review and publishing states should be clearly distinct.

## 55.9 Intro

The astronaut intro was heavily iterated. Later direction is binding:
**leave the intro alone unless explicitly asked.**

---

# 56. Libraries, runtimes and technical dependencies used or tested

This is a history/inventory, not a statement that every dependency remains in the final critical path.

## 56.1 Academic extraction/rendering

Used/tested:
- MuPDF / `mupdf` npm package around 1.28.1
- `pdf-lib` around 1.17.1
- `pdfjs-dist` around 4.10.38
- `@napi-rs/canvas` around 0.1.70
- Tesseract.js around 5.1.1
- PyMuPDF / `fitz`
- RapidOCR / rapidocr_onnxruntime
- Pillow
- Poppler experiments
- MuPDF WASM experiments

Current native extraction direction uses MuPDF StructuredText.

## 56.2 Backend/data/scheduling

- Supabase Postgres
- Supabase Storage
- Supabase Edge Functions / Deno
- pg_cron
- pg_net
- PostgreSQL `http` extension (enabled to bypass stuck async HTTP queue in OCR orchestration)

## 56.3 Hosting/deployment

- AppDeploy
- Vercel
- Render
- Hatchable
- GitHub Actions / orphan publication branches
- Netlify historically/legacy admin and earlier deployments
- Cloudflare was explored for analytics/domain work; verify current DNS before relying on it

## 56.4 External content/services

- Google Drive / SOPA e-Library
- YouTube discovery/playback
- Firebase/FCM Android notifications
- GitHub Releases for APK delivery

## 56.5 Device/platform work

- Android WebView/native shell
- deep links
- FCM
- PiP/media integration
- PWA / Add to Home Screen
- iPhone-specific Watch Together/PWA concerns

---

# 57. Current production/service map — exact snapshot 6 Oct 2026

## 57.1 Stable web app

Stable origin:
`https://nfcps-book-library-source-vercel-po.vercel.app`

Bootstrap app URL:
`https://nfcps-book-library-source-vercel-po.vercel.app/exact/`

Vercel team id:
`team_QjZ90dfgLtug5Rymf0bX6pIK`

Vercel project id:
`prj_DHrwRxhZKegeE7yRWLSyqunb5PAk`

Live route version:
`a5e8849f-474c-46da-957e-754726c959bc`

Only two live rules:
- `^/assets/index-TvqYqOBS\.js$` → Supabase `nfcps-academic-ui-assets-v3/index.js`
- `^/assets/style-CsaC4EK1\.css$` → Supabase `nfcps-academic-ui-assets-v3/style.css`

Historical rollback reference from the pre-patch Vercel production period included deployment id:
`dpl_9q5h6hBZE8fJ2WzqpAVL3xRBcz4x`

Treat historical deployment ids as rollback clues, not instructions to switch blindly.

## 57.2 Supabase

Project ref:
`fuusztcioodflmgqawyl`

Current key Academic Edge versions at snapshot:
- `nfcps-academic-library` v21
- `nfcps-academic-polish` v7
- `nfcps-academic-drive-sync` v3
- `nfcps-academic-book-package` v5
- `nfcps-academic-ocr-sync` v11
- `nfcps-study-lens` v5
- `nfcps-pct203-ocr` v8
- `nfcps-academic-ui-assets-v3` v4
- `nfcps-native-page` v2

Versions change after deployment; always query before editing.

## 57.3 Render workspace

Workspace id:
`tea-daoms1dg1s2s738si9o0`

Current/relevant services include:
- `nfcps-faithful-academic-ui` — static base used by compiled reader patch
- `nfcps-academic-visual` — source-page image renderer/fallback
- `nfcps-academic-ocr`
- `nfcps-academic-ocr-2`
- `nfcps-image-ocr`
- `nfcps-image-ocr-2`
- `nfcps-image-ocr-pool`

Known experimental/legacy services still present at snapshot include:
- `nfcps-native-academic-ui`
- `nfcps-book-frame`
- `nfcps-book-frame-v2`
- `nfcps-academic-mupdf-ocr`
- `nfcps-academic-poppler-ocr`
- `nfcps-one-study-reader`
- `nfcps-one-study-reader-v2`
- `nfcps-one-study-reader-v3`
- `nfcps-image-ocr-4/6/7/8`
- `nfcps-one-app`
- `nfcps-bridge-seasonal`
- `nfcps-bridge-logo-fix`
- `nfcps-bridge-update`
- `nfcps-foundation-unsigned`

Do not delete any service merely because it sounds obsolete. Search current Vercel/Supabase/functions/bootstraps for its URL first.

## 57.4 Hatchable

Project:
`proj_Z583a1uATsyK`

Compatibility gateway:
`https://nfcps-one.hatchable.site/api/compat`

Historical version review: version 88, 14 table schemas, 32 routes, 30 active / 2 disabled at review time.

## 57.5 AppDeploy

Historical app id:
`nfcps-book-library-c2ma7y`

Historical live URL:
`https://nfcps-book-library-c2ma7y.v2.appdeploy.ai/`

AppDeploy is part of continuity/legacy architecture, not automatically the preferred frontend now.

---

# 58. Current data snapshot — verified 6 Oct 2026

These counts are operational and will move. They are included so a future agent can detect obvious drift/regression.

Academic materials:
- file rows: 469
- ready file rows: 469
- failed file rows: 0
- folder rows: 323
- tracked Drive folders: 324
- tracked folders never checked: 0
- empty course nodes still visible at snapshot: 4
  - PCT 303 (300L semester 1)
  - PHA 301 (300L semester 1)
  - PCT 302 (300L semester 2)
  - PCT 306 (300L semester 2)

Academic index/OCR:
- indexed pages: 3,887
- OCR ready: 1,466
- text/native-not-needed: 2,286
- pending OCR: 123
- processing: 10
- needs review: 2

Past Questions:
- source documents: 8
- verified question rows: 124

Book catalogue:
- 1,523 rows

Cinema:
- 1,178 rows

Watch Together rooms:
- about 10 rows at snapshot

Accounts:
- about 12 rows at snapshot

Never put member names/contact data in this public continuity file.

---

# 59. Current cron/scheduler snapshot

Query `cron.job` before changing. Snapshot:

Academic:
- `nfcps-academic-pdf-polisher` — every minute
- `nfcps-academic-drive-sync-catchup` — every 2 minutes
- `nfcps-academic-book-bootstrap` — every 2 minutes
- `nfcps-academic-book-sync` — every 10 minutes
- `nfcps-academic-ocr-worker-a` — every 10 seconds
- `nfcps-academic-ocr-worker-b` — every 10 seconds
- `nfcps-pct-worker-3` — every 10 seconds
- `nfcps-pct-worker-4` — every 10 seconds
- `nfcps-pct-worker-5` — every 10 seconds
- `nfcps-academic-audit` — every minute
- `nfcps-academic-audit-recheck` — every 5 minutes
- `nfcps-academic-visual-keep-warm` — every minute
- `nfcps-book-reader-keep-warm` — every minute

Other current jobs:
- `nfcps-book-catalog-refresh` — weekly Sunday 05:15
- `nfcps-cinema-premiere-watch` — every 6 hours at minute 20
- `nfcps-cinema-refresh` — Monday/Wednesday/Friday 07:15
- `nfcps-drive-sync-hourly` — minute 17 hourly
- `nfcps-past-question-sync-hourly` — minute 27 hourly

Secret header/token values are intentionally excluded from this public file.

---

# 60. Current Academic Edge/function inventory

Current ACTIVE functions at snapshot include:

Product/data:
- nfcps-family
- nfcps-watch-room
- nfcps-watch-invite
- nfcps-account
- nfcps-intro-import
- nfcps-youtube-movies
- nfcps-cinema-crawler
- nfcps-cinema-library
- nfcps-book-crawler
- nfcps-book-library
- nfcps-drive-sync

Academic core:
- nfcps-academic-library
- nfcps-academic-polish
- nfcps-academic-polished-upload
- nfcps-academic-drive-sync
- nfcps-academic-folder
- nfcps-academic-extract
- nfcps-academic-book
- nfcps-academic-book-shell
- nfcps-academic-book-sync
- nfcps-academic-book-bootstrap
- nfcps-academic-book-package
- nfcps-academic-ocr-sync
- nfcps-study-reader (legacy/compatibility)
- nfcps-study-lens
- nfcps-academic-ui-assets-v3
- nfcps-native-page

Past Questions:
- nfcps-past-question-upload
- nfcps-past-questions
- nfcps-past-question-browser
- nfcps-past-question-sync

PCT special:
- nfcps-pct203-ocr
- nfcps-pct203-normalize-test
- nfcps-pct203-normalize-store

Probes/experiments:
- nfcps-drive-probe
- nfcps-file-probe
- nfcps-native-page-probe
- nfcps-structured-probe
- nfcps-flow-page

Do not delete probe functions until replacement behaviour is verified and live dependencies are searched.

---

# 61. Past Questions implementation details and matching rules

Past Questions is not just a downloadable folder. It was designed to influence studying on the current page.

Current source set came from 8 unique source documents. Some are scan-heavy. Question extraction combined machine parsing with visual/manual verification where OCR could not safely recover printed questions.

Rules that matter:
- tag course from printed evidence on the exam page, not compilation filename
- one compilation can contain multiple course codes/years
- do not use handwritten student answers as authoritative question text unless clearly part of the printed exam
- actual Past Questions must be labelled actual
- AI/inferred questions must be labelled predictions/likely questions
- never silently present a generated question as historical evidence

Study Lens matching was tightened after generic token matches produced irrelevant questions. Generic terms such as “contain/contains/present/important/common/major/main” were removed from meaningful matching. Cross-course matches need stronger phrase/distinctive-token evidence.

Near-duplicate actual questions are grouped/deduped with recurrence/year information rather than flooding the page.

The user’s desired experience:
- while reading a page, relevant actual questions can surface
- predicted questions remain separate
- “Ask this handout” is grounded in current material/page/indexed evidence
- if the evidence is not present, say so

---

# 62. Non-Academic product detail that must survive future work

## 62.1 Digital reading

Historical capabilities include:
- resume
- chapters/TOC
- search
- bookmarks/favourites
- highlights
- margin notes
- page/scroll modes
- typography/spacing/margins/brightness/colour/themes
- offline cache
- saved position
- retry/unavailable handling
- page-turn sound

Reading intelligence experiments also included Explain/Scripture/Reflect, reading paths, quote cards, Reading Rooms and read-to-Watch bridges. Some require reconnection; do not claim live without tracing current imports/routes.

## 62.2 Physical borrowing

Keep:
- 24-hour reservation
- 30-day loan
- one 30-day renewal
- waitlist restrictions
- overdue blocking/reminders
- self-confirmed pickup/return where safe

## 62.3 Watch

Separate from Movies. Historically includes:
- sermon feed
- trusted sources
- Continue
- For You
- Live
- Shorts
- saves/history
- follows
- topic discovery
- transcript/summary/chapter/Scripture intelligence when available

Do not hide transcript absence. “Ask this sermon” must be evidence-backed.

## 62.4 Movies/Cinema

Separate media product with Christian movie catalogue, premieres, carousels, children/family grouping and Watch Together integration.

## 62.5 Watch Together

Desired/implemented concepts:
- create/join room
- share NFCPS HTTPS room link
- active-room continuation
- host play/pause/seek
- guest resync
- presence
- chat/prayer/Scripture messages
- reactions
- leave/end/expiry
- deep-link into installed Android app where supported

Open risks: iPhone behaviour, realtime/playback edge cases, PiP/background continuity.

## 62.6 Family/Welfare

Family is not public social networking. It is fellowship care.

Keep privacy rules:
- consent before contact sharing
- authorised welfare roles
- private requests remain private
- WhatsApp follow-up only where permitted
- no inferred distress from inactivity

## 62.7 Publish/admin

Role-based workspace, not universal admin. Preserve access requests, approval, drafts, review, publishing, audience rules, revocation/suspension and audit history.

Historical gap: complete announcement edit/update/version flow.

## 62.8 Notifications

Distinguish:
- OS permission
- subscription/topic state
- server send success
- actual delivery
- persistent inbox (not fully established)

Do not claim a phone notification worked because a publish request returned 200.

## 62.9 Moments

Devotional encouragement/reminders. Cadence + quiet hours + verse/book excerpt options. Not a photo-memory feature.

## 62.10 Wings

Historically invitations/targeting and WhatsApp join links more than a full in-app membership engine. Do not invent complete wing membership unless built.

---

# 63. Hosting/build incidents and regression history

These incidents are important because they explain why the project now uses narrow compatibility patches.

- AppDeploy cron unreliability contributed to moving feed automation to GitHub Actions.
- AppDeploy limits/branding pressure contributed to host experiments.
- Hatchable migration broke Watch, Family and auth paths.
- Vercel catch-all rewrite to Render caused a black screen.
- Stable-origin redirect made Android open Chrome first.
- Supabase HTML reader in iframe was sandboxed/blank.
- Render free cold starts caused ~30-second reader open times.
- several Render OCR services have exceeded memory and auto-restarted under high concurrency.
- GitHub Actions in the source repo repeatedly failed on 2 October for library validation, Android origin handoff, APK/public packaging and standalone frontend validation.
- Google Drive blocked/restricted APK distribution, confirming GitHub Releases/static delivery is preferable for updates.
- AppDeploy credits were low during October; do not make a critical production path depend on assuming unlimited AppDeploy credits.

Always verify the real installed-app path after deployment. Backend success is not enough.

---

# 64. Tool and connector runbook for a future ChatGPT account

The project was built through connected tools. A new account should connect/use the tools below rather than forcing the user to repeat history.

## 64.1 GitHub

Use for:
- public compatibility repo
- workflow inspection
- bootstrap/update manifests
- releases
- private source repo if connected
- generated branches

Public repo:
`okoyeDelight/Nfcps-book-library`

Historical/private source repo:
`Nfcps-book-library-source`

Never assume the sparse public repo is the whole app source.

## 64.2 Supabase

Use for:
- current data counts
- schema/functions
- Edge Function source
- cron
- Storage
- Academic/Past Questions/Family/Cinema/Books/Watch Together

Project ref:
`fuusztcioodflmgqawyl`

## 64.3 Vercel

Use for:
- stable origin
- current CDN routing version
- narrow JS/CSS reader patch

Never stage/publish a catch-all route without explicit necessity and rollback plan.

## 64.4 Render

Use for:
- legacy/static reader bases
- OCR/image rendering workers

Search every live URL reference before deleting a service.

## 64.5 Google Drive

Use for:
- SOPA Academic source
- private Past Question sources where permission exists

Do not expose Drive UI to students.

## 64.6 Files/Library

Continuity docs exist in the user’s file library too, including this master handoff and `NFCPS-feature-map-and-UI-plan.md`. The repo copy should be treated as the public source of continuity going forward.

## 64.7 Browser/web checks

Use to verify public pages and screenshots, but do not mistake browser HTML success for installed Android/PWA behaviour.

---

# 65. First 15 checks another agent should run before changing anything

1. Read this entire file.
2. Inspect `nfcps-bootstrap.json` and `nfcps-update.json` in the public repo.
3. Open the stable Vercel origin and installed-path `/exact/`.
4. Query current Vercel route version/rules.
5. Confirm Academic JS/CSS rewrites still point to `nfcps-academic-ui-assets-v3`.
6. Fetch current `nfcps-academic-ui-assets-v3` source.
7. Fetch current `nfcps-native-page` source.
8. Query `nfcps_academic_materials` counts.
9. Query `nfcps_academic_page_index` counts/states.
10. Query `nfcps_drive_sync_folders` due/never-checked state.
11. Query `cron.job` for NFCPS schedules.
12. List Render NFCPS services and search dependencies before deletion.
13. If changing Watch/Family/auth, inspect private source/AppDeploy/Hatchable historical implementations first.
14. Test the exact user-visible path on mobile after deployment.
15. Update this handoff in the same work session.

---

# 66. Current truth vs target — do not confuse them

## Live/current truth

- Stable Vercel app is patched through two CDN asset rewrites.
- `nfcps-academic-ui-assets-v3` is the current Academic frontend injection point.
- `nfcps-native-page` is the current structured page extractor.
- MuPDF StructuredText extraction is live.
- 469 Academic file rows are ready.
- 3,887 pages are indexed.
- OCR backlog remains but reading should not be gated on OCR.
- all 324 tracked Drive folders have been checked.
- 4 course nodes still have folders but no file rows and need investigation.

## Target truth

The target Academic reader is **not yet fully finished** until:
- absolute-position source HTML is transformed into semantic blocks
- text sits naturally on the cream NFCPS surface, not a reconstructed “paper rectangle”
- font-size changes truly repaginate/reflow
- tables/formulas/superscripts survive
- diagrams/images remain correctly located
- slide 2-up is polished
- scan-only pages have a graceful native/fallback path
- all 200–500 level course nodes expose expected materials
- no “still preparing” blocks readable source content

Do not claim the target is complete just because `nfcps-native-page` returns HTML.

---

# 67. Public-repo safety rule

This handoff intentionally documents architecture and identifiers that are safe/useful for continuity, but **never commit secret values**.

Do not write into this file:
- service-role key
- sync tokens
- OCR tokens
- Android keystore/signing secret
- Firebase server credentials
- private WhatsApp/contact data
- OAuth refresh tokens
- GitHub/Vercel/Render API tokens
- private Drive auth

Instead write the secret **name/purpose/location** and retrieve it through connected platform settings when needed.

---

# 68. Continuity promise

A future account should be able to pick up NFCPS One without asking “what is this app?” or rebuilding it from a clean slate.

The correct behaviour is:
- read this file
- inspect current production
- understand why past approaches were rejected
- preserve users and the current shell
- make the smallest verified change
- state what is still broken
- update this file immediately

This document is deliberately more detailed than a normal README because NFCPS One has been built across multiple hosts, code generations and ChatGPT sessions. Losing the reasoning is as dangerous as losing the code.


---

# 69. Public repository tree audit — 6 October 2026, 18:20 WAT

The public compatibility repository was re-audited after this master handoff was committed.

Current root:
- `.github/`
- `NFCPS_ONE_MASTER_HANDOFF.md` — canonical whole-product continuity document; read first
- `NFCPS_ACADEMIC_HANDOFF_CURRENT.md` — specialised Academic companion
- `README.md` — now points maintainers to this master handoff first
- `academic-reader/` — maintainable Academic reader source/architecture
- `nfcps-bootstrap.json`
- `nfcps-bootstrap-v2.json`
- `nfcps-update.json`

Current public workflows:
- `.github/workflows/watch-crawler.yml`
- `.github/workflows/movie-crawler.yml`
- `.github/workflows/publish-cinema-web.yml`
- `.github/workflows/publish-apk-raw.yml`

Current `academic-reader/` top-level source:
- `academic-reader/README.md`
- `academic-reader/ARCHITECTURE.md`
- `academic-reader/.env.example`
- `academic-reader/frontend/`
- `academic-reader/supabase/`

Important interpretation:
- The public repo is now the canonical **continuity/release/compatibility** location, but it is still not proof that the entire historical NFCPS app source lives here.
- For non-Academic surfaces, the historical/private source repo, AppDeploy snapshots, Hatchable compatibility layer, Supabase functions/data and current deployed Vercel bundle may still contain implementation that is not represented as clean source in this public repo.
- Do not conclude that a feature does not exist merely because no corresponding clean source file is visible in this public repository.
- Do not delete hosted services or legacy compatibility code until current production references have been searched and tested.

This appendix was added specifically so a new ChatGPT account can distinguish **repo contents**, **production contents**, **historical source**, and **hosted runtime state** without asking the user to re-explain the project.


---

# 70. 10 October 2026 — Academic Intelligence Company foundation (repository source, not yet live)

**Read Section 1–69 first; this is a non-destructive continuity delta.** The student-facing NFCPS visual identity and the stable app routing are explicit immutable constraints for this work. No parallel replacement app, new APK, iframe, PDF screenshot UI, or rewrite catch-all is authorised.

A new evidence-first "Academic Intelligence Company" foundation is being developed in the *existing* public compatibility repository under \`academic-reader/agentic-company/\`. It is a software organisation, not dozens of independently expensive hosted AI agents. The initial charter defines the board, orchestrator, source librarian, reader-quality engineer, image guardian, calculation auditor, exam officer, tutor, animation studio, security, resource-budget officer, and digital cleaner.

**Implemented in this source change:**
- Pure deterministic source-to-render audit, with page and block identifiers, text consistency, image asset hashes, formula/table checks, ordering and clipping evidence.
- Teaching provenance validation, separating verified source questions from generated predictions; optional animation evidence and clinical review checks.
- Work-ticket prioritiser that forbids paid API, production mutation, and exceeding local compute budgets.
- Regression tests and GitHub Actions quality gate; tests are synthetic and not equivalent to installed-device validation.
- A minimal, UI-preserving reader improvement: retry page/manifest requests in place without reloading NFCPS, and show exam source year/page and explicit prediction captions inside existing visual cards.
- \`academic-reader/supabase/nfcps-academic-ui-assets-v3/index.ts\` has been synchronized to the updated canonical reader component **within GitHub only**.

**Not yet implemented or verified:** production Supabase deployment of this bridge, real mobile visual checks, actual source image/page corpus auditing, autonomous tutoring, Pidgin lesson generation, animations, expanded live intelligence or 24/7 resident agents. No changes to the two current Vercel production routing rules have been made by this work.

**Safe deployment route:** Connect the Supabase project admin, diff and deploy the mirrored \`nfcps-academic-ui-assets-v3\` source, verify live asset bytes and user-visible app behavior, and retain the ability to restore the prior Edge version. Do not claim the app shows this change before that verification. Run Watch/Family/Auth/Publish regressions for any eventual deployment.
