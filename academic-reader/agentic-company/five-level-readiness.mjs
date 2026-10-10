/**
 * Release readiness for the five NFCPS Academic levels.
 * Never claim "works everywhere" based on testing a single handout.
 * Pure function: runs without cloud permissions, writes, or paid APIs.
 */
export const EXPECTED_LEVELS=Object.freeze([100,200,300,400,500]);
export const DOCUMENT_FAMILIES=Object.freeze(["pdf","office","slides","scan","figure","formula","long"]);
const int=x=>Number.isSafeInteger(x)&&x>=0?x:0;
const str=x=>typeof x==="string"?x:"";
export function assessFiveLevelReadiness(inventory,probes,expected=EXPECTED_LEVELS){
  const items=Array.isArray(inventory)?inventory:[];
  const checks=Array.isArray(probes)?probes:[];
  const rows=[];
  const seenLevels=new Set();
  for(const level of expected){
    if(seenLevels.has(level))continue;
    seenLevels.add(level);
    const item=items.find(v=>v?.level===level);
    const known=int(item?.fileCount), ready=int(item?.readyCount);
    const relevant=checks.filter(x=>x?.level===level);
    const families=[...new Set(relevant.map(x=>str(x?.family)).filter(Boolean))];
    const failures=relevant.filter(x=>
      x.status!==200||x.ok!==true||
      int(x.pageCount)<1||int(x.page)<1||int(x.page)>int(x.pageCount)||
      x.imageCount!==x.renderedImageCount||
      x.needsVisualReview===true||
      x.verifiedInInstalledApp!==true
    );
    const reasons=[];
    if(!known)reasons.push("NO_MATERIALS_FOR_LEVEL");
    if(ready!==known)reasons.push("MATERIALS_NOT_ALL_READY");
    if(!relevant.length)reasons.push("NO_REAL_READER_PROBES");
    if(failures.length)reasons.push("PROBE_FAILED_OR_UNVERIFIED");
    for(const family of DOCUMENT_FAMILIES){
      if(known>0&&!families.includes(family))reasons.push("DOCUMENT_FAMILY_UNTESTED:"+family);
    }
    if(known>0&&int(item?.auditedFileCount)<known)reasons.push("FULL_INVENTORY_NOT_AUDITED");
    rows.push({level,fileCount:known,readyCount:ready,probed:relevant.length,documentFamilies:families,
      failedProbes:failures.length,status:reasons.length?"blocked":"ready",reasons});
  }
  const ready=rows.length===expected.length&&rows.every(r=>r.status==="ready");
  return {status:ready?"ready":"blocked",allFiveCertified:ready,levels:rows};
}
