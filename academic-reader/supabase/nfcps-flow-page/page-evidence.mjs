/**
 * NFCPS Academic page-evidence decision.
 * Do not silently trust OCR pending or previously quarantined text.
 * Native content and all original figures continue to render as before.
 */
export function choosePageEvidence({
  nativeText="",indexedText="",ocrStatus="",auditStatus="",ocrConfidence=null,
  embeddedImages=0,sourceRecovery=false
}={}){
  const native=String(nativeText||"").trim();
  const indexed=String(indexedText||"").trim();
  const imageCount=Number.isInteger(embeddedImages)?Math.max(0,embeddedImages):0;
  const verifiedOCR=ocrStatus==="ready"&&auditStatus==="passed"&&
    Number.isFinite(Number(ocrConfidence))&&Number(ocrConfidence)>=75&&indexed.length>=40;
  const nativeUsable=native.length>=40;
  const trustedText=sourceRecovery?"":nativeUsable?native:verifiedOCR?indexed:"";
  const textOrigin=sourceRecovery?"source_unverified":
    nativeUsable?"native":verifiedOCR?"ocr_audit_passed":"no_verified_text";
  const needsStudyReview=sourceRecovery||!trustedText;
  const displayMode=sourceRecovery?"original-source-exception":
    imageCount>0&&!nativeUsable?"embedded_source_visual":"native";
  return {trustedText,textOrigin,needsStudyReview,displayMode,
    imagesPreserved:imageCount,sourceRecovery,verifiedOCR};
}
