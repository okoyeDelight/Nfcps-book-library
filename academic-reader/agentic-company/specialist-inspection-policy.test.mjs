import test from "node:test";
import assert from "node:assert/strict";
import {inspectIndexedPage} from "./specialist-inspection-policy.mjs";
test("failed OCR receives a repair flag not a fictional success",()=>{assert.deepEqual(inspectIndexedPage({pageText:"",ocrStatus:"needs_review",ocrAttempts:5,auditStatus:"review"}).map(x=>x.code),["EXHAUSTED_OCR"]);});
test("historically passed but empty academic text is rejected",()=>{assert.equal(inspectIndexedPage({pageText:"",ocrStatus:"pending",auditStatus:"passed"})[0].code,"UNVERIFIED_PASS_STATUS");});
test("valid native academic text is untouched",()=>{assert.deepEqual(inspectIndexedPage({pageText:"This is a full source paragraph describing pharmacokinetics.",ocrStatus:"not_needed",auditStatus:"passed"}),[]);});
test("out of range count requires independently verified source",()=>{assert.equal(inspectIndexedPage({sourceVerified:true,sourcePageCount:20,pageNumber:21,pageText:"a"}).at(0).code,"OUTSIDE_VERIFIED_SOURCE");assert.deepEqual(inspectIndexedPage({sourceVerified:false,sourcePageCount:3,pageNumber:5,pageText:"a"}),[]);});
test("pending scan page is not labelled a lost source image",()=>{assert.deepEqual(inspectIndexedPage({pageText:"",ocrStatus:"pending",visualUrl:"original-image"}),[]);});
test("ready OCR with no text stays reviewable",()=>{assert.equal(inspectIndexedPage({pageText:"",ocrStatus:"ready"})[0].code,"OCR_READY_WITHOUT_TEXT");});