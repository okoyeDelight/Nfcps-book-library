import test from "node:test";
import assert from "node:assert/strict";
import {isEligibleForBootstrap,pickBootstrapBatch,verifyPdfSource,sourceIndexComplete,needsSourceReconciliation,chooseCoverageStage} from "./bootstrap-source-policy.mjs";
const entry=(id,metadata={})=>({drive_id:id,polished_url:"https://valid.example/source.pdf",metadata});
test("only real unindexed documents selected, max three per invocation",()=>{
 const all=Array.from({length:10},(_,i)=>entry("s"+i));
 assert.deepEqual(pickBootstrapBatch(all,new Set(["s0"])).map(x=>x.drive_id),["s1","s2","s3"]);
});
test("temporary failures cool down and retry at most three times",()=>{
 const meta={book_bootstrap_failed:true,book_bootstrap_attempts:1,
    book_bootstrap_failed_at:"2026-10-10T12:00:00.000Z",book_bootstrap_error:"HTTP 503"};
 assert.equal(isEligibleForBootstrap(entry("a",meta),new Set(),Date.parse("2026-10-10T12:01:00Z")),false);
 assert.equal(isEligibleForBootstrap(entry("a",meta),new Set(),Date.parse("2026-10-10T13:00:00Z")),true);
 assert.equal(isEligibleForBootstrap(entry("a",{...meta,book_bootstrap_attempts:3}),new Set(),Date.parse("2026-10-10T13:00:00Z")),false);
});
test("encrypted PDF is never falsely marked good through page-count parsing",()=>{
 assert.equal(isEligibleForBootstrap(entry("x",{book_bootstrap_error:"No password given",book_bootstrap_failed:true}),new Set()),false);
 assert.deepEqual(verifyPdfSource({pageCount:10,encrypted:true,byteCount:1000}),{ok:false,reason:"ENCRYPTED_SOURCE_REQUIRES_OWNER"});
});
test("truncated, giant and page-less documents cannot be indexed as complete",()=>{
 assert.equal(verifyPdfSource({pageCount:10,encrypted:false,byteCount:0}).ok,false);
 assert.equal(verifyPdfSource({pageCount:1500,encrypted:false,byteCount:5000}).ok,false);
 assert.equal(verifyPdfSource({pageCount:20,encrypted:false,byteCount:44*1024*1024}).ok,false);
});
test("normal PDF source count is accepted without external OCR or paid services",()=>{
 assert.deepEqual(verifyPdfSource({pageCount:22,encrypted:false,byteCount:200000}),{ok:true,pageCount:22});
});
test("existing indexed materials cannot be reprocessed by bootstrap",()=>{
 assert.equal(isEligibleForBootstrap(entry("a"),new Set(["a"])),false);
});

test("indexed first page is never mistaken for all source pages",()=>{
 assert.equal(sourceIndexComplete(10,new Set([1])),false);
 assert.equal(needsSourceReconciliation(entry("r",{source_page_count_status:"source_pdf_verified",source_page_count:10}),new Set([1])),true);
});
test("complete source page coverage requires exactly 1..N",()=>{
 assert.equal(sourceIndexComplete(4,new Set([1,2,3,4])),true);
 assert.equal(sourceIndexComplete(4,new Set([1,2,4,5])),false);
 assert.equal(sourceIndexComplete(4,new Set([1,2,3])),false);
});
test("unverified legacy count is not silently accepted as source-complete",()=>{
 assert.equal(needsSourceReconciliation(entry("r",{source_page_count_status:"estimated",source_page_count:10}),new Set([1])),false);
 assert.equal(sourceIndexComplete(0,new Set()),false);
});

test("missing originals are always processed ahead of legacy audit",()=>{
 const materials=[entry("indexed",{source_page_count:2,source_page_count_status:"source_pdf_verified"}),
  entry("missing")];
 const result=chooseCoverageStage(materials,new Set(["indexed"]),new Map([["indexed",new Set([1,2])]]));
 assert.equal(result.stage,"recover_missing");
 assert.deepEqual(result.items.map(x=>x.drive_id),["missing"]);
});
test("after missing queue, legacy index must be verified against original PDF",()=>{
 const materials=[entry("old",{source_page_count:3,source_page_count_status:"source_pdf_verified"}),
  entry("done",{source_page_count:1,source_page_count_status:"source_pdf_verified",source_page_index_status:"complete",source_page_version:"undated"})];
 const result=chooseCoverageStage(materials,new Set(["old","done"]),new Map([["old",new Set([1,2,3])],["done",new Set([1])]]));
 assert.equal(result.stage,"verify_legacy_index");
 assert.deepEqual(result.items.map(x=>x.drive_id),["old"]);
});
test("partial original document recovers even though one page already indexed",()=>{
 const material=entry("partial",{source_page_count:5,source_page_count_status:"source_pdf_verified"});
 const result=chooseCoverageStage([material],new Set(["partial"]),new Map([["partial",new Set([1,2])]]));
 assert.equal(result.stage,"recover_missing");
 assert.equal(result.items[0].drive_id,"partial");
});

test("four populated levels all receive service across consecutive bounded runs",()=>{
 const rows=[200,300,400,500].flatMap(level=>Array.from({length:12},(_,i)=>({...entry(level+"-"+i),level})));
 const indexed=new Set();
 const base=Date.parse("2026-10-10T12:00:00Z");
 const visited=new Set();
 for(let run=0;run<4;run++){
  const selected=pickBootstrapBatch(rows,indexed,base+run*120000);
  assert.equal(selected.length,3);
  for(const item of selected){
   visited.add(item.level);
   indexed.add(item.drive_id);
  }
 }
 assert.deepEqual([...visited].sort((a,b)=>a-b),[200,300,400,500]);
});
test("one level cannot starve every other level despite lexicographic IDs",()=>{
 const rows=[
  ...Array.from({length:50},(_,i)=>({...entry("a"+i),level:200})),
  {...entry("z500"),level:500},
  {...entry("z300"),level:300},
  {...entry("z400"),level:400}
 ];
 const chosen=pickBootstrapBatch(rows,new Set(),Date.parse("2026-10-10T12:00:00Z"));
 assert.equal(chosen.length,3);
 assert.equal(new Set(chosen.map(x=>x.level)).size,3);
 assert.ok(chosen.some(x=>x.level!==200));
});
test("fair batches skip encrypted or exhausted source candidates",()=>{
 const rows=[{...entry("password",{book_bootstrap_error:"No password given"}),level:200},
  {...entry("exhausted",{book_bootstrap_attempts:3}),level:300},
  {...entry("safe"),level:500}];
 const chosen=pickBootstrapBatch(rows,new Set(),Date.parse("2026-10-10T12:00:00Z"));
 assert.deepEqual(chosen.map(x=>x.drive_id),["safe"]);
});
