"""Constrained local coding agent for the mirrored NFCPS Academic Reader.

Uses a locally running Ollama model: no paid API key, no token sent to the model.
It only accepts exact-string edits for a short list of pre-reviewed issues.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend/NfcpsAcademicBookReader.jsx"
MASTER = ROOT.parent / "NFCPS_ONE_MASTER_HANDOFF.md"
ACADEMIC = ROOT.parent / "NFCPS_ACADEMIC_HANDOFF_CURRENT.md"
MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:1.5b")
OLLAMA_URL = "http://127.0.0.1:11434/api/chat"


def choose_issue(source: str):
    """Limit the free model to low-risk, pre-reviewed issues."""
    marker = "const goSource=n=>{"
    if marker in source:
        start = source.index(marker)
        end = source.find(";", source.find("viewportRef.current.scrollLeft=0", start))
        if end != -1:
            snippet = source[start:end + 1]
            if 'setErr("")' not in snippet and "setSourcePage(next)" in snippet:
                return {
                    "id": "clear-stale-page-error",
                    "description": (
                        "A failed page request sets a persistent global error. "
                        "Changing the source page does not clear that error, "
                        "so content can stay hidden even when the next page works. "
                        "Add setErr(\"\") while preserving every navigation action."
                    ),
                    "snippet": snippet,
                }
    for direction in ("prev", "next"):
        needle = f'className:"academic-book-arrow {direction}"'
        if needle in source:
            start = source.index(needle)
            end = source.find("}),", start)
            if end != -1:
                snippet = source[start:end]
                if "aria-label" not in snippet:
                    return {
                        "id": f"label-{direction}-arrow",
                        "description": f"Add an accessible aria-label to the {direction} arrow without changing behavior.",
                        "snippet": snippet,
                    }
    return None


def valid_replacement(source: str, issue: dict, answer: dict) -> str:
    if answer.get("action") != "replace":
        raise ValueError("Model declined or returned an unknown action")
    old, new = answer.get("old"), answer.get("new")
    if not isinstance(old, str) or not isinstance(new, str):
        raise ValueError("Expected JSON strings for old/new")
    if old != issue["snippet"]:
        raise ValueError("Model old text does not match the reviewed scope")
    if not 15 <= len(new) <= len(old) + 160 or old == new:
        raise ValueError("Replacement length/no-op rejected")
    if source.count(old) != 1:
        raise ValueError("Reviewed text is not unique")
    forbidden = (
        "http://", "https://", "fetch(", "import(", "eval(", "Function(",
        "document.cookie", "localStorage", "sessionStorage", "process.env",
        "dangerouslySetInnerHTML",
    )
    if any(x in new and x not in old for x in forbidden):
        raise ValueError("Replacement introduced disallowed behavior")
    if issue["id"] == "clear-stale-page-error":
        required = ("setSourcePage(next)", "setSubPage(0)", "setStudy(null)", "viewportRef.current.scrollLeft=0")
        if 'setErr("")' not in new or not all(x in new for x in required):
            raise ValueError("Replacement does not preserve/reset navigation state")
    elif issue["id"].startswith("label-"):
        if "aria-label:" not in new or 'className:"academic-book-arrow' not in new:
            raise ValueError("Replacement lacks accessible label or drops button")
    else:
        raise ValueError("Unknown issue type")
    return source.replace(old, new, 1)


def ask_local_model(issue: dict, academic: str, master: str):
    prompt = (
        "You are a cautious coding assistant for the existing NFCPS One app. "
        "The code in this public repository is a reference mirror, NOT the live deploy. "
        "Never redesign the reader, discard source pages, use a PDF iframe or screenshot, "
        "add network calls, edit credentials, or touch unrelated features.\n\n"
        "Handoff excerpts:\n" + master[:1700] + "\n" + academic[:1700] + "\n\n"
        "ONE PRE-REVIEWED ISSUE:\n" + issue["description"] + "\n\n"
        "EXACT ORIGINAL CODE SNIPPET:\n" + issue["snippet"] + "\n\n"
        'Return only JSON: {"action":"replace","old":"EXACT ORIGINAL CODE SNIPPET",'
        '"new":"minimal corrected snippet","reason":"one sentence"}. '
        "The old field must be byte-for-byte identical to the exact original code snippet. "
        'If uncertain, return {"action":"skip"}.'
    )
    body = {
        "model": MODEL, "stream": False, "format": "json",
        "messages": [{"role": "user", "content": prompt}],
        "options": {"temperature": 0.05, "num_ctx": 8192, "num_predict": 1000},
    }
    req = urllib.request.Request(
        OLLAMA_URL, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=900) as response:
        data = json.load(response)
    return json.loads(data["message"]["content"])


def main():
    master = MASTER.read_text(encoding="utf-8")
    academic = ACADEMIC.read_text(encoding="utf-8")
    if "MASTER HANDOFF" not in master or "does **not** want a PDF viewer" not in academic:
        raise RuntimeError("Missing NFCPS continuity constraints; refusing to edit")
    source = SOURCE.read_text(encoding="utf-8")
    issue = choose_issue(source)
    if issue is None:
        print("No pre-reviewed small fix remains; no code changes.")
        return 0
    print("Reviewing", issue["id"], "with local", MODEL, "(no paid API)")
    try:
        answer = ask_local_model(issue, academic, master)
        updated = valid_replacement(source, issue, answer)
    except (ValueError, KeyError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        print("No trusted proposal produced:", type(exc).__name__, str(exc)[:300])
        return 0
    SOURCE.write_text(updated, encoding="utf-8")
    print("Proposed source-only fix:", issue["id"], "; human approval mandatory")
    return 0


if __name__ == "__main__":
    sys.exit(main())
