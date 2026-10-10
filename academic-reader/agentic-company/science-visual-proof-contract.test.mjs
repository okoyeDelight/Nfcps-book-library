import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const reader=readFileSync(new URL("../frontend/NfcpsAcademicBookReader.jsx",import.meta.url),"utf8");
const proxy=readFileSync(new URL("../supabase/nfcps-academic-ceo-live/index.ts",import.meta.url),"utf8");
const bridge=readFileSync(new URL("../supabase/nfcps-academic-ui-assets-v3/index.ts",import.meta.url),"utf8");
test("Academic reader compiles after figure and proof changes",()=>assert.doesNotThrow(()=>new Function(reader)));
test("student no longer sees CEO Live button or invented CEO conversation overlay",()=>{
 assert.ok(!reader.includes('children:"CEO Live"'));
 assert.ok(!reader.includes("ceoOpen"));
 assert.ok(!reader.includes("CEO Council"));
});
test("original handout figures support pinch zoom pan and spotlight",()=>{
 for(const key of ["figure.book-figure img","pointerStart","pointerMove","figurePointers",
   "figureZoom","figurePan","figureMode","spotlight","radial-gradient","onDoubleClick"])assert.ok(reader.includes(key),key);
 assert.ok(reader.includes("data:image"));
 assert.ok(reader.includes("nfcps-academic-visual"));
});
test("original-page vector graphics remain accessible without generated science facts",()=>{
 assert.ok(reader.includes("sourceVisualBase"));
 assert.ok(reader.includes("Explore complete original page"));
 assert.ok(reader.includes("Original source page"));
 assert.ok(reader.includes("No scientific labels or mechanisms have been invented"));
});
test("source-backed figure reveal is interactive and reversible",()=>{
 assert.ok(reader.includes("figureReveal"));
 assert.ok(reader.includes('type:"range"'));
 assert.ok(reader.includes("Auto-reveal"));
 assert.ok(reader.includes("Pause"));
 assert.ok(reader.includes("clipPath"));
});
test("concept map uses original DOM source lists with no causal graph invention",()=>{
 assert.ok(reader.includes('querySelectorAll("p.book-source-list")'));
 assert.ok(reader.includes("textContent"));
 assert.ok(reader.includes("Interactive concept map"));
 assert.ok(reader.includes("not presented as invented causal steps"));
});
test("agent receipts show actual source and review state instead of fictional heroism",()=>{
 assert.ok(reader.includes("Evidence of Academic agents at work"));
 assert.ok(reader.includes("not repaired"));
 assert.ok(reader.includes("Evidence "));
 assert.ok(proxy.includes('mode==="proof"'));
 assert.ok(proxy.includes("nfcps_academic_work_receipts"));
 assert.ok(!proxy.includes("SUPABASE_SERVICE_ROLE_KEY"));
});
test("baseline Academic styling and tab workflows preserved",()=>{
 assert.ok(bridge.includes("const CSS_APPEND="));
 assert.ok(reader.includes("Reading tools"));
 for(const name of ["understand","ask","exam","recall","reader"])assert.ok(reader.includes('tool==="'+name+'"'));
});

test("PCG morphology provides a source-linked touchable botanical schematic",()=>{
 assert.ok(reader.includes("Interactive plant morphology"));
 assert.ok(reader.includes("plantLessonExcerpt=sourceConcepts.find"));
 assert.ok(reader.includes('viewBox:"0 0 300 345"'));
 for(const part of ["root","stem","leaf","flower"])assert.ok(reader.includes('setPlantFocus("'+part+'")'));
});
test("schematic animation remains distinct from real original figures and scientific growth prediction",()=>{
 assert.ok(reader.includes("Schematic size"));
 assert.ok(reader.includes("Animate schematic"));
 assert.ok(reader.includes("not an original handout image or a biological growth-rate prediction"));
 assert.ok(reader.includes("This text comes from the source"));
});
