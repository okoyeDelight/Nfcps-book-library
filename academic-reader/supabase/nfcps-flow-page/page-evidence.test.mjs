import test from "node:test";
import assert from "node:assert/strict";
import {choosePageEvidence} from "./page-evidence.mjs";

test("200-level scan preserves embedded visual, but does not teach without text",()=>{
 const x=choosePageEvidence({nativeText:"",indexedText:"",ocrStatus:"needs_review",auditStatus:"review",embeddedImages:1});
 assert.equal(x.displayMode,"embedded_source_visual");
 assert.equal(x.imagesPreserved,1);
 assert.equal(x.needsStudyReview,true);
 assert.equal(x.trustedText,"");
});
test("300-level native content works despite stale pending OCR index",()=>{
 const x=choosePageEvidence({nativeText:"The complete explanation of chemical bonding and aromaticity is written in the original PDF.",indexedText:"",ocrStatus:"pending",embeddedImages:0});
 assert.equal(x.textOrigin,"native");assert.equal(x.needsStudyReview,false);
});
test("400-level corrupt PDF cannot be used as a teaching source",()=>{
 const x=choosePageEvidence({nativeText:"Epilepsy is a c onvulsive disorders fragment",sourceRecovery:true,embeddedImages:0});
 assert.equal(x.trustedText,"");assert.equal(x.needsStudyReview,true);
});
test("500-level native document works even when OCR is unverified",()=>{
 const x=choosePageEvidence({nativeText:"This page explains the complete management of nephrology principles with a clear source sentence.",ocrStatus:"needs_review",auditStatus:"review"});
 assert.equal(x.textOrigin,"native");assert.equal(x.needsStudyReview,false);
});
test("verified OCR can support original image if native has no readable text",()=>{
 const x=choosePageEvidence({nativeText:"",indexedText:"Verified OCR rendering for a source document with enough original words on the page.",ocrStatus:"ready",auditStatus:"passed",ocrConfidence:86,embeddedImages:1});
 assert.equal(x.textOrigin,"ocr_audit_passed");assert.equal(x.needsStudyReview,false);
});
test("low-confidence OCR cannot be marked safe based on historic passed status",()=>{
 const x=choosePageEvidence({indexedText:"A long explanation where numbers or drug amounts may have been interpreted incorrectly.",ocrStatus:"ready",auditStatus:"passed",ocrConfidence:34});
 assert.equal(x.trustedText,"");assert.equal(x.needsStudyReview,true);
});
test("empty page must not be silently labelled complete",()=>{
 const x=choosePageEvidence({nativeText:"",indexedText:"",embeddedImages:0});
 assert.equal(x.needsStudyReview,true);
});
