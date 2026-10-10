import test from "node:test";
import assert from "node:assert/strict";
import {auditCatalogueMaterials,FIVE_LEVELS} from "./catalogue-fidelity.mjs";
test("checks every academic level even when one is empty",()=>{
 const r=auditCatalogueMaterials([{level:200,ready:true,sourcePageCount:1,pages:[{page:1,text:"A complete explanatory paragraph",ocrStatus:"not_needed",auditStatus:"passed"}]}]);
 assert.deepEqual(r.levels.map(x=>x.level),FIVE_LEVELS);
 assert.ok(r.levels.find(x=>x.level===100).flags.includes("NO_READY_MATERIALS"));
});
test("previous pass cannot hide empty OCR-pending pages",()=>{
 const m={level:400,ready:true,sourcePageCount:1,pages:[{page:1,text:"",ocrStatus:"pending",auditStatus:"passed"}]};
 const r=auditCatalogueMaterials([m]);const d=r.levels.find(x=>x.level===400);
 assert.equal(d.misleadingPassPages,1);
 assert.ok(d.flags.includes("MISLEADING_PREVIOUS_PASS_STATUS"));
});
test("indexing only the first page does not mark source as complete",()=>{
 const m={level:500,ready:true,sourcePageCount:50,pages:[{page:1,text:"An explanation of drug metabolism",ocrStatus:"not_needed",auditStatus:"passed"}]};
 const r=auditCatalogueMaterials([m]).levels.find(x=>x.level===500);
 assert.equal(r.missingSourcePages,1);
});
test("duplicate and out-of-range source page numbers are flagged",()=>{
 const m={level:200,ready:true,sourcePageCount:2,pages:[{page:1,text:"a"},{page:1,text:"b"},{page:8,text:"c"}]};
 const r=auditCatalogueMaterials([m]).levels.find(x=>x.level===200);
 assert.equal(r.sourcePageGaps,1);assert.equal(r.missingSourcePages,1);
});
test("unknown source page count does not produce success",()=>{
 const m={level:300,ready:true,sourcePageCount:null,pages:[{page:1,text:"Biochemistry principles",auditStatus:"passed"}]};
 const r=auditCatalogueMaterials([m]).levels.find(x=>x.level===300);
 assert.equal(r.unknownSource,1);
});
test("candidate materials still cannot be declared device or scientific verified",()=>{
 const list=FIVE_LEVELS.map(level=>({level,ready:true,sourcePageCount:1,pages:[{page:1,text:"An entire academic reading paragraph",ocrStatus:"not_needed",auditStatus:"passed"}]}));
 const result=auditCatalogueMaterials(list);
 assert.equal(result.allFiveVerified,false);
 assert.equal(result.status,"requires_device_and_academic_review");
});
