import test from "node:test";
import assert from "node:assert/strict";
import {auditAcademicFidelity,auditTeachingArtifact,chooseAgentJob} from "./academic-quality.mjs";

const source=()=>({
  materialId:"bch201",version:"v1",pageCount:2,
  pages:[
    {number:1,pageType:"prose",blocks:[
      {id:"h1",kind:"heading",text:"Drug clearance"},
      {id:"p1",kind:"paragraph",text:"Clearance is volume per time."},
      {id:"e1",kind:"equation",text:"CL = rate/C"}
    ]},
    {number:2,pageType:"diagram",blocks:[
      {id:"f1",kind:"image",assetHash:"sha256:a1"},
      {id:"c1",kind:"caption",text:"Figure 1"}
    ]}
  ]
});
const render=()=>({
  sourcePageCount:2,sourceVersion:"v1",
  deviceChecks:{overflowChecked:true,imageVisibilityChecked:true},
  pages:[
    {sourceNumber:1,blocks:[
      {sourceBlockId:"h1",text:"Drug clearance"},
      {sourceBlockId:"p1",text:"Clearance is volume per time."},
      {sourceBlockId:"e1",text:"CL = rate/C"}
    ]},
    {sourceNumber:2,blocks:[
      {sourceBlockId:"f1",assetHash:"sha256:a1"},
      {sourceBlockId:"c1",text:"Figure 1"}
    ]}
  ]
});
const withIssue=(result, code)=>result.errors.some(x=>x.code===code);

test("a complete source has exact page/image coverage",()=>{
  const r=auditAcademicFidelity(source(),render());
  assert.equal(r.status,"pass");
  assert.deepEqual(r.coverage,{sourcePages:2,representedPages:2,totalBlocks:5,matchedBlocks:5,totalImages:1,matchedImages:1});
});
test("missing pages are detected, even when UI claims the count",()=>{
  const r=render();r.pages.pop();
  const a=auditAcademicFidelity(source(),r);
  assert.ok(withIssue(a,"SOURCE_PAGE_MISSING"));
  assert.ok(withIssue(a,"SOURCE_BLOCK_MISSING"));
});
test("a missing image or mismatched hash fails release",()=>{
  const r=render();r.pages[1].blocks[0].assetHash="sha256:WRONG";
  assert.ok(withIssue(auditAcademicFidelity(source(),r),"IMAGE_ASSET_MISMATCH"));
});
test("a removed source block fails",()=>{
  const r=render();r.pages[0].blocks.splice(1,1);
  assert.ok(withIssue(auditAcademicFidelity(source(),r),"SOURCE_BLOCK_MISSING"));
});
test("reordered source blocks are detected",()=>{
  const r=render();r.pages[0].blocks.reverse();
  assert.ok(withIssue(auditAcademicFidelity(source(),r),"SOURCE_ORDER_CHANGED"));
});
test("changed mathematical expression fails",()=>{
  const r=render();r.pages[0].blocks[2].text="CL = rate * C";
  assert.ok(withIssue(auditAcademicFidelity(source(),r),"FORMULA_CHANGED"));
});
test("visually clipped text fails, without rewriting content",()=>{
  const r=render();r.pages[0].blocks[1].clipped=true;
  assert.ok(withIssue(auditAcademicFidelity(source(),r),"CONTENT_NOT_VISIBLE"));
});
test("unverified device check is review status, not pass",()=>{
  const r=render();r.deviceChecks.overflowChecked=false;
  const a=auditAcademicFidelity(source(),r);
  assert.equal(a.status,"review");
  assert.ok(a.warnings.some(x=>x.code==="VISUAL_DEVICE_CHECK_REQUIRED"));
});
test("source/version mismatch does not pass",()=>{
  const r=render();r.sourceVersion="old";
  assert.ok(withIssue(auditAcademicFidelity(source(),r),"SOURCE_VERSION_MISMATCH"));
});
test("sourced lesson has traceable passages and actual questions",()=>{
  const lesson={materialId:"bch201",sourceVersion:"v1",language:"english",
    evidence:[{page:1,blockId:"p1"}],
    questions:[{kind:"actual",id:"q1",question:"Define clearance"}],
    scientificReviewApproved:true};
  const r=auditTeachingArtifact(lesson,source(),[{id:"q1",question:"Define clearance",verified:true}]);
  assert.equal(r.status,"pass");
});
test("unverified actual past questions are never passed off as evidence",()=>{
  const lesson={materialId:"bch201",sourceVersion:"v1",language:"pidgin",
    evidence:[{page:1,blockId:"p1"}],
    questions:[{kind:"actual",id:"fabricated",question:"What is clearance?"}],
    scientificReviewApproved:true};
  const r=auditTeachingArtifact(lesson,source(),[]);
  assert.equal(r.status,"fail");
  assert.ok(withIssue(r,"UNVERIFIED_ACTUAL_QUESTION"));
});
test("predictions must remain explicit",()=>{
  const lesson={materialId:"bch201",sourceVersion:"v1",language:"english",
    evidence:[{page:1,blockId:"p1"}],
    questions:[{kind:"prediction",question:"Describe this",label:"Actual past question"}]};
  assert.ok(withIssue(auditTeachingArtifact(lesson,source()),"PREDICTION_LABEL_MISSING"));
});
test("unsafe animation and clinical advice block release",()=>{
  const lesson={materialId:"bch201",sourceVersion:"v1",language:"english",
    evidence:[{page:2,blockId:"f1"}],
    animation:{steps:[{at:1}],sourceImageHash:"sha256:a1",sourceImageEdited:true,reviewed:true},
    hasClinicalAdvice:true,clinicalReviewApproved:false};
  const r=auditTeachingArtifact(lesson,source());
  assert.ok(withIssue(r,"ANIMATION_SOURCE_MUTATED"));
  assert.ok(withIssue(r,"CLINICAL_REVIEW_REQUIRED"));
});
test("agents cannot take paid, production, locked, or excessive tasks",()=>{
  const jobs=[
    {id:"paid",owner:"academic-tutor",state:"ready",severity:"critical",requiresPaidApi:true,estimatedLocalMinutes:1},
    {id:"prod",owner:"reader-quality",state:"ready",severity:"critical",writesProduction:true,estimatedLocalMinutes:1},
    {id:"long",owner:"reader-quality",state:"ready",severity:"high",estimatedLocalMinutes:35},
    {id:"locked",owner:"reader-quality",state:"ready",severity:"high",estimatedLocalMinutes:2},
    {id:"free",owner:"image-guardian",state:"ready",severity:"high",estimatedLocalMinutes:3}
  ];
  const pick=chooseAgentJob(jobs,{maxLocalMinutes:20,lockedJobs:[{id:"locked"}]});
  assert.equal(pick.id,"free");
});
test("no eligible task means no autonomous invention",()=>{
  assert.equal(chooseAgentJob([{id:"a",owner:"unknown",state:"ready",estimatedLocalMinutes:1}]),null);
});
