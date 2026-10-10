/**
 * Deterministic acceptance gate for NFCPS Academic sources.
 * A past "passed" audit cannot override missing source pages or pending OCR.
 * No UI changes, no AI models, no material text leaves its source database.
 */
export const FIVE_LEVELS=Object.freeze([100,200,300,400,500]);
export function auditCatalogueMaterials(materials,levels=FIVE_LEVELS){
  const list=Array.isArray(materials)?materials:[];
  const totals=[];
  for(const level of levels){
    const items=list.filter(m=>m?.level===level && m?.ready===true);
    let indexed=0,unknownSource=0,unindexed=0,missingSourcePages=0,
      pendingOcrPages=0,emptyTextPages=0,misleadingPassPages=0,
      reviewPages=0,sourcePageGaps=0;
    for(const material of items){
      const pages=Array.isArray(material?.pages)?material.pages:[];
      if(!pages.length)unindexed++;else indexed++;
      const expected=Number(material?.sourcePageCount);
      if(!Number.isSafeInteger(expected)||expected<1)unknownSource++;
      else{
        const numbered=new Set(pages.map(p=>p?.page).filter(x=>Number.isSafeInteger(x)&&x>0));
        if(numbered.size!==expected || [...numbered].some(n=>n>expected))missingSourcePages++;
        if(pages.length!==numbered.size)sourcePageGaps++;
      }
      for(const page of pages){
        const empty=String(page?.text??"").trim().length<10;
        const pending=["pending","processing","needs_review"].includes(page?.ocrStatus);
        if(empty)emptyTextPages++;
        if(pending)pendingOcrPages++;
        if(page?.auditStatus==="review")reviewPages++;
        if(page?.auditStatus==="passed" && (empty||pending))misleadingPassPages++;
      }
    }
    const flags=[];
    if(!items.length)flags.push("NO_READY_MATERIALS");
    if(unindexed)flags.push("DOCUMENTS_WITHOUT_PAGE_INDEX");
    if(unknownSource)flags.push("UNVERIFIED_SOURCE_PAGE_TOTALS");
    if(missingSourcePages||sourcePageGaps)flags.push("MISSING_OR_DUPLICATE_SOURCE_PAGES");
    if(pendingOcrPages||emptyTextPages)flags.push("SOURCE_TEXT_NOT_VERIFIED");
    if(misleadingPassPages)flags.push("MISLEADING_PREVIOUS_PASS_STATUS");
    if(reviewPages)flags.push("PAGES_REQUIRE_MANUAL_REVIEW");
    totals.push({level,readyMaterials:items.length,indexed,unindexed,
      unknownSource,missingSourcePages,sourcePageGaps,pendingOcrPages,
      emptyTextPages,misleadingPassPages,reviewPages,
      status:flags.length?"blocked":"candidate_for_visual_review",flags});
  }
  return {allFiveVerified:false, // This tool cannot certify actual mobile pixels, images or scientific meaning.
    status:totals.some(x=>x.flags.length)?"blocked":"requires_device_and_academic_review",
    levels:totals};
}
