import test from "node:test";
import assert from "node:assert/strict";
import {EXPECTED_LEVELS,DOCUMENT_FAMILIES,assessFiveLevelReadiness} from "./five-level-readiness.mjs";
const get=(levels,probes=[])=>assessFiveLevelReadiness(levels,probes);
test("strictly enumerates 100,200,300,400,500",()=>{
 assert.deepEqual(EXPECTED_LEVELS,[100,200,300,400,500]);
});
test("a missing first-year level blocks five-level certification",()=>{
 const r=get([200,300,400,500].map(level=>({level,fileCount:10,readyCount:10,auditedFileCount:10})));
 assert.equal(r.allFiveCertified,false);
 assert.ok(r.levels.find(x=>x.level===100).reasons.includes("NO_MATERIALS_FOR_LEVEL"));
});
test("synthetic passing pages cannot stand in for real installed app tests",()=>{
 const records=EXPECTED_LEVELS.map(level=>({level,fileCount:1,readyCount:1,auditedFileCount:1}));
 const probes=EXPECTED_LEVELS.map(level=>({level,family:"pdf",status:200,ok:true,page:1,pageCount:1,imageCount:0,renderedImageCount:0,needsVisualReview:false}));
 const result=get(records,probes);
 assert.equal(result.allFiveCertified,false);
 assert.ok(result.levels.every(l=>l.reasons.includes("PROBE_FAILED_OR_UNVERIFIED")));
});
test("an unrendered image blocks release even when text is complete",()=>{
 const records=EXPECTED_LEVELS.map(level=>({level,fileCount:1,readyCount:1,auditedFileCount:1}));
 const probes=EXPECTED_LEVELS.map(level=>({level,family:"pdf",status:200,ok:true,page:1,pageCount:1,imageCount:1,renderedImageCount:0,needsVisualReview:false,verifiedInInstalledApp:true}));
 const result=get(records,probes);
 assert.ok(result.levels.every(l=>l.reasons.includes("PROBE_FAILED_OR_UNVERIFIED")));
});
test("all source families and real device checks are necessary",()=>{
 const records=EXPECTED_LEVELS.map(level=>({level,fileCount:7,readyCount:7,auditedFileCount:7}));
 const probes=EXPECTED_LEVELS.flatMap(level=>DOCUMENT_FAMILIES.map(family=>({level,family,status:200,ok:true,page:1,pageCount:4,imageCount:1,renderedImageCount:1,needsVisualReview:false,verifiedInInstalledApp:true})));
 assert.equal(get(records,probes).allFiveCertified,true);
});
test("no audited full material inventory means testing is incomplete",()=>{
 const records=EXPECTED_LEVELS.map(level=>({level,fileCount:8,readyCount:8,auditedFileCount:4}));
 const probes=EXPECTED_LEVELS.flatMap(level=>DOCUMENT_FAMILIES.map(family=>({level,family,status:200,ok:true,page:1,pageCount:4,imageCount:1,renderedImageCount:1,needsVisualReview:false,verifiedInInstalledApp:true})));
 assert.equal(get(records,probes).allFiveCertified,false);
});
test("empty/malformed probes never report a successful release",()=>{
 assert.equal(get(null,null).status,"blocked");
 assert.equal(get([],[]).levels.length,5);
});
