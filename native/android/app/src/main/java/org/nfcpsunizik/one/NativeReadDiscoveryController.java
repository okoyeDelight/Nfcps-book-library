package org.nfcpsunizik.one;

import android.webkit.WebView;

final class NativeReadDiscoveryController {
    private NativeReadDiscoveryController() {}

    static void inject(WebView webView) {
        if (webView == null) return;
        String script = """
            (() => {
              if (window.__NFCPS_NATIVE_GROWTH_DISCOVERY_V2__) return;
              window.__NFCPS_NATIVE_GROWTH_DISCOVERY_V2__ = true;

              const ART = [
                'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=78',
                'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=78'
              ];

              const MODERN = [
                {id:-101,title:'Atomic Habits',author:'James Clear',note:'Systems, habits and small improvements that compound.',url:'https://jamesclear.com/atomic-habits',access:'Official book page'},
                {id:-102,title:'Ikigai',author:'Héctor García & Francesc Miralles',note:'Purpose, meaningful work and a life worth waking up for.',url:'https://www.penguinrandomhouse.com/books/549469/ikigai-by-hector-garcia-and-francesc-miralles/',access:'Publisher page'},
                {id:-103,title:'Rework',author:'Jason Fried & David Heinemeier Hansson',note:'A practical challenge to conventional ideas about building a business.',url:'https://www.penguinrandomhouse.com/books/56502/rework-by-jason-fried-and-david-heinemeier-hansson/9780307463746/',access:'Publisher page'},
                {id:-104,title:'Shoe Dog',author:'Phil Knight',note:'Nike’s messy, risky and persistent path from idea to global company.',url:'https://www.simonandschuster.com/books/Shoe-Dog/Phil-Knight/9781501135927',access:'Publisher page'},
                {id:-105,title:'Think Like a Monk',author:'Jay Shetty',note:'Attention, purpose, discipline and inner clarity.',url:'https://www.simonandschuster.com/books/Think-Like-a-Monk/Jay-Shetty/9781982134501',access:'Publisher page'},
                {id:-106,title:'Limitless',author:'Jim Kwik',note:'Learning, memory, focus and unlocking more of your mental capacity.',url:'https://www.penguinrandomhouse.com/books/616861/limitless-expanded-edition-by-jim-kwik/',access:'Publisher page'},
                {id:-107,title:'Hooked',author:'Nir Eyal',note:'Why products become habits and how attention-shaping systems are built.',url:'https://www.penguinrandomhouse.com/books/317898/hooked-by-nir-eyal/9780698190665/',access:'Publisher page'},
                {id:-108,title:'The Mountain Is You',author:'Brianna Wiest',note:'Self-sabotage, resilience and becoming the person capable of the climb.',url:'https://shopcatalog.com/products/the-mountain-is-you',access:'Official publisher shop'},
                {id:-109,title:'The Alchemist',author:'Paulo Coelho',note:'A story about calling, courage, desire and the cost of pursuing a dream.',url:'https://www.harpercollins.com/products/the-alchemist-paulo-coelho',access:'Publisher page'},
                {id:-110,title:'The Almanack of Naval Ravikant',author:'Eric Jorgenson',note:'A curated guide to wealth, judgment and happiness.',url:'https://www.navalmanack.com/',access:'Free official edition'}
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
                if (document.getElementById('nfcps-native-growth-style')) return;
                const style = document.createElement('style');
                style.id = 'nfcps-native-growth-style';
                style.textContent = `
                  #nfcps-native-growth-root{display:block}
                  .nfcps-growth-cover{position:relative;width:116px;height:166px;border-radius:12px;overflow:hidden;display:block;background:#173f33;box-shadow:0 13px 27px rgba(31,37,32,.15)}
                  .nfcps-growth-cover-art{position:absolute;inset:0;background-size:cover;background-position:center;filter:saturate(.78) contrast(1.04)}
                  .nfcps-growth-cover-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,20,14,.12),rgba(4,18,13,.78) 68%,rgba(3,13,10,.96))}
                  .nfcps-growth-cover-copy{position:absolute;inset:0;padding:12px 10px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.35)}
                  .nfcps-growth-cover-copy small{margin:0 0 auto;color:#e5c779;font:750 7px/1 system-ui;letter-spacing:1.25px;white-space:normal;overflow:visible}
                  .nfcps-growth-cover-copy strong{font:600 16px/1.02 Georgia,'Times New Roman',serif;min-height:0;display:block;-webkit-line-clamp:unset;overflow:visible}
                  .nfcps-growth-cover-copy em{margin-top:6px;color:rgba(255,255,255,.78);font:600 8px/1.2 system-ui;font-style:normal;white-space:normal}
                  .nfcps-native-growth-tile{text-decoration:none!important}
                  .nfcps-native-growth-tile>span:last-child em{display:flex;align-items:center;gap:4px;margin-top:6px;color:#44685c;font:700 9px/1.25 system-ui;font-style:normal}
                  .nfcps-native-growth-tile[hidden]{display:none!important}
                  .nfcps-native-growth-shelf[hidden]{display:none!important}
                  @media(min-width:720px){.nfcps-growth-cover{width:132px;height:188px}}
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
                el.className = 'books-tile nfcps-native-growth-tile';
                el.dataset.search = `${book.title} ${book.author} ${book.note || ''}`.toLowerCase();
                el.setAttribute('aria-label', free ? `Read ${book.title} in NFCPS One` : `Open official source for ${book.title}`);
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
                const title = document.createElement('strong');
                title.textContent = book.title;
                const author = document.createElement('small');
                author.textContent = book.author;
                const action = document.createElement('em');
                action.textContent = free ? '▣  Read in NFCPS' : `↗  ${book.access}`;
                meta.append(title, author, action);
                el.appendChild(meta);
                return el;
              }

              function shelf(title, subtitle, items, free) {
                const section = document.createElement('section');
                section.className = 'books-shelf nfcps-native-growth-shelf';
                section.dataset.free = free ? '1' : '0';
                const heading = document.createElement('div');
                heading.className = 'books-shelf-title';
                const copy = document.createElement('div');
                const h2 = document.createElement('h2');
                h2.textContent = title;
                const p = document.createElement('p');
                p.textContent = subtitle;
                copy.append(h2, p);
                const count = document.createElement('span');
                count.textContent = `${items.length} ${items.length === 1 ? 'book' : free ? 'books' : 'picks'}`;
                heading.append(copy, count);
                const track = document.createElement('div');
                track.className = 'books-track';
                items.forEach((book, index) => track.appendChild(tile(book, index, free)));
                section.append(heading, track);
                return section;
              }

              function syncSearch() {
                const root = document.getElementById('nfcps-native-growth-root');
                if (!root) return;
                const input = document.querySelector('.books-page .books-search input');
                const q = String(input?.value || '').trim().toLowerCase();
                root.querySelectorAll('.nfcps-native-growth-tile').forEach(node => {
                  node.hidden = Boolean(q) && !String(node.dataset.search || '').includes(q);
                });
                root.querySelectorAll('.nfcps-native-growth-shelf').forEach(section => {
                  const visible = [...section.querySelectorAll('.nfcps-native-growth-tile')].some(node => !node.hidden);
                  section.hidden = !visible;
                  const count = section.querySelector('.books-shelf-title>span');
                  if (count) {
                    const n = [...section.querySelectorAll('.nfcps-native-growth-tile')].filter(node => !node.hidden).length;
                    count.textContent = `${n} ${n === 1 ? 'match' : 'matches'}`;
                  }
                });
              }

              function mount() {
                ensureStyle();
                const filters = document.querySelector('.books-page .books-filters');
                if (!filters || !filters.parentElement) return;
                if (document.getElementById('nfcps-native-growth-root')) {
                  syncSearch();
                  return;
                }
                const root = document.createElement('div');
                root.id = 'nfcps-native-growth-root';
                root.append(
                  shelf('Modern Growth & Business', 'Books from your inspiration shelf, linked only to legitimate official or publisher sources.', MODERN, false),
                  shelf('Read Free · Growth Classics', 'Related themes — habits, focus, money, purpose, character and self-mastery — in legal public-domain editions.', FREE, true)
                );
                filters.insertAdjacentElement('afterend', root);
                syncSearch();
              }

              document.addEventListener('input', event => {
                if (event.target instanceof HTMLInputElement && event.target.matches('.books-page .books-search input')) syncSearch();
              }, true);
              const observer = new MutationObserver(() => mount());
              observer.observe(document.documentElement, { childList: true, subtree: true });
              mount();
            })();
        """;
        webView.evaluateJavascript(script, null);
    }
}
