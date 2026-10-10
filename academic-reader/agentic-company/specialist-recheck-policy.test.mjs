import test from "node:test";
import assert from "node:assert/strict";
import {recheckSpecialistFinding} from "./specialist-recheck-policy.mjs";
test("failed OCR stays assigned without real source text",()=>{
 const x=recheckSpecialistFinding({issueCode:"EXHAUSTED_OCR",ocrStatus:"needs_review",auditStatus:"review",pageText:""});
 assert.equal(x.conditionCleared,false);assert.equal(x.verifiedRepair,false);
});
test("properly restored OCR requests human review, not final success",()=>{
 const x=recheckSpecialistFinding({issueCode:"OCR_READY_WITHOUT_TEXT",ocrStatus:"ready",auditStatus:"passed",pageText:"An original academic source paragraph which exceeds forty characters."});
 assert.equal(x.conditionCleared,true);assert.equal(x.requiresIndependentReview,true);assert.equal(x.verifiedRepair,false);
});
test("plain reclassification from failed to pending is not a repair",()=>{
 assert.equal(recheckSpecialistFinding({issueCode:"EXHAUSTED_OCR",ocrStatus:"pending",auditStatus:"review",pageText:""}).conditionCleared,false);
});
test("source count must be independently verified",()=>{
 const f={issueCode:"OUTSIDE_VERIFIED_SOURCE",sourcePageCount:22,pageNumber:19};
 assert.equal(recheckSpecialistFinding({...f,verifiedSourceCount:false}).conditionCleared,false);
 assert.equal(recheckSpecialistFinding({...f,verifiedSourceCount:true}).conditionCleared,true);
 assert.equal(recheckSpecialistFinding({...f,verifiedSourceCount:true,pageNumber:25}).conditionCleared,false);
});
test("unrecognized issue cannot automatically close",()=>{assert.equal(recheckSpecialistFinding({issueCode:"UNKNOWN"}).verifiedRepair,false);});
