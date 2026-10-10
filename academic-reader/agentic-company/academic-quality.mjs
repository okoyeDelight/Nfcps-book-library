/**
 * NFCPS Academic truth/quality engine v0.1.
 * Pure, deterministic, privacy-preserving. Never modifies source documents.
 * Evidence completeness != teaching truth, mobile UX, or deployment parity.
 */

const kinds = new Set(["heading","paragraph","list","bullet","table","figure","image","caption","formula","equation","callout","scan","spacer"]);
const concerns = new Set(["prose","slide","diagram","table","scan"]);
const asString = (x) => typeof x === "string" ? x : "";
const asArray = (x) => Array.isArray(x) ? x : [];
const number = (x) => Number.isSafeInteger(x) ? x : -1;
const ids = (rows, key) => new Set(asArray(rows).map(x => asString(x?.[key])).filter(Boolean));
const issue = (code, detail, severity="error", info={}) => ({code, detail, severity, ...info});

export function auditAcademicFidelity(source, rendered) {
  const errors=[], warnings=[];
  const problem = (code, detail, severity="error", info={}) =>
    (severity === "warning" ? warnings : errors).push(issue(code,detail,severity,info));
  const sourcePages=asArray(source?.pages);
  const renderedPages=asArray(rendered?.pages);
  const expected=number(source?.pageCount);
  if(!asString(source?.materialId) || !asString(source?.version)) problem("SOURCE_IDENTITY_MISSING","Source material ID/version required");
  if(expected<1) problem("SOURCE_PAGE_COUNT_INVALID","Source page count must be a positive integer");
  if(sourcePages.length!==expected) problem("SOURCE_MANIFEST_INCOMPLETE","Not all source pages are inventoried");
  if(number(rendered?.sourcePageCount)!==expected) problem("PAGE_COUNT_MISMATCH","Reader reports a different source page count");
  if(!asString(rendered?.sourceVersion) || rendered.sourceVersion!==source?.version) problem("SOURCE_VERSION_MISMATCH","Rendered content does not match immutable source version");
  const originals=new Map();
  let totalBlocks=0, matchedBlocks=0,totalImages=0,matchedImages=0;
  for(const sp of sourcePages) {
    const page=number(sp?.number);
    if(page<1 || page>expected || originals.has(page)) {
      problem("SOURCE_PAGE_NUMBER_INVALID","Missing, duplicate or out-of-range source page", "error",{page});
      continue;
    }
    const blockMap=new Map();
    for(const block of asArray(sp.blocks)) {
      const id=asString(block?.id),kind=asString(block?.kind).toLowerCase();
      if(!id || blockMap.has(id)) { problem("SOURCE_BLOCK_ID_INVALID","Duplicate or missing source block ID","error",{page,id});continue; }
      if(!kinds.has(kind)) {problem("BLOCK_KIND_UNKNOWN","Unrecognised source block kind requires manual review","warning",{page,id,kind});}
      if(["image","figure","scan"].includes(kind)) {
        totalImages++;
        if(!asString(block?.assetHash)) problem("SOURCE_IMAGE_HASH_MISSING","Cannot verify image without a stable asset hash","error",{page,id});
      }
      blockMap.set(id,block);
      totalBlocks++;
    }
    originals.set(page,blockMap);
    if(!concerns.has(asString(sp?.pageType))) problem("PAGE_TYPE_UNKNOWN","Page type needs classification","warning",{page});
  }
  const seen=new Map(), renderPageNumbers=new Set(), lastByPage=new Map();
  for(const rp of renderedPages) {
    const page=number(rp?.sourceNumber);
    if(page<1 || page>expected || !originals.has(page)) {
      problem("RENDER_PAGE_UNMATCHED","Reader content maps to an invalid source page","error",{page}); continue;
    }
    renderPageNumbers.add(page);
    const original=originals.get(page);
    const orderedIds=[...original.keys()];
    let last=lastByPage.get(page)??-1;
    for(const rb of asArray(rp.blocks)) {
      const id=asString(rb?.sourceBlockId);
      const src=original.get(id);
      if(!src) {problem("RENDER_BLOCK_UNMATCHED","Reader block not found in the same source page","error",{page,id});continue;}
      const firstAppearance=!seen.has(page+":"+id);
      if(!firstAppearance) problem("RENDER_BLOCK_DUPLICATED","A source block was rendered more than once","warning",{page,id});
      else {seen.set(page+":"+id,true);matchedBlocks++;}
      const index=orderedIds.indexOf(id);
      if(index<last) problem("SOURCE_ORDER_CHANGED","Blocks appear in a different order than the source","error",{page,id});
      last=index;
      lastByPage.set(page,last);
      const kind=asString(src.kind).toLowerCase();
      if(["image","figure","scan"].includes(kind)) {
        if(!rb.assetHash || rb.assetHash!==src.assetHash) problem("IMAGE_ASSET_MISMATCH","Rendered image hash differs or is missing","error",{page,id});
        else if(firstAppearance) matchedImages++;
      } else if(typeof src.text==="string" && src.text.replace(/\s+/g," ").trim()!==asString(rb.text).replace(/\s+/g," ").trim()) {
        problem("SOURCE_TEXT_CHANGED","Rendered text differs from the authoritative source","error",{page,id});
      }
      if(rb.clipped === true || rb.visible === false) problem("CONTENT_NOT_VISIBLE","Source block is clipped or hidden","error",{page,id});
      if(["formula","equation"].includes(kind) && asString(rb?.text)!==asString(src?.text)) problem("FORMULA_CHANGED","Equation differs from the source text","error",{page,id});
      if(kind==="table" && asString(rb?.structureHash)!==asString(src?.structureHash)) problem("TABLE_STRUCTURE_CHANGED","Table structure has changed","error",{page,id});
    }
  }
  for(const [page,blocks] of originals) {
    if(!renderPageNumbers.has(page)) problem("SOURCE_PAGE_MISSING","No reader content represents this source page","error",{page});
    for(const [id] of blocks) if(!seen.has(page+":"+id)) problem("SOURCE_BLOCK_MISSING","Source block not represented in the reader","error",{page,id});
  }
  if(rendered?.deviceChecks?.overflowChecked!==true || rendered?.deviceChecks?.imageVisibilityChecked!==true) {
    problem("VISUAL_DEVICE_CHECK_REQUIRED","Actual mobile clipping and image visibility have not been verified","warning");
  }
  const status=errors.length?"fail":warnings.length?"review":"pass";
  return {status,errors,warnings,coverage:{sourcePages:sourcePages.length,representedPages:renderPageNumbers.size,totalBlocks,matchedBlocks,totalImages,matchedImages}};
}

/** Validate provenance and safeguards for a prepared lesson, not its scientific truth. */
export function auditTeachingArtifact(lesson, source, questionBank=[]) {
  const errors=[],warnings=[];
  const problems=(code,detail,sev="error")=>(sev==="warning"?warnings:errors).push(issue(code,detail,sev));
  if(!lesson || lesson.materialId!==source?.materialId || lesson.sourceVersion!==source?.version)
    problems("TEACHING_SOURCE_MISMATCH","Teaching material ID/version does not match evidence");
  if(!["english","pidgin"].includes(lesson?.language))
    problems("LANGUAGE_UNSUPPORTED","Language must be English or Nigerian Pidgin");
  const blockIds=new Set();
  for(const p of asArray(source?.pages)) for(const b of asArray(p.blocks))
    blockIds.add(String(p.number)+":"+asString(b.id));
  if(!asArray(lesson?.evidence).length) problems("EVIDENCE_REQUIRED","No source passage citations");
  for(const e of asArray(lesson?.evidence)) {
    if(!blockIds.has(String(e?.page)+":"+asString(e?.blockId)))
      problems("EVIDENCE_NOT_IN_SOURCE","Cited passage not found in immutable source");
  }
  const bank=new Map(asArray(questionBank).map(q=>[asString(q.id),q]));
  for(const q of asArray(lesson?.questions)) {
    if(q?.kind==="actual") {
      const original=bank.get(asString(q.id));
      if(!original || original?.verified!==true || asString(q?.question)!==asString(original?.question)) {
        problems("UNVERIFIED_ACTUAL_QUESTION","Actual questions must have verified, identical source records");
      }
    } else if(q?.kind!=="prediction") problems("QUESTION_KIND_UNKNOWN","Question type must be actual or prediction");
    if(q?.kind==="prediction" && q?.label!=="Prediction") problems("PREDICTION_LABEL_MISSING","Generated questions must be labelled Prediction");
  }
  if(asArray(lesson?.animation?.steps).length) {
    if(!asString(lesson?.animation?.sourceImageHash)) problems("ANIMATION_SOURCE_UNLINKED","Animation must cite the exact immutable source image");
    else if(!asArray(source?.pages).some(p=>asArray(p.blocks).some(b=>["image","figure","scan"].includes(b.kind)&&b.assetHash===lesson.animation.sourceImageHash)))
      problems("ANIMATION_IMAGE_UNVERIFIED","Animation source hash is not present in the immutable source");
    if(lesson?.animation?.sourceImageEdited!==false) problems("ANIMATION_SOURCE_MUTATED","Teaching animation cannot alter the underlying source image");
    if(lesson?.animation?.reviewed!==true) problems("ANIMATION_REVIEW_PENDING","Medical/scientific animation needs factual review","warning");
  }
  if(lesson?.hasClinicalAdvice===true && lesson?.clinicalReviewApproved!==true)
    problems("CLINICAL_REVIEW_REQUIRED","Potentially actionable patient or dosing guidance needs professional review");
  if(lesson?.scientificReviewApproved!==true) problems("FACT_REVIEW_PENDING","Evidence provenance is not proof the explanation is correct","warning");
  return {status:errors.length?"fail":warnings.length?"review":"pass",errors,warnings};
}

/** Deterministic prioritization; the LLM never gets to override safety or cost. */
export function chooseAgentJob(jobs, options={}) {
  const lockIds=ids(options?.lockedJobs,"id");
  const order={critical:0,high:1,medium:2,low:3};
  const ceiling=Number.isFinite(options?.maxLocalMinutes)?Math.max(0,options.maxLocalMinutes):20;
  const allowedOwners=new Set(asArray(options?.allowedOwners).length?options.allowedOwners:[
    "reader-quality","image-guardian","calculation-auditor","past-question-guardian",
    "academic-tutor","accessibility","digital-cleaner"
  ]);
  const eligible=asArray(jobs).filter(x=>
    x?.state==="ready" &&
    allowedOwners.has(x?.owner) &&
    !lockIds.has(x?.id) &&
    Number.isFinite(x?.estimatedLocalMinutes) &&
    x.estimatedLocalMinutes>=0 &&
    x.estimatedLocalMinutes<=ceiling &&
    x?.requiresPaidApi!==true &&
    x?.writesProduction!==true
  );
  eligible.sort((a,b)=>
    (order[a.severity]??9)-(order[b.severity]??9) ||
    (a.estimatedLocalMinutes-b.estimatedLocalMinutes) ||
    asString(a.id).localeCompare(asString(b.id))
  );
  return eligible.length ? {...eligible[0]} : null;
}
