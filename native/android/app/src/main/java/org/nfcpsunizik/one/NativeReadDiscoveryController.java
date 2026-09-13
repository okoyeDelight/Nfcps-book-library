package org.nfcpsunizik.one;

import android.util.Log;
import android.webkit.WebView;

final class NativeReadDiscoveryController {
    private static final String TAG = "NFCPSReadDiscovery";

    private NativeReadDiscoveryController() {}

    static void inject(WebView webView) {
        if (webView == null) return;
        String script = """
            (function(){
              try {
                var page = document.querySelector('.books-page');
                if (!page) return 'no-read-page';

                var RAW = 'https://raw.githubusercontent.com/okoyeDelight/Nfcps-book-library/main/nfcps-read-catalog.json';
                var CDN = 'https://cdn.jsdelivr.net/gh/okoyeDelight/Nfcps-book-library@main/nfcps-read-catalog.json';
                var CACHE_KEY = 'nfcps-read-remote-catalog-v1';
                var state = window.__NFCPS_READ_REMOTE_STATE__ || {catalog:null,fetching:false,fetchedAt:0};
                window.__NFCPS_READ_REMOTE_STATE__ = state;

                function esc(value){
                  return String(value == null ? '' : value)
                    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
                }

                function ensureStyle(){
                  var style = document.getElementById('nfcps-native-growth-style-v5');
                  if (style) return;
                  style = document.createElement('style');
                  style.id = 'nfcps-native-growth-style-v5';
                  style.textContent =
                    '#nfcps-native-growth-root{display:block!important;width:100%!important;margin:10px 0 30px!important;color:#18221c!important;position:relative!important;z-index:2!important}' +
                    '#nfcps-native-growth-root *{box-sizing:border-box}' +
                    '#nfcps-native-growth-root .ngs{display:block!important;margin:0 0 30px!important}' +
                    '#nfcps-native-growth-root .ngh{padding:0 20px 12px!important;display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:14px!important}' +
                    '#nfcps-native-growth-root .ngh h2{margin:0!important;color:#18221c!important;font:500 23px/1.1 Georgia,serif!important;letter-spacing:-.4px!important}' +
                    '#nfcps-native-growth-root .ngh p{margin:5px 0 0!important;color:#747b75!important;font:500 12px/1.45 system-ui!important;max-width:560px!important}' +
                    '#nfcps-native-growth-root .ngc{white-space:nowrap!important;color:#858984!important;font:700 10px/1 system-ui!important}' +
                    '#nfcps-native-growth-root .ngt{display:flex!important;gap:15px!important;overflow-x:auto!important;padding:2px 20px 12px!important;scrollbar-width:none!important;scroll-snap-type:x proximity!important}' +
                    '#nfcps-native-growth-root .ngt::-webkit-scrollbar{display:none!important}' +
                    '#nfcps-native-growth-root .ngb{display:block!important;flex:0 0 116px!important;width:116px!important;border:0!important;background:transparent!important;padding:0!important;text-align:left!important;color:#18221c!important;text-decoration:none!important;scroll-snap-align:start!important}' +
                    '#nfcps-native-growth-root .ngcover{height:166px!important;border-radius:12px!important;display:block!important;overflow:hidden!important;background:linear-gradient(145deg,#123f33,#061a13 72%)!important;box-shadow:0 13px 27px rgba(31,37,32,.16)!important;position:relative!important}' +
                    '#nfcps-native-growth-root .ngcover img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;background:#123f33!important}' +
                    '#nfcps-native-growth-root .ngfallback{position:absolute!important;inset:0!important;padding:13px 10px!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;color:white!important;background:radial-gradient(circle at 75% 18%,rgba(226,194,112,.34),transparent 34%),linear-gradient(145deg,#123f33,#061a13 72%)!important}' +
                    '#nfcps-native-growth-root .ngfallback small{margin:0 0 auto!important;color:#e5c779!important;font:800 7px/1 system-ui!important;letter-spacing:1.1px!important}' +
                    '#nfcps-native-growth-root .ngfallback strong{font:600 16px/1.03 Georgia,serif!important;color:white!important}' +
                    '#nfcps-native-growth-root .ngfallback em{margin-top:7px!important;color:rgba(255,255,255,.78)!important;font:600 8px/1.2 system-ui!important;font-style:normal!important}' +
                    '#nfcps-native-growth-root .ngmeta{display:block!important;padding:9px 1px 0!important}' +
                    '#nfcps-native-growth-root .ngmeta strong{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;color:#18221c!important;font:500 15px/1.18 Georgia,serif!important;min-height:35px!important}' +
                    '#nfcps-native-growth-root .ngmeta small{display:block!important;margin-top:4px!important;color:#81847f!important;font:500 11px/1.25 system-ui!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
                    '#nfcps-native-growth-root .ngmeta em{display:block!important;margin-top:6px!important;color:#316253!important;font:800 9px/1.25 system-ui!important;font-style:normal!important}' +
                    '#nfcps-native-growth-root .ngb[hidden],#nfcps-native-growth-root .ngs[hidden]{display:none!important}' +
                    '#nfcps-book-sheet{position:fixed!important;inset:0!important;z-index:2147483000!important;background:rgba(2,10,7,.62)!important;backdrop-filter:blur(14px)!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;padding:0!important}' +
                    '#nfcps-book-sheet .nbs{width:min(760px,100%)!important;max-height:94vh!important;overflow:auto!important;background:#f7f4ed!important;color:#18221c!important;border-radius:28px 28px 0 0!important;box-shadow:0 -30px 90px rgba(0,0,0,.38)!important;padding:18px 18px calc(24px + env(safe-area-inset-bottom))!important}' +
                    '#nfcps-book-sheet .nbbar{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;margin-bottom:18px!important}' +
                    '#nfcps-book-sheet .nbbar strong{font:700 12px/1 system-ui!important;letter-spacing:.08em!important;color:#31594d!important}' +
                    '#nfcps-book-sheet .nbclose{width:40px!important;height:40px!important;border:0!important;border-radius:50%!important;background:#ebe6dc!important;color:#173f33!important;font-size:24px!important}' +
                    '#nfcps-book-sheet .nbhero{display:grid!important;grid-template-columns:116px minmax(0,1fr)!important;gap:18px!important;align-items:start!important}' +
                    '#nfcps-book-sheet .nbhero img{width:116px!important;height:166px!important;object-fit:cover!important;border-radius:13px!important;box-shadow:0 16px 34px rgba(30,38,32,.18)!important;background:#123f33!important}' +
                    '#nfcps-book-sheet .nbhero h2{margin:2px 0 6px!important;font:500 28px/1.02 Georgia,serif!important;color:#18221c!important}' +
                    '#nfcps-book-sheet .nbhero h3{margin:0 0 12px!important;font:650 13px/1.3 system-ui!important;color:#68716b!important}' +
                    '#nfcps-book-sheet .nbhero p{margin:0!important;font:400 14px/1.55 system-ui!important;color:#525b55!important}' +
                    '#nfcps-book-sheet .nbnotice{margin:18px 0 0!important;padding:12px 14px!important;border-radius:14px!important;background:#eee9df!important;color:#576059!important;font:600 11px/1.45 system-ui!important}' +
                    '#nfcps-book-sheet .nbpreview{margin-top:18px!important;min-height:430px!important;border-radius:18px!important;overflow:hidden!important;background:#e8e4da!important;border:1px solid rgba(24,34,28,.09)!important}' +
                    '#nfcps-book-sheet .nbpreview>div{width:100%!important;height:520px!important}' +
                    '#nfcps-book-sheet .nbloading{min-height:430px!important;display:grid!important;place-items:center!important;text-align:center!important;padding:26px!important;color:#69716c!important;font:600 13px/1.5 system-ui!important}' +
                    '@media(min-width:720px){#nfcps-native-growth-root .ngb{flex-basis:132px!important;width:132px!important}#nfcps-native-growth-root .ngcover{height:188px!important}#nfcps-book-sheet{align-items:center!important;padding:24px!important}#nfcps-book-sheet .nbs{border-radius:28px!important}}';
                  document.head.appendChild(style);
                }

                function coverNode(book, freeBook){
                  var wrap = document.createElement('span'); wrap.className='ngcover';
                  var fallback = document.createElement('span'); fallback.className='ngfallback';
                  fallback.innerHTML = '<small>'+(freeBook?'READ FREE · NFCPS':'NFCPS RECOMMENDS')+'</small><strong>'+esc(book.title)+'</strong><em>'+esc(book.author)+'</em>';
                  wrap.appendChild(fallback);
                  var candidates = Array.isArray(book.cover_candidates) ? book.cover_candidates.slice() : [];
                  if (candidates.length) {
                    var img = document.createElement('img'); var idx = 0;
                    img.alt = book.title+' cover';
                    img.onload = function(){ fallback.style.display='none'; };
                    img.onerror = function(){ idx++; if (idx<candidates.length) img.src=candidates[idx]; else img.remove(); };
                    img.src = candidates[0]; wrap.appendChild(img);
                  }
                  return wrap;
                }

                function readerBook(book){
                  var id = Number(book.gutenberg_id || 0);
                  var cover = book.cover_candidates && book.cover_candidates[0] ? book.cover_candidates[0] : 'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'.cover.medium.jpg';
                  return {id:id,title:book.title,author:book.author,cover:cover,summary:book.description || '',formats:{'image/jpeg':cover,'text/plain; charset=utf-8':'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'.txt','text/html':'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'-images.html','application/epub+zip':'https://www.gutenberg.org/ebooks/'+id+'.epub3.images'}};
                }

                function closeSheet(){ var old=document.getElementById('nfcps-book-sheet'); if(old) old.remove(); }

                function loadGooglePreview(book, target){
                  if (!book.isbn && !book.google_book_id) { target.innerHTML='<div class="nbloading">No licensed preview is currently available for this edition.</div>'; return; }
                  var identifier = book.google_book_id ? book.google_book_id : 'ISBN:'+book.isbn;
                  function start(){
                    try {
                      google.books.load();
                      google.books.setOnLoadCallback(function(){
                        try {
                          var viewer = new google.books.DefaultViewer(target);
                          viewer.load(identifier, function(){ target.innerHTML='<div class="nbloading">A full in-app preview is not available for this edition yet. The book details and cover remain available here in NFCPS One.</div>'; });
                        } catch(e){ target.innerHTML='<div class="nbloading">Preview could not be loaded right now.</div>'; }
                      });
                    } catch(e){ target.innerHTML='<div class="nbloading">Preview could not be loaded right now.</div>'; }
                  }
                  if (window.google && google.books) { start(); return; }
                  var script = document.getElementById('nfcps-google-books-jsapi');
                  if (!script) {
                    script = document.createElement('script'); script.id='nfcps-google-books-jsapi'; script.src='https://www.google.com/books/jsapi.js'; script.async=true;
                    script.onload=start; script.onerror=function(){target.innerHTML='<div class="nbloading">Preview service is temporarily unavailable.</div>';};
                    document.head.appendChild(script);
                  } else {
                    var tries=0; var timer=setInterval(function(){ tries++; if(window.google&&google.books){clearInterval(timer);start();} else if(tries>20){clearInterval(timer);target.innerHTML='<div class="nbloading">Preview service is temporarily unavailable.</div>';} },200);
                  }
                }

                function openPreview(book){
                  closeSheet();
                  var overlay=document.createElement('div'); overlay.id='nfcps-book-sheet';
                  var shell=document.createElement('div'); shell.className='nbs';
                  var bar=document.createElement('div'); bar.className='nbbar'; bar.innerHTML='<strong>NFCPS ONE · BOOK PREVIEW</strong>';
                  var close=document.createElement('button'); close.className='nbclose'; close.type='button'; close.textContent='×'; close.onclick=closeSheet; bar.appendChild(close);
                  var hero=document.createElement('div'); hero.className='nbhero';
                  var cover=document.createElement('img'); cover.alt=book.title+' cover';
                  var candidates=Array.isArray(book.cover_candidates)?book.cover_candidates.slice():[]; var ci=0;
                  cover.onerror=function(){ci++; if(ci<candidates.length)cover.src=candidates[ci]; else cover.style.visibility='hidden';}; if(candidates.length)cover.src=candidates[0];
                  var copy=document.createElement('div'); copy.innerHTML='<h2>'+esc(book.title)+'</h2><h3>'+esc(book.author)+'</h3><p>'+esc(book.description||'')+'</p>';
                  hero.appendChild(cover); hero.appendChild(copy);
                  var notice=document.createElement('div'); notice.className='nbnotice'; notice.textContent='This title is copyrighted. NFCPS One will show only the preview that the rights holder or Google Books makes legally available; the app does not open Chrome or provide an unauthorized full copy.';
                  var preview=document.createElement('div'); preview.className='nbpreview'; var canvas=document.createElement('div'); canvas.innerHTML='<div class="nbloading">Loading available preview…</div>'; preview.appendChild(canvas);
                  shell.appendChild(bar); shell.appendChild(hero); shell.appendChild(notice); shell.appendChild(preview); overlay.appendChild(shell); document.body.appendChild(overlay);
                  overlay.addEventListener('click',function(e){if(e.target===overlay)closeSheet();});
                  loadGooglePreview(book,canvas);
                }

                function makeCard(book){
                  var freeBook = book.mode === 'read' && Number(book.gutenberg_id||0)>0;
                  var card=document.createElement('button'); card.type='button'; card.className='ngb'; card.setAttribute('data-search',(String(book.title||'')+' '+String(book.author||'')+' '+String(book.description||'')).toLowerCase());
                  card.appendChild(coverNode(book,freeBook));
                  var meta=document.createElement('span'); meta.className='ngmeta'; meta.innerHTML='<strong>'+esc(book.title)+'</strong><small>'+esc(book.author)+'</small><em>'+(freeBook?'Read in NFCPS':'Preview in NFCPS')+'</em>'; card.appendChild(meta);
                  card.onclick=function(){ if(freeBook) window.dispatchEvent(new CustomEvent('nfcps-open-reader',{detail:readerBook(book)})); else openPreview(book); };
                  return card;
                }

                function buildRoot(catalog){
                  var root=document.createElement('div'); root.id='nfcps-native-growth-root'; root.setAttribute('data-catalog-revision',String(catalog.revision||0));
                  var shelves=Array.isArray(catalog.shelves)?catalog.shelves:[];
                  for(var i=0;i<shelves.length;i++){
                    var shelf=shelves[i]||{}; var books=Array.isArray(shelf.books)?shelf.books:[];
                    var section=document.createElement('section'); section.className='ngs';
                    var head=document.createElement('div'); head.className='ngh';
                    var copy=document.createElement('div'); var h2=document.createElement('h2'); h2.textContent=shelf.title||'Books'; var p=document.createElement('p'); p.textContent=shelf.subtitle||''; copy.appendChild(h2); copy.appendChild(p);
                    var count=document.createElement('span'); count.className='ngc'; count.textContent=books.length+(books.length===1?' book':' books'); count.setAttribute('data-default',count.textContent); head.appendChild(copy); head.appendChild(count);
                    var track=document.createElement('div'); track.className='ngt'; for(var j=0;j<books.length;j++) track.appendChild(makeCard(books[j]));
                    section.appendChild(head); section.appendChild(track); root.appendChild(section);
                  }
                  return root;
                }

                function render(catalog){
                  if(!catalog || !Array.isArray(catalog.shelves)) return 'no-catalog';
                  ensureStyle();
                  var root=document.getElementById('nfcps-native-growth-root'); var revision=String(catalog.revision||0);
                  if(!root || root.getAttribute('data-catalog-revision')!==revision){ if(root&&root.parentNode)root.remove(); root=buildRoot(catalog); }
                  var anchor=page.querySelector('.books-filters')||page.querySelector('.books-search')||page.querySelector('.books-resume')||page.querySelector('.books-page-bar');
                  if(!anchor||!anchor.parentNode) return 'read-no-anchor';
                  if(root.parentNode!==anchor.parentNode || root.previousElementSibling!==anchor) anchor.parentNode.insertBefore(root,anchor.nextSibling);
                  var input=page.querySelector('.books-search input'); var q=input?String(input.value||'').toLowerCase().trim():''; var cards=root.querySelectorAll('.ngb');
                  for(var k=0;k<cards.length;k++)cards[k].hidden=!!q&&String(cards[k].getAttribute('data-search')||'').indexOf(q)<0;
                  var sections=root.querySelectorAll('.ngs'); for(var s=0;s<sections.length;s++){var sc=sections[s].querySelectorAll('.ngb'),vis=0;for(var c=0;c<sc.length;c++)if(!sc[c].hidden)vis++;sections[s].hidden=vis===0;var cn=sections[s].querySelector('.ngc');if(cn)cn.textContent=q?vis+(vis===1?' match':' matches'):cn.getAttribute('data-default');}
                  return 'mounted:'+cards.length+':rev'+revision;
                }

                if(!state.catalog){
                  try{var cached=localStorage.getItem(CACHE_KEY);if(cached)state.catalog=JSON.parse(cached);}catch(e){}
                }
                var result=state.catalog?render(state.catalog):'catalog-loading';

                if(!state.fetching && Date.now()-Number(state.fetchedAt||0)>300000){
                  state.fetching=true;
                  var load=function(url,fallback){fetch(url+(url.indexOf('?')>=0?'&':'?')+'t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('catalog '+r.status);return r.json();}).then(function(catalog){state.catalog=catalog;state.fetchedAt=Date.now();state.fetching=false;try{localStorage.setItem(CACHE_KEY,JSON.stringify(catalog));}catch(e){}render(catalog);}).catch(function(){if(fallback)load(fallback,null);else state.fetching=false;});};
                  load(RAW,CDN);
                }
                return result;
              } catch(e){ return 'error:'+(e&&e.message?e.message:String(e)); }
            })();
        """;
        webView.evaluateJavascript(script, result -> Log.d(TAG, "inject result=" + result));
    }
}
