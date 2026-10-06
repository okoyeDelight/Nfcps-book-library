# Academic Reader Architecture

## 1. Ingestion

Google Drive materials are discovered and polished into a stable PDF representation. PPTX/DOCX files may be converted to PDF as an intermediate representation.

The PDF is **not the user interface**.

## 2. Native page reconstruction

`nfcps-native-page` opens the polished PDF with MuPDF and extracts structured text with styles, images, vectors and positions.

The API returns:
- page dimensions
- page count
- layout hint (document/slides)
- native HTML
- plain text for Study Lens

The frontend renders that HTML inside NFCPS.

## 3. Reader

`NfcpsAcademicBookReader`:
- opens from a lightweight manifest
- fetches only the current page
- prefetches neighboring pages
- renders 1 page or 2 slides
- supports pinch zoom/pan
- provides a separate reflowed Reading mode
- shows Page X of N
- keeps Study tools attached to the current page

## 4. Study intelligence

`nfcps-study-lens` uses the current page text plus indexed handout pages and the verified past-question bank.

Actual past questions and predicted questions must remain separate.

## 5. Progressive enhancement

A document must be readable before OCR finishes.

Digitally-created PDFs use extracted native text/images directly.

Scanned pages may initially rely on the scan while OCR improves search, Reading mode and AI features in the background.

## 6. Performance

Do not fetch or convert an entire handout on every open.

Open manifest -> current page -> prefetch adjacent pages.

Cache native-page responses by material/page/version.

## 7. Current production bridge

The production app still consumes a compiled JS bundle whose Academic reader block is replaced through the `nfcps-academic-ui-assets-v3` bridge.

This bridge should eventually be retired when the full NFCPS frontend source is moved into this repository.
