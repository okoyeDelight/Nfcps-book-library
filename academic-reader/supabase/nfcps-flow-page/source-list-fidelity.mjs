/**
 * Preserve source enumeration boundaries which MuPDF's line grouping can join.
 * Does not insert/renumber bullets, change words, invent hierarchy, or modify
 * tables/figures. Text-only <p> are separated at source-authored markers.
 */
export function restoreSourceLists(html){
  const raw=String(html??"");
  let restored=0;
  const output=raw.replace(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi,(whole,body)=>{
    // Never risk breaking nested layout HTML, links or inline source markup.
    if(/<\/?[a-z][^>]*>/i.test(body))return whole;
    const markers=[];
    const re=/\(\s*[a-hA-H]\s*\)|(?<![A-Za-z])[a-hA-H]\)|(?<![\dA-Za-z])\d{1,2}\.(?=\s*[A-Za-z])|[●•▪◦]/g;
    for(const m of body.matchAll(re)){
      const at=m.index;
      if(at>0&&!/[\s\u200b,;:]/.test(body[at-1]))continue;
      // Avoid splitting chemical/grammatical parenthetical a) inside a word.
      if(m[0]==="•"||m[0]==="●"||m[0]==="▪"||m[0]==="◦"
        ||at===0||/[\s\u200b,;:]/.test(body[at-1]))
        markers.push(at);
    }
    if(!markers.length)return whole;
    const sections=[];
    let prev=0;
    for(const pos of markers){
      if(pos>prev){
        const part=body.slice(prev,pos).trim();
        if(part)sections.push({value:part,isList:prev!==0||markers[0]===0});
      }
      prev=pos;
    }
    const last=body.slice(prev).trim();
    if(last)sections.push({value:last,isList:true});
    if(!sections.length)return whole;
    // If there is preceding prose before the first marker, keep it prose.
    if(markers[0]>0&&sections.length)sections[0].isList=false;
    if(sections.length>1)restored+=sections.length-1;
    return sections.map(x=>x.isList?
      '<p class="book-source-list" style="padding-left:1.35em;text-indent:-1.35em">'+x.value+'</p>':
      '<p>'+x.value+'</p>').join("");
  });
  return {html:output,restoredBoundaries:restored};
}
