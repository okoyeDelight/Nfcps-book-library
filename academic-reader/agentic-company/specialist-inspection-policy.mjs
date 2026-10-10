export function inspectIndexedPage(p={}) {
 const text=String(p.pageText??"").trim();
 const ocr=String(p.ocrStatus??"");
 const audit=String(p.auditStatus??"");
 const attempts=Math.max(0,Number(p.ocrAttempts)||0);
 const count=Number(p.sourcePageCount||0),page=Number(p.pageNumber);
 const findings=[];
 if(p.sourceVerified&&Number.isSafeInteger(count)&&count>0&&Number.isSafeInteger(page)&&(page<1||page>count))
  findings.push({code:"OUTSIDE_VERIFIED_SOURCE",role:"pagination_inspector",severity:"critical"});
 if(audit==="passed"&&(text.length<10||!["ready","not_needed"].includes(ocr)))
  findings.push({code:"UNVERIFIED_PASS_STATUS",role:"security_gatekeeper",severity:"critical"});
 if(ocr==="needs_review"&&attempts>=5&&text.length<10)
  findings.push({code:"EXHAUSTED_OCR",role:"ocr_recovery",severity:"high"});
 if(ocr==="ready"&&text.length<10)
  findings.push({code:"OCR_READY_WITHOUT_TEXT",role:"ocr_recovery",severity:"high"});
 return findings;
}