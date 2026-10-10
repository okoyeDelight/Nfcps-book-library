import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

const root=new URL("../",import.meta.url);
const read=(path)=>readFileSync(new URL(path,root),"utf8");

test("mirrored Academic component parses as JavaScript and matches the bridge exactly",()=>{
  const source=read("frontend/NfcpsAcademicBookReader.jsx");
  assert.doesNotThrow(()=>new Script(source));
  const bridge=read("supabase/nfcps-academic-ui-assets-v3/index.ts");
  const match=bridge.match(/const COMPONENT=([\s\S]+?);\nconst CSS_APPEND=/);
  assert.ok(match,"Canonical bridge component string missing");
  assert.equal(JSON.parse(match[1]),source);
});
test("reader retains the same NFCPS UI classes and warm reading surface",()=>{
  const css=read("frontend/academic-reader.css");
  for(const className of [".academic-book-reader",".academic-book-top",".academic-book-viewport",".academic-book-columns",".academic-book-tools",".academic-book-card",".academic-book-arrow"])
    assert.ok(css.includes(className),className);
  assert.ok(css.includes("#f3eee3"),"Historic cream background missing");
});
test("reader doesn't replace the app, launch external Drive, or discard study tools",()=>{
  const source=read("frontend/NfcpsAcademicBookReader.jsx");
  for(const token of ["setSourcePage", "sourceCount", "fetchFlow", '"understand"', '"ask"', '"exam"', '"recall"', "Actual past questions", "Prediction · ", "manifestRetry", "retryCounter"])
    assert.ok(source.includes(token),token);
  assert.equal(source.includes("location.reload()"),false,"Retry must not reload the whole NFCPS app");
  assert.equal(source.includes("drive.google.com"),false);
});
test("deployment bridge stays narrow and uses the original internal asset host",()=>{
  const bridge=read("supabase/nfcps-academic-ui-assets-v3/index.ts");
  assert.ok(bridge.includes("https://nfcps-faithful-academic-ui.onrender.com/assets/index.js"));
  assert.ok(bridge.includes("https://nfcps-faithful-academic-ui.onrender.com/assets/style.css"));
  assert.ok(bridge.includes("const CSS_APPEND="));
  assert.ok(bridge.includes("reader block not found"));
  assert.equal(bridge.includes("/*"),false,"No catch-all route belongs in bridge");
});
