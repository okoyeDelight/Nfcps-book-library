/**
 * Limits retry cost and prevents false "OCR complete" claims.
 * Designed for free-tier academic workers: no paid APIs or UI changes.
 */
export const OCR_MAX_ATTEMPTS=5;
export function canRunOcr(status,attempts){
  return status==="pending"&&Number.isFinite(Number(attempts))&&Number(attempts)>=0&&Number(attempts)<OCR_MAX_ATTEMPTS;
}
export function nextOcrState(attempts,successful){
  if(successful)return "ready";
  return Number(attempts)>=OCR_MAX_ATTEMPTS?"needs_review":"pending";
}
export function preservesExistingEvidence(status){
  return status==="ready"||status==="not_needed"||status==="needs_review";
}
