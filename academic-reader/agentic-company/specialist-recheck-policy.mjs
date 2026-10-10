export function recheckSpecialistFinding(f={}) {
 const textCase=["EXHAUSTED_OCR","OCR_READY_WITHOUT_TEXT","UNVERIFIED_PASS_STATUS"].includes(f.issueCode);
 const adequate=["ready","not_needed"].includes(f.ocrStatus)&&f.auditStatus==="passed"&&String(f.pageText??"").trim().length>=40;
 const count=Number(f.sourcePageCount);
 const rangeCase=f.issueCode==="OUTSIDE_VERIFIED_SOURCE"&&f.verifiedSourceCount===true&&Number.isSafeInteger(count)&&count>0&&Number.isSafeInteger(Number(f.pageNumber))&&Number(f.pageNumber)>=1&&Number(f.pageNumber)<=count;
 const cleared=(textCase&&adequate)||rangeCase;
 return {conditionCleared:cleared,requiresIndependentReview:cleared,verifiedRepair:false,sourceTextModified:false};
}