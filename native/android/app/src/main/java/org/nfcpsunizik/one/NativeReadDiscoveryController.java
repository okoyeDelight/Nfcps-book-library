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

                var style = document.getElementById('nfcps-native-growth-style-v4');
                if (!style) {
                  style = document.createElement('style');
                  style.id = 'nfcps-native-growth-style-v4';
                  style.textContent = '#nfcps-native-growth-root{display:block!important;width:100%!important;margin:10px 0 28px!important;color:#18221c!important;position:relative!important;z-index:2!important}' +
                    '#nfcps-native-growth-root *{box-sizing:border-box}' +
                    '#nfcps-native-growth-root .ngs{display:block!important;margin:0 0 28px!important}' +
                    '#nfcps-native-growth-root .ngh{padding:0 20px 12px!important;display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:14px!important}' +
                    '#nfcps-native-growth-root .ngh h2{margin:0!important;color:#18221c!important;font:500 23px/1.1 Georgia,serif!important;letter-spacing:-.4px!important}' +
                    '#nfcps-native-growth-root .ngh p{margin:5px 0 0!important;color:#747b75!important;font:500 12px/1.45 system-ui!important;max-width:560px!important}' +
                    '#nfcps-native-growth-root .ngc{white-space:nowrap!important;color:#858984!important;font:700 10px/1 system-ui!important}' +
                    '#nfcps-native-growth-root .ngt{display:flex!important;gap:15px!important;overflow-x:auto!important;padding:2px 20px 12px!important;scrollbar-width:none!important}' +
                    '#nfcps-native-growth-root .ngt::-webkit-scrollbar{display:none!important}' +
                    '#nfcps-native-growth-root .ngb{display:block!important;flex:0 0 116px!important;width:116px!important;border:0!important;background:transparent!important;padding:0!important;text-align:left!important;color:#18221c!important;text-decoration:none!important}' +
                    '#nfcps-native-growth-root .ngcover{height:166px!important;border-radius:12px!important;padding:13px 10px!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;overflow:hidden!important;background:linear-gradient(145deg,#123f33,#061a13 72%)!important;box-shadow:0 13px 27px rgba(31,37,32,.16)!important;color:white!important;position:relative!important}' +
                    '#nfcps-native-growth-root .ngcover:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 75% 18%,rgba(226,194,112,.36),transparent 34%),linear-gradient(135deg,transparent 35%,rgba(255,255,255,.05));pointer-events:none}' +
                    '#nfcps-native-growth-root .nglabel{position:relative;margin:0 0 auto!important;color:#e5c779!important;font:800 7px/1 system-ui!important;letter-spacing:1.1px!important}' +
                    '#nfcps-native-growth-root .ngtitle{position:relative;color:white!important;font:600 16px/1.03 Georgia,serif!important;display:block!important}' +
                    '#nfcps-native-growth-root .ngauthor{position:relative;margin-top:7px!important;color:rgba(255,255,255,.78)!important;font:600 8px/1.2 system-ui!important}' +
                    '#nfcps-native-growth-root .ngmeta{display:block!important;padding:9px 1px 0!important}' +
                    '#nfcps-native-growth-root .ngmeta strong{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;color:#18221c!important;font:500 15px/1.18 Georgia,serif!important;min-height:35px!important}' +
                    '#nfcps-native-growth-root .ngmeta small{display:block!important;margin-top:4px!important;color:#81847f!important;font:500 11px/1.25 system-ui!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}' +
                    '#nfcps-native-growth-root .ngmeta em{display:block!important;margin-top:6px!important;color:#316253!important;font:800 9px/1.25 system-ui!important;font-style:normal!important}' +
                    '#nfcps-native-growth-root .ngb[hidden],#nfcps-native-growth-root .ngs[hidden]{display:none!important}';
                  document.head.appendChild(style);
                }

                var modern = [
                  ['Atomic Habits','James Clear','https://jamesclear.com/atomic-habits'],
                  ['Ikigai','Héctor García & Francesc Miralles','https://books.google.com/books?q=Ikigai+Hector+Garcia+Francesc+Miralles'],
                  ['Rework','Jason Fried & David Heinemeier Hansson','https://books.google.com/books?q=Rework+Jason+Fried'],
                  ['Shoe Dog','Phil Knight','https://books.google.com/books?q=Shoe+Dog+Phil+Knight'],
                  ['Think Like a Monk','Jay Shetty','https://books.google.com/books?q=Think+Like+a+Monk+Jay+Shetty'],
                  ['Limitless','Jim Kwik','https://books.google.com/books?q=Limitless+Jim+Kwik'],
                  ['Hooked','Nir Eyal','https://books.google.com/books?q=Hooked+Nir+Eyal'],
                  ['The Mountain Is You','Brianna Wiest','https://books.google.com/books?q=The+Mountain+Is+You+Brianna+Wiest'],
                  ['The Alchemist','Paulo Coelho','https://books.google.com/books?q=The+Alchemist+Paulo+Coelho'],
                  ['The Almanack of Naval Ravikant','Eric Jorgenson','https://www.navalmanack.com/'],
                  ['The Art of Thinking Clearly','Rolf Dobelli','https://books.google.com/books?q=The+Art+of+Thinking+Clearly+Rolf+Dobelli'],
                  ["Poor Charlie's Almanack",'Charles T. Munger','https://books.google.com/books?q=Poor+Charlies+Almanack+Charles+Munger'],
                  ['How to Win Friends and Influence People','Dale Carnegie','https://books.google.com/books?q=How+to+Win+Friends+and+Influence+People+Dale+Carnegie'],
                  ["Can't Hurt Me",'David Goggins','https://books.google.com/books?q=Cant+Hurt+Me+David+Goggins'],
                  ['Focus on What Matters','Darius Foroux','https://books.google.com/books?q=Focus+on+What+Matters+Darius+Foroux'],
                  ['Think and Grow Rich','Napoleon Hill','https://books.google.com/books?q=Think+and+Grow+Rich+Napoleon+Hill'],
                  ['The Psychology of Money','Morgan Housel','https://books.google.com/books?q=The+Psychology+of+Money+Morgan+Housel']
                ];

                var free = [
                  [4507,'As a Man Thinketh','James Allen'],
                  [8581,'The Art of Money Getting','P. T. Barnum'],
                  [368,'Acres of Diamonds','Russell H. Conwell'],
                  [935,'Self-Help','Samuel Smiles'],
                  [45109,'The Enchiridion','Epictetus'],
                  [2680,'Meditations','Marcus Aurelius'],
                  [59844,'The Science of Getting Rich','W. D. Wattles'],
                  [58585,'The Prophet','Kahlil Gibran']
                ];

                function makeHead(title, subtitle, countText) {
                  var head = document.createElement('div'); head.className = 'ngh';
                  var copy = document.createElement('div');
                  var h2 = document.createElement('h2'); h2.textContent = title;
                  var p = document.createElement('p'); p.textContent = subtitle;
                  var count = document.createElement('span'); count.className = 'ngc'; count.textContent = countText; count.setAttribute('data-default', countText);
                  copy.appendChild(h2); copy.appendChild(p); head.appendChild(copy); head.appendChild(count); return head;
                }

                function makeCover(title, author, freeBook) {
                  var cover = document.createElement('span'); cover.className = 'ngcover';
                  var label = document.createElement('small'); label.className = 'nglabel'; label.textContent = freeBook ? 'READ FREE · NFCPS' : 'GROWTH COLLECTION';
                  var t = document.createElement('strong'); t.className = 'ngtitle'; t.textContent = title;
                  var a = document.createElement('em'); a.className = 'ngauthor'; a.textContent = author;
                  cover.appendChild(label); cover.appendChild(t); cover.appendChild(a); return cover;
                }

                function makeMeta(title, author, action) {
                  var meta = document.createElement('span'); meta.className = 'ngmeta';
                  var t = document.createElement('strong'); t.textContent = title;
                  var a = document.createElement('small'); a.textContent = author;
                  var e = document.createElement('em'); e.textContent = action;
                  meta.appendChild(t); meta.appendChild(a); meta.appendChild(e); return meta;
                }

                function freeReaderBook(item) {
                  var id = item[0];
                  return {id:id,title:item[1],author:item[2],cover:'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'.cover.medium.jpg',summary:'A public-domain growth classic selected for NFCPS One.',formats:{'image/jpeg':'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'.cover.medium.jpg','text/plain; charset=utf-8':'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'.txt','text/html':'https://www.gutenberg.org/cache/epub/'+id+'/pg'+id+'-images.html','application/epub+zip':'https://www.gutenberg.org/ebooks/'+id+'.epub3.images'}};
                }

                function buildRoot() {
                  var root = document.createElement('div'); root.id = 'nfcps-native-growth-root'; root.setAttribute('data-version','4');
                  var s1 = document.createElement('section'); s1.className = 'ngs';
                  s1.appendChild(makeHead('Modern Growth & Business','Books from your inspiration shelf and closely related titles.','17 picks'));
                  var t1 = document.createElement('div'); t1.className = 'ngt';
                  for (var i=0;i<modern.length;i++) {
                    (function(item){
                      var card = document.createElement('a'); card.className = 'ngb'; card.href = item[2]; card.setAttribute('data-search',(item[0]+' '+item[1]).toLowerCase());
                      card.appendChild(makeCover(item[0],item[1],false)); card.appendChild(makeMeta(item[0],item[1],'Explore book'));
                      t1.appendChild(card);
                    })(modern[i]);
                  }
                  s1.appendChild(t1);

                  var s2 = document.createElement('section'); s2.className = 'ngs';
                  s2.appendChild(makeHead('Read Free · Growth Classics','Legal public-domain books that open directly in the NFCPS reader.','8 books'));
                  var t2 = document.createElement('div'); t2.className = 'ngt';
                  for (var j=0;j<free.length;j++) {
                    (function(item){
                      var card = document.createElement('button'); card.type='button'; card.className='ngb'; card.setAttribute('data-search',(item[1]+' '+item[2]).toLowerCase());
                      card.appendChild(makeCover(item[1],item[2],true)); card.appendChild(makeMeta(item[1],item[2],'Read in NFCPS'));
                      card.addEventListener('click',function(){ window.dispatchEvent(new CustomEvent('nfcps-open-reader',{detail:freeReaderBook(item)})); });
                      t2.appendChild(card);
                    })(free[j]);
                  }
                  s2.appendChild(t2);
                  root.appendChild(s1); root.appendChild(s2); return root;
                }

                var root = document.getElementById('nfcps-native-growth-root');
                if (!root || root.getAttribute('data-version') !== '4') {
                  if (root && root.parentNode) root.parentNode.removeChild(root);
                  root = buildRoot();
                }

                var anchor = page.querySelector('.books-filters') || page.querySelector('.books-search') || page.querySelector('.books-resume') || page.querySelector('.books-page-bar');
                if (!anchor) return 'read-no-anchor';
                if (root.parentNode !== page || root.previousElementSibling !== anchor) {
                  anchor.parentNode.insertBefore(root, anchor.nextSibling);
                }

                var input = page.querySelector('.books-search input');
                var q = input ? String(input.value || '').toLowerCase().trim() : '';
                var cards = root.querySelectorAll('.ngb');
                for (var k=0;k<cards.length;k++) cards[k].hidden = !!q && String(cards[k].getAttribute('data-search') || '').indexOf(q) < 0;
                var shelves = root.querySelectorAll('.ngs');
                for (var s=0;s<shelves.length;s++) {
                  var shelfCards = shelves[s].querySelectorAll('.ngb'); var visible = 0;
                  for (var c=0;c<shelfCards.length;c++) if (!shelfCards[c].hidden) visible++;
                  shelves[s].hidden = visible === 0;
                  var countNode = shelves[s].querySelector('.ngc');
                  if (countNode) countNode.textContent = q ? visible + (visible === 1 ? ' match' : ' matches') : countNode.getAttribute('data-default');
                }
                return 'mounted:'+cards.length;
              } catch (e) {
                return 'error:'+(e && e.message ? e.message : String(e));
              }
            })();
        """;
        webView.evaluateJavascript(script, result -> Log.d(TAG, "inject result=" + result));
    }
}
