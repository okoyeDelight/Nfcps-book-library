package org.nfcpsunizik.one;

import android.webkit.WebView;

final class NativeReadDiscoveryController {
    private NativeReadDiscoveryController() {}

    static void inject(WebView webView) {
        if (webView == null) return;
        String script = """
            (() => {
              const VERSION = 3;
              const existing = window.__NFCPS_NATIVE_GROWTH_DISCOVERY__;
              if (existing && existing.version === VERSION && typeof existing.mount === 'function') {
                existing.mount();
                return;
              }

              const ART = [
                'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=700&q=78'
              ];

              const googleBooks = title => `https://books.google.com/books?q=${encodeURIComponent(title)}`;

              const MODERN = [
                {id:-101,title:'Atomic Habits',author:'James Clear',note:'Systems, habits and small improvements that compound.',url:'https://jamesclear.com/atomic-habits',access:'Official book page'},
                {id:-102,title:'Ikigai',author:'Héctor García & Francesc Miralles',note:'Purpose, meaningful work and a life worth waking up for.',url:googleBooks('Ikigai Hector Garcia Francesc Miralles'),access:'Book details'},
                {id:-103,title:'Rework',author:'Jason Fried & David Heinemeier Hansson',note:'A practical challenge to conventional ideas about building a business.',url:googleBooks('Rework Jason Fried'),access:'Book details'},
                {id:-104,title:'Shoe Dog',author:'Phil Knight',note:'Nike’s messy, risky and persistent path from idea to global company.',url:googleBooks('Shoe Dog Phil Knight'),access:'Book details'},
                {id:-105,title:'Think Like a Monk',author:'Jay Shetty',note:'Attention, purpose, discipline and inner clarity.',url:googleBooks('Think Like a Monk Jay Shetty'),access:'Book details'},
                {id:-106,title:'Limitless',author:'Jim Kwik',note:'Learning, memory, focus and unlocking more of your mental capacity.',url:googleBooks('Limitless Jim Kwik'),access:'Book details'},
                {id:-107,title:'Hooked',author:'Nir Eyal',note:'Why products become habits and how attention-shaping systems are built.',url:googleBooks('Hooked Nir Eyal'),access:'Book details'},
                {id:-108,title:'The Mountain Is You',author:'Brianna Wiest',note:'Self-sabotage, resilience and becoming the person capable of the climb.',url:googleBooks('The Mountain Is You Brianna Wiest'),access:'Book details'},
                {id:-109,title:'The Alchemist',author:'Paulo Coelho',note:'A story about calling, courage, desire and the cost of pursuing a dream.',url:googleBooks('The Alchemist Paulo Coelho'),access:'Book details'},
                {id:-110,title:'The Almanack of Naval Ravikant',author:'Eric Jorgenson',note:'A curated guide to wealth, judgment and happiness.',url:'https://www.navalmanack.com/',access:'Free official edition'},
                {id:-111,title:'The Art of Thinking Clearly',author:'Rolf Dobelli',note:'Common thinking errors and how they distort judgment.',url:googleBooks('The Art of Thinking Clearly Rolf Dobelli'),access:'Book details'},
                {id:-112,title:'Poor Charlie’s Almanack',author:'Charles T. Munger',note:'Mental models, judgment, business and worldly wisdom.',url:googleBooks("Poor Charlie's Almanack Charles Munger"),access:'Book details'},
                {id:-113,title:'How to Win Friends and Influence People',author:'Dale Carnegie',note:'A classic guide to relationships, communication and influence.',url:googleBooks('How to Win Friends and Influence People Dale Carnegie'),access:'Book details'},
                {id:-114,title:'Can’t Hurt Me',author:'David Goggins',note:'Resilience, discipline and pushing beyond self-imposed limits.',url:googleBooks("Can't Hurt Me David Goggins"),access:'Book details'},
                {id:-115,title:'Focus on What Matters',author:'Darius Foroux',note:'Practical reflections on attention, priorities and meaningful work.',url:googleBooks('Focus on What Matters Darius Foroux'),access:'Book details'},
                {id:-116,title:'Think and Grow Rich',author:'Napoleon Hill',note:'A historically influential personal-success book about goals and persistence.',url:googleBooks('Think and Grow Rich Napoleon Hill'),access:'Book details'},
                {id:-117,title:'The Psychology of Money',author:'Morgan Housel',note:'How behavior, emotion and time shape financial decisions.',url:googleBooks('The Psychology of Money Morgan Housel'),access:'Book details'}
              ];

              const FREE = [
                {id:4507,title:'As a Man Thinketh',author:'James Allen',note:'A short classic about thought, character and the direction of a life.'},
                {id:8581,title:'The Art of Money Getting',author:'P. T. Barnum',note:'Practical old-school lessons on work, money, debt, integrity and opportunity.'},
                {id:368,title:'Acres of Diamonds',author:'Russell H. Conwell',note:'A reminder to recognize opportunities already close to you.'},
                {id:935,title:'Self-Help',author:'Samuel Smiles',note:'Industry, perseverance, character and self-education.'},
                {id:45109,title:'The Enchiridion',author:'Epictetus',note:'A compact Stoic handbook on control, judgment and inner freedom.'},
                {id:2680,title:'Meditations',author:'Marcus Aurelius',note:'Private reflections on discipline, duty, character and calm.'},
                {id:59844,title:'The Science of Getting Rich',author:'W. D. Wattles',note:'A historically influential prosperity text; read critically alongside Scripture and sound financial wisdom.'},
                {id:58585,title:'The Prophet',author:'Kahlil Gibran',note:'Poetic reflections on work, love, giving, freedom, friendship and life.'}
              ];

              function ensureStyle() {
                let style = document.getElementById('nfcps-native-growth-style-v3');
                if (style) return;
                style = document.createElement('style');
                style.id = 'nfcps-native-growth-style-v3';
                style.textContent = `
                  #nfcps-native-growth-root{display:block!important;width:100%;margin:4px 0 8px;color:#18221c}
                  #nfcps-native-growth-root *{box-sizing:border-box}
                  #nfcps-native-growth-root .nfcps-growth-shelf{display:block!important;margin:8px 0 28px}
                  #nfcps-native-growth-root .nfcps-growth-head{padding:0 20px 12px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
                  #nfcps-native-growth-root .nfcps-growth-head h2{margin:0;font:500 23px/1.1 Georgia,'Times New Roman',serif;letter-spacing:-.4px;color:#18221c}
                  #nfcps-native-growth-root .nfcps-growth-head p{margin:5px 0 0;color:#7d817c;font:500 12px/1.45 system-ui;max-width:560px}
                  #nfcps-native-growth-root .nfcps-growth-count{white-space:nowrap;color:#858984;font:650 10px/1 system-ui}
                  #nfcps-native-growth-root .nfcps-growth-track{display:flex!important;gap:15px;overflow-x:auto;padding:2px 20px 12px;scroll-snap-type:x proximity;scrollbar-width:none}
                  #nfcps-native-growth-root .nfcps-growth-track::-webkit-scrollbar{display:none}
                  #nfcps-native-growth-root .nfcps-growth-tile{flex:0 0 116px;width:116px;border:0;background:transparent;padding:0;text-align:left;scroll-snap-align:start;color:inherit;text-decoration:none!important;display:block}
                  #nfcps-native-growth-root .nfcps-growth-cover{position:relative;width:116px;height:166px;border-radius:12px;overflow:hidden;display:block;background:#173f33;box-shadow:0 13px 27px rgba(31,37,32,.16)}
                  #nfcps-native-growth-root .nfcps-growth-cover-art{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(.78) contrast(1.04)}
                  #nfcps-native-growth-root .nfcps-growth-cover-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,20,14,.1),rgba(4,18,13,.76) 67%,rgba(3,13,10,.97))}
                  #nfcps-native-growth-root .nfcps-growth-cover-copy{position:absolute;inset:0;padding:12px 10px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.35)}
                  #nfcps-native-growth-root .nfcps-growth-cover-copy small{margin:0 0 auto;color:#e5c779;font:750 7px/1 system-ui;letter-spacing:1.2px}
                  #nfcps-native-growth-root .nfcps-growth-cover-copy strong{font:600 16px/1.02 Georgia,'Times New Roman',serif;display:block;color:#fff}
                  #nfcps-native-growth-root .nfcps-growth-cover-copy em{margin-top:6px;color:rgba(255,255,255,.8);font:600 8px/1.2 system-ui;font-style:normal}
                  #nfcps-native-growth-root .nfcps-growth-meta{display:block;padding:9px 1px 0}
                  #nfcps-native-growth-root .nfcps-growth-meta strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:500 15px/1.18 Georgia,'Times New Roman',serif;min-height:35px;color:#18221c}
                  #nfcps-native-growth-root .nfcps-growth-meta small{display:block;margin-top:4px;color:#81847f;font:500 11px/1.25 system-ui;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                  #nfcps-native-growth-root .nfcps-growth-meta em{display:block;margin-top:6px;color:#44685c;font:700 9px/1.25 system-ui;font-style:normal}
                  #nfcps-native-growth-root .nfcps-growth-tile[hidden],#nfcps-native-growth-root .nfcps-growth-shelf[hidden]{display:none!important}
                  @media(min-width:720px){#nfcps-native-growth-root .nfcps-growth-tile{flex-basis:132px;width:132px}#nfcps-native-growth-root .nfcps-growth-cover{width:132px;height:188px}}
                `;
                document.head.appendChild(style);
              }

              function cover(book, index, free) {
                const wrap = document.createElement('span');
                wrap.className = 'nfcps-growth-cover';
                const art = document.createElement('span');
                art.className = 'nfcps-growth-cover-art';
                art.style.backgroundImage = `url(${ART[Math.abs(book.id + index) % ART.length]})`;
                const shade = document.createElement('span');
                shade.className = 'nfcps-growth-cover-shade';
                const copy = document.createElement('span');
                copy.className = 'nfcps-growth-cover-copy';
                const label = document.createElement('small');
                label.textContent = free ? 'READ FREE · NFCPS' : 'GROWTH COLLECTION';
                const title = document.createElement('strong');
                title.textContent = book.title;
                const author = document.createElement('em');
                author.textContent = book.author;
                copy.append(label, title, author);
                wrap.append(art, shade, copy);
                return wrap;
              }

              function readerBook(book) {
                const id = book.id;
                return {
                  id,
                  title: book.title,
                  author: book.author,
                  cover: `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
                  summary: book.note,
                  formats: {
                    'image/jpeg': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
                    'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
                    'text/html': `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
                    'application/epub+zip': `https://www.gutenberg.org/ebooks/${id}.epub3.images`
                  }
                };
              }

              function tile(book, index, free) {
                const el = free ? document.createElement('button') : document.createElement('a');
                el.className = 'nfcps-growth-tile';
                el.dataset.search = `${book.title} ${book.author} ${book.note || ''}`.toLowerCase();
                if (free) {
                  el.type = 'button';
                  el.addEventListener('click', () => {
                    window.dispatchEvent(new CustomEvent('nfcps-open-reader', { detail: readerBook(book) }));
                  });
                } else {
                  el.href = book.url;
                }
                el.appendChild(cover(book, index, free));
                const meta = document.createElement('span');
                meta.className = 'nfcps-growth-meta';
                const title = document.createElement('strong');
                title.textContent = book.title;
                const author = document.createElement('small');
                author.textContent = book.author;
                const action = document.createElement('em');
                action.textContent = free ? 'Read in NFCPS' : `Explore · ${book.access}`;
                meta.append(title, author, action);
                el.appendChild(meta);
                return el;
              }

              function shelf(title, subtitle, items, free) {
                const section = document.createElement('section');
                section.className = 'nfcps-growth-shelf';
                const head = document.createElement('div');
                head.className = 'nfcps-growth-head';
                const copy = document.createElement('div');
                const h2 = document.createElement('h2');
                h2.textContent = title;
                const p = document.createElement('p');
                p.textContent = subtitle;
                copy.append(h2, p);
                const count = document.createElement('span');
                count.className = 'nfcps-growth-count';
                count.textContent = `${items.length} ${free ? 'books' : 'picks'}`;
                head.append(copy, count);
                const track = document.createElement('div');
                track.className = 'nfcps-growth-track';
                items.forEach((book, index) => track.appendChild(tile(book, index, free)));
                section.append(head, track);
                return section;
              }

              function syncSearch(root, page) {
                const input = page.querySelector('.books-search input, input[type="search"], input[placeholder*="Search" i]');
                const q = String(input?.value || '').trim().toLowerCase();
                root.querySelectorAll('.nfcps-growth-tile').forEach(node => {
                  node.hidden = Boolean(q) && !String(node.dataset.search || '').includes(q);
                });
                root.querySelectorAll('.nfcps-growth-shelf').forEach(section => {
                  const tiles = [...section.querySelectorAll('.nfcps-growth-tile')];
                  const visible = tiles.filter(node => !node.hidden);
                  section.hidden = visible.length === 0;
                  const count = section.querySelector('.nfcps-growth-count');
                  if (count) count.textContent = q ? `${visible.length} ${visible.length === 1 ? 'match' : 'matches'}` : count.dataset.default || count.textContent;
                });
              }

              function buildRoot() {
                const root = document.createElement('div');
                root.id = 'nfcps-native-growth-root';
                root.setAttribute('data-nfcps-native-read', 'true');
                root.append(
                  shelf('Modern Growth & Business', 'Books from your inspiration shelf and closely related titles. Modern books open legitimate book-detail or official pages.', MODERN, false),
                  shelf('Read Free · Growth Classics', 'Legal public-domain books on thought, purpose, discipline, money, character and self-mastery that open directly in the NFCPS reader.', FREE, true)
                );
                root.querySelectorAll('.nfcps-growth-count').forEach(node => node.dataset.default = node.textContent || '');
                return root;
              }

              function findReadPage() {
                return document.querySelector('.books-page,[data-view="read"],main[class*="books" i]');
              }

              function mount() {
                ensureStyle();
                const page = findReadPage();
                let root = document.getElementById('nfcps-native-growth-root');
                if (!page) {
                  if (root && !document.querySelector('.books-page,[data-view="read"]')) root.remove();
                  return false;
                }
                if (!root) root = buildRoot();
                const filters = page.querySelector('.books-filters');
                const search = page.querySelector('.books-search');
                const resume = page.querySelector('.books-resume');
                const anchor = filters || search || resume;
                if (!root.isConnected) {
                  if (anchor && anchor.parentElement) anchor.insertAdjacentElement('afterend', root);
                  else page.insertBefore(root, page.firstElementChild ? page.firstElementChild.nextSibling : null);
                }
                syncSearch(root, page);
                return true;
              }

              const state = { version: VERSION, mount };
              window.__NFCPS_NATIVE_GROWTH_DISCOVERY__ = state;

              document.addEventListener('input', event => {
                const target = event.target;
                if (!(target instanceof HTMLInputElement)) return;
                const page = findReadPage();
                const root = document.getElementById('nfcps-native-growth-root');
                if (page && root && page.contains(target)) syncSearch(root, page);
              }, true);

              const observer = new MutationObserver(() => mount());
              observer.observe(document.documentElement, { childList: true, subtree: true });
              mount();
            })();
        """;
        webView.evaluateJavascript(script, null);
    }
}
