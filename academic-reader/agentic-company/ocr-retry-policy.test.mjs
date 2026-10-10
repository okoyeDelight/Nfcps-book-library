import test from "node:test";
import assert from "node:assert/strict";
import {OCR_MAX_ATTEMPTS,canRunOcr,nextOcrState,preservesExistingEvidence} from "./ocr-retry-policy.mjs";
test("no OCR work is spent on completed pages",()=>{
 assert.equal(canRunOcr("ready",0),false);
 assert.equal(canRunOcr("not_needed",0),false);
 assert.equal(canRunOcr("needs_review",0),false);
 assert.equal(preservesExistingEvidence("ready"),true);
});
test("five failures quarantine instead of looping forever",()=>{
 assert.equal(OCR_MAX_ATTEMPTS,5);
 assert.equal(nextOcrState(4,false),"pending");
 assert.equal(nextOcrState(5,false),"needs_review");
 assert.equal(canRunOcr("pending",5),false);
});
test("new pages may be processed while old exhausted pages are skipped",()=>{
 const rows=[{status:"pending",attempts:5},{status:"pending",attempts:0},{status:"pending",attempts:4}];
 assert.deepEqual(rows.filter(x=>canRunOcr(x.status,x.attempts)).map(x=>x.attempts),[0,4]);
});
test("success is not marked until the source OCR operation returns successfully",()=>{
 assert.equal(nextOcrState(3,true),"ready");
 assert.equal(nextOcrState(3,false),"pending");
});
test("unexpected values cannot open unbounded retries",()=>{
 assert.equal(canRunOcr("pending",100),false);
 assert.equal(canRunOcr("pending",-3),false);
 assert.equal(canRunOcr("pending",Number.NaN),false);
});
