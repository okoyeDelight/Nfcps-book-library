'use client';

const MODERN_ISBNS: Record<number, string> = {
  101: '9780735211292',
  102: '9780143130727',
  103: '9780307463746',
  104: '9781501135927',
  105: '9781982134501',
  106: '9781401958237',
  107: '9781591847786',
  108: '9781949759228',
  109: '9780062315007',
  110: '9781544514215',
};

const coverUrl = (id: number, title: string, author: string) => {
  const numeric = Number(id);
  const key = Math.abs(numeric || 0);
  const params = new URLSearchParams({ title, author });
  if (numeric > 0) params.set('gutenberg', String(numeric));
  else if (MODERN_ISBNS[key]) params.set('isbn', MODERN_ISBNS[key]);
  return `https://nfcps-one.hatchable.site/api/read/cover?${params.toString()}`;
};

export default function ConceptBookCover({id,title,author,className=''}:{id:number;title:string;author:string;className?:string}){
  const n=Math.abs(Number(id)||0);
  const art=coverUrl(id,title,author);
  return <span className={`cx-cover tone-${n%5} ${className}`}><span className='cx-cover-art' style={{backgroundImage:`url(${art})`}}/><span className='cx-cover-shade'/><span className='cx-cover-copy'><small>NFCPS CLASSIC</small><strong>{title}</strong><em>{author}</em></span></span>
}
