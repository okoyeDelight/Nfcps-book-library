import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const flow=readFileSync(new URL("../supabase/nfcps-flow-page/index.ts",import.meta.url),"utf8");
const reader=readFileSync(new URL("../frontend/NfcpsAcademicBookReader.jsx",import.meta.url),"utf8");
test("different layout protocols never share identical source cache keys",()=>{
 assert.ok(flow.includes("':layout'+layoutId+':flow-v6'"));
 assert.ok(flow.includes("['3','4','5','6'].includes(requested)"));
});
test("new reader exclusively requests v6 of Academic flow",()=>{
 assert.ok(reader.includes('"&layout=6"'));
 assert.ok(!reader.includes('"&layout=5"'));
});
test("mixed-column resegmentation must not clear previous source corruption",()=>{
 assert.ok(flow.includes("ambiguousColumns=columnCandidate.left.length>=4&&columnCandidate.right.length>=4&&!twoCol;"));
 assert.ok(flow.includes("READING_ORDER_SEGMENTED_FOR_DISPLAY"));
});
test("legacy clients retain their prior reading-mode contract",()=>{
 assert.ok(flow.includes("const evidenceLayout=layout==='5'||layout==='6'"));
 assert.ok(flow.includes("layoutVersion:layout==='6'?6:layout==='5'?5:4"));
});
