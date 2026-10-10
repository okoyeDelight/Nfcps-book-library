import test from "node:test";
import assert from "node:assert/strict";
import {restoreSourceLists} from "./source-list-fidelity.mjs";
const split = s=>restoreSourceLists(s).html;
test("Source 1 splits both the joined third and fourth points without rewriting words",()=>{
 const src="<p>3. Physical characteristics: it gives details about roots, stems, leaves, flowers, fruits and seeds 4. Growth habitat: whether it is a tree or vine</p>";
 const out=split(src);
 assert.match(out,/seeds<\/p><p class="book-source-list"/);
 assert.match(out,/4\. Growth habitat/);
});
test("Source 3 recovers plant Morphology (a) and (b) hierarchy",()=>{
 const src="<p>a)​Habit ( growth form) Herb, shrub (b) Root system :If it’s a Taproot</p>";
 const out=split(src);
 assert.equal((out.match(/class="book-source-list"/g)||[]).length,2);
 assert.ok(out.includes("(b) Root system"));
});
test("Source 3 separates (D) Leaf and (e) Inflorescence from stem paragraph",()=>{
 const src="<p>Type: Erect, Climbing Internal features: woody or solid. (D) Leaf Type: Simple, compound (e) Inflorescene Type: Racemose</p>";
 const out=split(src);
 assert.equal((out.match(/<p/g)||[]).length,3);
 assert.ok(out.includes("(D) Leaf")); assert.ok(out.includes("(e) Inflorescene"));
});
test("Source 4 preserves distinct bullets instead of merging anatomical layers",()=>{
 const out=split("<p>Root Anatomy ●​Epidermis : Outer layer ●​Cortex: Parenchymatous ●​Endodermis: Casparian strips</p>");
 assert.equal((out.match(/<p/g)||[]).length,4);
 assert.ok(out.includes("●​Cortex"));
});
test("Ordinary prose, decimals and scientific symbols remain unmodified",()=>{
 const s="<p>Vitamin B12 costs 3.5 units and has 1.2mg dosage. Phytochemistry studies plants.</p>";
 assert.equal(split(s),s);
});
test("Do not break existing inline formatting, images, or table HTML",()=>{
 const s='<p><strong>(a)</strong> Habit and (b) Root</p><figure><img src="original.svg"></figure>';
 assert.equal(split(s),s);
});
test("Single source item uses preserved original number and hanging indent",()=>{
 const result=restoreSourceLists("<p>2. Family : The family it belongs to</p>");
 assert.equal(result.restoredBoundaries,0);
 assert.match(result.html,/book-source-list/);
});
