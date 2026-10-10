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
  return materials.filter(m=>isEligibleForBootstrap(m,indexedIds,nowMs))
    .slice(0,Math.min(MAX_BOOTSTRAP_BATCH,Math.max(0,Math.floor(batch))));
}
export function verifyPdfSource({pageCount,encrypted,byteCount}){
  if(encrypted===true)return {ok:false,reason:"ENCRYPTED_SOURCE_REQUIRES_OWNER"};
  if(!Number.isSafeInteger(byteCount)||byteCount<1||byteCount>MAX_SOURCE_BYTES)
    return {ok:false,reason:"SOURCE_SIZE_UNSUPPORTED"};
  if(!Number.isSafeInteger(pageCount)||pageCount<1||pageCount>MAX_SOURCE_PAGES)
    return {ok:false,reason:"SOURCE_PAGE_COUNT_UNVERIFIED"};
  return {ok:true,pageCount};
}
