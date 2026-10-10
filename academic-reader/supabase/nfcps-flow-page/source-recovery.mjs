/**
 * Exceptional evidence-first fallback for PDFs whose native text is broken.
 * This is not the normal reader: clean material remains native/reflowable.
 * Preserve original source without falsely teaching from corrupted extraction.
 */
const htmlEscape=value=>String(value??"").replace(/&/g,"&amp;")
  .replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export function approvedSourceVisual(polishedUrl,pageNo) {
  if(!Number.isSafeInteger(pageNo)||pageNo<1)return null;
  try {
    const u=new URL(polishedUrl);
    if(u.protocol!=="https:"||u.hostname!=="fuusztcioodflmgqawyl.supabase.co"
      ||!u.pathname.startsWith("/storage/v1/object/public/nfcps-academic-polished/")
      ||!u.pathname.toLowerCase().endsWith(".pdf"))return null;
    return "https://nfcps-academic-visual.onrender.com/page.jpg?url="+
      encodeURIComponent(u.href)+"&page="+pageNo;
  }catch{return null;}
}
export function chooseSourceRecovery({reasons=[],polishedUrl="",pageNo=0,title="",forceOriginalForBlankPage=false}={}) {
  const reasonList=Array.isArray(reasons)?reasons:[];
  const visualUrl=approvedSourceVisual(polishedUrl,pageNo);
  const severe=(reasonList.includes("AMBIGUOUS_READING_ORDER")&&
    (reasonList.includes("WORDS_SPLIT_ACROSS_LINES")||
     reasonList.includes("FRAGMENTED_SOURCE_LINES")))||
    (reasonList.includes("FRAGMENTED_SOURCE_LINES")&&
     reasonList.includes("SUSPICIOUS_SINGLE_LETTER_TOKENS"));
  if(!visualUrl||(!severe&&forceOriginalForBlankPage!==true))return {
    mode:"native",unreliableText:false,html:null,sourceVisualUrl:null
  };
  // The existing book-figure is used: no new navigation, reader shell,
  // global CSS, PDF iframe/canvas or extra student-facing tab.
  const html='<p>Original source page '+pageNo+
    ' — the embedded text layer is being verified. This page is shown as published so words and diagrams are not rearranged.</p>'+
    '<figure class="book-figure" data-source-recovery="true"><img loading="eager"'+
    ' src="'+htmlEscape(visualUrl)+'"'+
    ' alt="'+htmlEscape("Original page "+pageNo+" of "+title)+'"'+
    ' style="display:block;width:100%;max-width:100%;max-height:none;height:auto;object-fit:contain"'+
    '></figure>';
  return {mode:"original-source-exception",unreliableText:true,html,
    sourceVisualUrl:visualUrl};
}
