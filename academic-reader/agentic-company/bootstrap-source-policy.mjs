/**
 * Source-safe Academic bootstrap scheduling: never certify unknown PDFs.
 * Selected candidates are verified against the original stored PDF before any
 * placeholder index rows are inserted. No paid API, UI, or app-shell impact.
 */
export const MAX_BOOTSTRAP_BATCH=3;
export const MAX_SOURCE_PAGES=1200;
export const MAX_SOURCE_BYTES=40*1024*1024;
export const MAX_BOOTSTRAP_ATTEMPTS=3;
export const FAILURE_COOLDOWN_MS=30*60*1000;

export function isEligibleForBootstrap(material, indexedIds, nowMs=Date.now()){
  if(!material?.drive_id||!material.polished_url)return false;
  if(indexedIds?.has(material.drive_id))return false;
  const meta=material.metadata||{};
  const attempts=Number(meta.book_bootstrap_attempts||0);
  if(!Number.isSafeInteger(attempts)||attempts<0||attempts>=MAX_BOOTSTRAP_ATTEMPTS)return false;
  const code=String(meta.book_bootstrap_error||"").toLowerCase();
  if(code.includes("encrypted")||code.includes("password")||code.includes("source_requires_owner"))return false;
  if(meta.book_bootstrap_failed===true){
    const when=Date.parse(String(meta.book_bootstrap_failed_at||""));
    if(Number.isFinite(when)&&nowMs-when<FAILURE_COOLDOWN_MS)return false;
  }
  return true;
}
export function pickBootstrapBatch(materials,indexedIds,nowMs=Date.now(),batch=MAX_BOOTSTRAP_BATCH){
  if(!Array.isArray(materials))return [];
  const cap=Math.min(MAX_BOOTSTRAP_BATCH,Math.max(0,Math.floor(Number(batch)||0)));
  if(cap===0)return [];
  // Stable source ordering is fine within one level, but choosing the first
  // three global IDs starves 500-level while earlier IDs are indexed.
  const groups=new Map();
  for(const material of materials){
    if(!isEligibleForBootstrap(material,indexedIds,nowMs))continue;
    const level=Number.isInteger(Number(material.level))?Number(material.level):999;
    if(!groups.has(level))groups.set(level,[]);
    groups.get(level).push(material);
  }
  const levels=[...groups.keys()].sort((a,b)=>a-b);
  if(levels.length===0)return [];
  // Bootstrap runs every two minutes. Rotate which level leads each run.
  // Keep the three-document quota and original ordering inside each level.
  const runNumber=Math.max(0,Math.floor(Number(nowMs)/120000));
  const start=runNumber%levels.length;
  const chosen=[];
  while(chosen.length<cap){
    let progress=false;
    for(let offset=0;offset<levels.length&&chosen.length<cap;offset++){
      const group=groups.get(levels[(start+offset)%levels.length]);
      if(group.length){
        chosen.push(group.shift());
        progress=true;
      }
    }
    if(!progress)break;
  }
  return chosen;
}
export function verifyPdfSource({pageCount,encrypted,byteCount}){
  if(encrypted===true)return {ok:false,reason:"ENCRYPTED_SOURCE_REQUIRES_OWNER"};
  if(!Number.isSafeInteger(byteCount)||byteCount<1||byteCount>MAX_SOURCE_BYTES)
    return {ok:false,reason:"SOURCE_SIZE_UNSUPPORTED"};
  if(!Number.isSafeInteger(pageCount)||pageCount<1||pageCount>MAX_SOURCE_PAGES)
    return {ok:false,reason:"SOURCE_PAGE_COUNT_UNVERIFIED"};
  return {ok:true,pageCount};
}


/**
 * A first page is not an indexed document. Verify the precise one-to-one
 * correspondence with the original PDF page manifest.
 */
export function sourceIndexComplete(expectedPages, pageNumbers){
  if(!Number.isSafeInteger(expectedPages)||expectedPages<1||expectedPages>MAX_SOURCE_PAGES)return false;
  const pages=pageNumbers instanceof Set?pageNumbers:
    new Set(Array.isArray(pageNumbers)?pageNumbers:[]);
  if(pages.size!==expectedPages)return false;
  for(let n=1;n<=expectedPages;n++)if(!pages.has(n))return false;
  return true;
}
export function needsSourceReconciliation(material,indexedPages){
  if(material?.metadata?.source_page_count_status!=="source_pdf_verified")return false;
  const expected=Number(material?.metadata?.source_page_count);
  return !sourceIndexComplete(expected,indexedPages);
}

/**
 * Finish unseen/partial files first; once there are no eligible missing files,
 * independently compare already-indexed legacy files to their source PDFs.
 */
export function chooseCoverageStage(materials,indexedIds,pagesByDoc,nowMs=Date.now()){
 const have=new Set(indexedIds||[]);
 for(const m of materials||[]){
  if(needsSourceReconciliation(m,pagesByDoc?.get(m.drive_id)))have.delete(m.drive_id);
 }
 const missing=pickBootstrapBatch(materials,have,nowMs);
 if(missing.length)return {stage:"recover_missing",items:missing};
 const audited=new Set();
 for(const m of materials||[]){
  const meta=m?.metadata||{};
  const expected=Number(meta.source_page_count);
  if(meta.source_page_count_status==="source_pdf_verified" &&
     meta.source_page_index_status==="complete" &&
     meta.source_page_version===String(m.polished_at||"undated") &&
     sourceIndexComplete(expected,pagesByDoc?.get(m.drive_id)))
    audited.add(m.drive_id);
 }
 return {stage:"verify_legacy_index",items:pickBootstrapBatch(materials,audited,nowMs)};
}
