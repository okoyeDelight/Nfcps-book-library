/**
 * Source-text rescue acceptance gate. Mirrors the production SQL condition.
 * A successful native extraction is not a scientific-review pass.
 */
export function nativeSalvageDecision(source={},page={},flow={}){
 const text=String(flow.text??"");
 const reject=reason=>({accept:false,reason,independentlyVerified:false});
 if(source.level===100 || source.polishStatus!=="ready"||
    source.countStatus!=="source_pdf_verified"||
    source.indexStatus!=="complete"||source.sourceVersionMatches!==true||
    !Number.isSafeInteger(Number(source.pageCount))||
    Number(page.pageNumber)<1||Number(page.pageNumber)>Number(source.pageCount))
   return reject("ORIGINAL_PDF_NOT_VERIFIED");
 if(page.ocrStatus!=="pending"||page.auditStatus!=="pending"||
    Number(page.ocrAttempts??0)!==0||String(page.pageText??"").trim().length>=10)
   return reject("SOURCE_PAGE_ALREADY_OWNED");
 if(flow.ok!==true||flow.layoutVersion!==6||
    String(flow.material)!==String(page.materialId)||
    Number(flow.page)!==Number(page.pageNumber)||
    flow.textOrigin!=="native"||flow.renderMode!=="native"||
    flow.unreliableText!==false||flow.needsVisualReview!==false||
    Number(flow.unresolvedImageResources)!==0||!Array.isArray(flow.reviewReasons)||
    flow.reviewReasons.length!==0)
   return reject("NATIVE_SOURCE_NOT_CONFIDENT");
 const letters=(text.match(/[A-Za-z]/g)||[]).length;
 if(text.length<100||text.length>25000||letters<65)
   return reject("INSUFFICIENT_VERIFIABLE_NATIVE_TEXT");
 return {accept:true,reason:"ORIGINAL_NATIVE_TEXT_RECOVERABLE",
   ocrStatus:"not_needed",auditStatus:"pending",
   independentlyVerified:false,sourceTextModified:false};
}
