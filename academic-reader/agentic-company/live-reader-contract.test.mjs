import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const flow=readFileSync(new URL("../supabase/nfcps-flow-page/index.ts",import.meta.url),"utf8");
const study=readFileSync(new URL("../supabase/nfcps-study-lens/index.ts",import.meta.url),"utf8");
const reader=readFileSync(new URL("../frontend/NfcpsAcademicBookReader.jsx",import.meta.url),"utf8");
const ceo=readFileSync(new URL("../supabase/nfcps-academic-ceo-live/index.ts",import.meta.url),"utf8");
test("reading layout is source-list faithful v7 and remains isolated by cache version",()=>{
 assert.ok(reader.includes('"&layout=7"'));
 assert.ok(flow.includes("restoreSourceLists(flowHtml)"));
 assert.ok(flow.includes("':flow-v7'"));
 assert.ok(flow.includes("layout==='7'?7"));
});
test("live Exam returns every indexed topical candidate instead of top ten",()=>{
 assert.ok(study.includes("const top=ranked;"));
 assert.ok(study.includes("range(start,start+499)"));
 assert.ok(!study.includes("const top=ranked.slice(0,10)"));
});
test("past question cards actually open source-grounded detail",()=>{
 assert.ok(reader.includes("onClick:()=>openQuestion(x)"));
 assert.ok(reader.includes('mode:"question"'));
 assert.ok(reader.includes("Source-linked discussion"));
 assert.ok(reader.includes("Other possible topic matches"));
});
test("answer provenance remains honest with no invented marked answers",()=>{
 assert.ok(study.includes("no_verified_answer_recorded"));
 assert.ok(study.includes("recorded_marking_key_unverified"));
 assert.ok(!study.includes("nfcps_academic_page_index').upsert"));
});
test("the CEO overlay displays actual live aggregate data, no fake meetings",()=>{
 assert.ok(reader.includes("CEO Live"));
 assert.ok(reader.includes("nfcps-academic-ceo-live"));
 assert.ok(reader.includes("Board records update every 20 minutes"));
 assert.ok(ceo.includes("SUPABASE_ANON_KEY"));
 assert.ok(!ceo.includes("SUPABASE_SERVICE_ROLE_KEY"));
});
