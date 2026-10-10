import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=new URL("../supabase/nfcps-study-lens/index.ts",import.meta.url);
const source=readFileSync(file,"utf8");

test("Study tools cannot overwrite indexed source pages",()=>{
 assert.ok(!source.includes("nfcps_academic_page_index').upsert("));
 assert.ok(!source.includes("nfcps_academic_page_index').insert("));
 assert.ok(!source.includes("nfcps_academic_page_index').update("));
});
test("Ask evidence originates in verified source pages",()=>{
 assert.ok(source.includes(".eq('audit_status','passed')"));
 assert.ok(source.includes(".in('ocr_status',['ready','not_needed'])"));
 assert.ok(!source.includes("body.contexts.slice("));
});
test("unverified current-page text is explicitly provisional",()=>{
 assert.ok(source.includes("Provisional reading extract"));
 assert.ok(source.includes("requiresSourceReview:!verifiedContexts"));
 assert.ok(source.includes("sourceGrounded:verifiedContexts"));
});
test("Study summaries do not falsely claim to be independently grounded",()=>{
 assert.ok(source.includes("guide.sourceGrounded=false"));
});
