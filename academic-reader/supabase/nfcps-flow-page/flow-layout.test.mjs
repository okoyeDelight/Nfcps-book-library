import test from "node:test";
import assert from "node:assert/strict";
import {rect,reconstructLines,classifyColumns,orderedEvents,imageCoverage,normalizeForCoverage,readingQuality} from "./flow-layout.mjs";

const part=(text,x,y,w=30,h=12)=>({text,bbox:[x,y,x+w,y+h]});
test("same-row text in different columns never becomes a single sentence",()=>{
 const lines=reconstructLines([part("LEFT text",20,20,80),part("RIGHT text",340,20,90)],600);
 assert.deepEqual(lines.map(x=>x.text),["LEFT text","RIGHT text"]);
});
test("inferred whitespace repairs split words but does not rewrite formulas",()=>{
 assert.equal(reconstructLines([part("Drug",20,20,27),part("clearance",53,20,65)],600)[0].text,"Drug clearance");
 assert.equal(reconstructLines([part("Na",20,20,12),part("+",31,20,6)],600)[0].text,"Na+");
 assert.equal(reconstructLines([part("mg",20,20,20),part("/",39,20,5)],600)[0].text,"mg/");
});
test("line ordering uses source geometry not object collection order",()=>{
 const lines=reconstructLines([part("BOTTOM",20,200),part("TOP",20,20)],600);
 assert.deepEqual(lines.map(x=>x.text),["TOP","BOTTOM"]);
});
test("bullet markers and reference numerals are retained",()=>{
 const lines=reconstructLines([part("•",20,20,6),part("Pharmacology",35,20,100),part("42",20,740,14)],600);
 assert.equal(lines[0].marker,"•");
 assert.equal(lines[0].text,"Pharmacology");
 assert.equal(lines[1].text,"42");
});
test("escapes untrusted source text",()=>{
 const lines=reconstructLines([part("<script>",20,20,75)],600);
 assert.ok(lines[0].html.includes("&lt;script&gt;"));
});
test("recognises real dense two columns with overlapping vertical range",()=>{
 const left=Array.from({length:5},(_,i)=>({x:20,y:20+i*22,w:90,h:12,text:"L"+i}));
 const right=Array.from({length:5},(_,i)=>({x:340,y:20+i*22,w:90,h:12,text:"R"+i}));
 assert.equal(classifyColumns([...left,...right],600).twoColumn,true);
});
test("overlapping source heading forces conservative noncolumn flow",()=>{
 const left=Array.from({length:5},(_,i)=>({x:20,y:20+i*22,w:90,h:12,text:"L"+i}));
 const right=Array.from({length:5},(_,i)=>({x:340,y:20+i*22,w:90,h:12,text:"R"+i}));
 assert.equal(classifyColumns([...left,...right,{x:20,y:45,w:560,h:12,text:"Chapter header"}],600).twoColumn,false);
});
test("right aligned references alone do not create two columns",()=>{
 const left=Array.from({length:8},(_,i)=>({x:20,y:20+i*30,w:530,h:12,text:"Full width material"}));
 const right=Array.from({length:5},(_,i)=>({x:440,y:20+i*30,w:35,h:12,text:"12"}));
 assert.equal(classifyColumns([...left,...right],600).twoColumn,false);
});
test("interleaves diagram events by actual vertical position",()=>{
 const ordered=orderedEvents([{x:20,y:30,text:"before"},{x:20,y:90,text:"after"}],
   [{bbox:{x:20,y:65,w:100,h:30},src:"data:image/png;..."}]);
 assert.deepEqual(ordered.map(x=>x.type),["line","image","line"]);
});
test("image completeness fails if a picture silently disappears",()=>{
 assert.deepEqual(imageCoverage("<img src='one'>",2),{expected:2,rendered:1,complete:false});
});
test("normalization preserves semantic tokens for integrity comparisons",()=>{
 assert.equal(normalizeForCoverage(" Drug   clearance "),normalizeForCoverage("Drugclearance"));
 assert.notEqual(normalizeForCoverage("Na+"),normalizeForCoverage("Na-"));
});
test("rect respects MuPDF array geometry",()=>{
 assert.deepEqual(rect([10,12,25,36]),{x:10,y:12,w:15,h:24});
});

test("scrambled tiny PDF fragments trigger review rather than confident rendering",()=>{
 const rows=Array.from({length:24},(_,i)=>({x:10,y:i*18,h:12,text:i%2?"s":"c"}));
 const result=readingQuality(rows,rows.map(x=>x.text).join(" "));
 assert.equal(result.needsReview,true);
 assert.ok(result.flags.includes("FRAGMENTED_SOURCE_LINES"));
});
test("ordinary prose does not trigger fragmentation warnings",()=>{
 const rows=Array.from({length:20},(_,i)=>({x:10,y:i*20,h:12,text:"Clinical pharmacy principles and therapeutics"}));
 assert.equal(readingQuality(rows,rows.map(x=>x.text).join(" ")).needsReview,false);
});
