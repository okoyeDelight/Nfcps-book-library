package org.nfcpsunizik.one;

import android.webkit.WebView;

final class NativeReadCoverPatch {
    private NativeReadCoverPatch() {}

    static void inject(WebView webView) {
        if (webView == null) return;
        String script = """
            (function(){
              try{
                var root=document.getElementById('nfcps-native-growth-root');
                var state=window.__NFCPS_READ_REMOTE_STATE__||window.__NFCPS_READ_REMOTE_STATE_V2__;
                var catalog=state&&state.catalog;
                var bridge=window.NFCPSNativeSpeech;
                var token=String(window.__NFCPS_SPEECH_TOKEN__||'');
                if(!root||!catalog||!bridge||!token||typeof bridge.requestCover!=='function')return 'waiting';

                var books={};
                var shelves=Array.isArray(catalog.shelves)?catalog.shelves:[];
                for(var s=0;s<shelves.length;s++){
                  var list=Array.isArray(shelves[s].books)?shelves[s].books:[];
                  for(var b=0;b<list.length;b++)books[String(list[b].title||'').trim().toLowerCase()]=list[b];
                }
                var rev=String(catalog.revision||0);

                function request(book,img,fallback){
                  var candidates=Array.isArray(book.cover_candidates)?book.cover_candidates.slice():[];
                  var index=0;
                  function next(){
                    if(index>=candidates.length)return;
                    var url=candidates[index++];
                    var id='nfcps-cover-'+Math.random().toString(36).slice(2)+'-'+Date.now();
                    var done=false;
                    var timer=setTimeout(function(){if(done)return;done=true;window.removeEventListener('nfcps-cover-ready',ready);next();},9000);
                    function ready(event){
                      var detail=event&&event.detail?event.detail:{};
                      if(detail.id!==id||done)return;
                      done=true;clearTimeout(timer);window.removeEventListener('nfcps-cover-ready',ready);
                      if(!detail.dataUrl){next();return;}
                      img.onload=function(){if(fallback)fallback.style.display='none';img.style.display='block';};
                      img.onerror=function(){img.removeAttribute('src');next();};
                      img.src=detail.dataUrl;
                    }
                    window.addEventListener('nfcps-cover-ready',ready);
                    try{bridge.requestCover(token,id,url);}catch(e){clearTimeout(timer);window.removeEventListener('nfcps-cover-ready',ready);next();}
                  }
                  next();
                }

                var cards=root.querySelectorAll('.ngb');
                var patched=0;
                for(var i=0;i<cards.length;i++){
                  var card=cards[i];
                  var titleNode=card.querySelector('.ngmeta strong')||card.querySelector('.ngfallback strong');
                  var title=titleNode?String(titleNode.textContent||'').trim().toLowerCase():'';
                  var book=books[title];
                  if(!book||card.getAttribute('data-native-cover-rev')===rev)continue;
                  card.setAttribute('data-native-cover-rev',rev);
                  var cover=card.querySelector('.ngcover');if(!cover)continue;
                  var fallback=cover.querySelector('.ngfallback');
                  var img=cover.querySelector('img');
                  if(!img){img=document.createElement('img');img.alt=String(book.title||'Book')+' cover';img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;z-index:4';cover.appendChild(img);}
                  else{img.style.position='absolute';img.style.inset='0';img.style.width='100%';img.style.height='100%';img.style.objectFit='cover';img.style.zIndex='4';}
                  request(book,img,fallback);patched++;
                }

                if(!root.__nfcpsPreviewPatch){
                  root.__nfcpsPreviewPatch=true;
                  root.addEventListener('click',function(event){
                    var card=event.target&&event.target.closest?event.target.closest('.ngb'):null;
                    if(!card)return;
                    var action=card.querySelector('.ngmeta em');
                    if(!action||String(action.textContent||'').toLowerCase().indexOf('preview')<0)return;
                    var titleNode=card.querySelector('.ngmeta strong');var key=titleNode?String(titleNode.textContent||'').trim().toLowerCase():'';var book=books[key];
                    if(!book||typeof bridge.openBookPreview!=='function')return;
                    event.preventDefault();event.stopPropagation();if(event.stopImmediatePropagation)event.stopImmediatePropagation();
                    bridge.openBookPreview(token,String(book.title||''),String(book.isbn||''),String(book.google_book_id||''));
                  },true);
                }
                return 'patched:'+patched;
              }catch(e){return 'error:'+(e&&e.message?e.message:String(e));}
            })();
        """;
        webView.evaluateJavascript(script, null);
    }
}
