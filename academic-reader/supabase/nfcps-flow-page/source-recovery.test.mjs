import test from "node:test";
import assert from "node:assert/strict";
import {approvedSourceVisual,chooseSourceRecovery} from "./source-recovery.mjs";

const trusted="https://fuusztcioodflmgqawyl.supabase.co/storage/v1/object/public/nfcps-academic-polished/400-level/semester-2/PCH%20402/sample.pdf";
test("good page remains selectable native text with zero UI additions",()=>{
 assert.deepEqual(chooseSourceRecovery({reasons:[],polishedUrl:trusted,pageNo:1}),{
   mode:"native",unreliableText:false,html:null,sourceVisualUrl:null
 });
});
test("ambiguous column layout alone does not force image fallback",()=>{
 assert.equal(chooseSourceRecovery({reasons:["AMBIGUOUS_READING_ORDER"],polishedUrl:trusted,pageNo:1}).mode,"native");
});
test("broken text displays the exact source only as an exceptional recovery",()=>{
 const r=chooseSourceRecovery({reasons:["WORDS_SPLIT_ACROSS_LINES","AMBIGUOUS_READING_ORDER"],polishedUrl:trusted,pageNo:1,title:"Pharmacy"});
 assert.equal(r.mode,"original-source-exception");
 assert.equal(r.unreliableText,true);
 assert.ok(r.html.includes('data-source-recovery="true"'));
 assert.ok(r.html.includes("Original source page 1"));
 assert.ok(r.html.includes("class=\"book-figure\""));
 assert.ok(r.sourceVisualUrl.includes("page=1"));
});
test("blocks arbitrary image hosts or URLs",()=>{
 for(const url of ["javascript:alert(1)","https://evil.com/x.pdf",
   "http://fuusztcioodflmgqawyl.supabase.co/storage/v1/object/public/nfcps-academic-polished/a.pdf",
   "https://fuusztcioodflmgqawyl.supabase.co/storage/v1/object/public/other/a.pdf"]) {
  assert.equal(approvedSourceVisual(url,1),null);
 }
});
test("rejects bad page numbers and source types",()=>{
 assert.equal(approvedSourceVisual(trusted,0),null);
 assert.equal(approvedSourceVisual(trusted,1.5),null);
 assert.equal(approvedSourceVisual(trusted.replace(".pdf",".js"),1),null);
});
test("escapes document titles before HTML insertion",()=>{
 const result=chooseSourceRecovery({reasons:["FRAGMENTED_SOURCE_LINES","SUSPICIOUS_SINGLE_LETTER_TOKENS"],polishedUrl:trusted,pageNo:2,title:'<img onerror="alert(1)">'});
 assert.ok(!result.html.includes('<img onerror'));
 assert.ok(result.html.includes("&lt;img"));
});
test("no trusted source remains native but flags are retained externally",()=>{
 const r=chooseSourceRecovery({reasons:["SUSPICIOUS_SINGLE_LETTER_TOKENS"],polishedUrl:"",pageNo:2});
 assert.equal(r.mode,"native");
});

test("a single heuristic must not replace readable pages",()=>{
 for(const reason of ["WORDS_SPLIT_ACROSS_LINES","FRAGMENTED_SOURCE_LINES","SUSPICIOUS_SINGLE_LETTER_TOKENS"]) {
  assert.equal(chooseSourceRecovery({reasons:[reason],polishedUrl:trusted,pageNo:1}).mode,"native");
 }
});

test("a genuinely empty PDF source page can show the intact original without new UI",()=>{
 const r=chooseSourceRecovery({reasons:[],polishedUrl:trusted,pageNo:3,forceOriginalForBlankPage:true});
 assert.equal(r.mode,"original-source-exception");
 assert.equal(r.unreliableText,true);
 assert.ok(r.html.includes('data-source-recovery="true"'));
});
test("blank-page recovery cannot be triggered without a trusted PDF source",()=>{
 const r=chooseSourceRecovery({forceOriginalForBlankPage:true,polishedUrl:"https://evil.example/p.pdf",pageNo:1});
 assert.equal(r.mode,"native");
});
