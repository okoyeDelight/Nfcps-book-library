import test from "node:test";
import assert from "node:assert/strict";
import {isEligibleForBootstrap,pickBootstrapBatch,verifyPdfSource} from "./bootstrap-source-policy.mjs";
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
