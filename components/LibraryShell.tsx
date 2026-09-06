"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  HeartHandshake,
  LibraryBig,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { physicalBooks, type PhysicalBook } from "@/data/books";
import EbookCatalog from "@/components/EbookCatalog";

const WHATSAPP = "2349079543695";

function requestUrl(book: PhysicalBook) {
  const text = `Hello! I would like to request “${book.title}” by ${book.author} from the NFCPS Book Library.`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function InitialCover({ book }: { book: PhysicalBook }) {
  const words = book.title.split(" ");
  return (
    <div className={`fallback-cover fallback-${((book.id - 1) % 6) + 1}`}>
      <span>NFCPS LIBRARY</span>
      <strong>{words.slice(0, 5).join(" ")}</strong>
      <small>{book.author}</small>
    </div>
  );
}

function Book3D({ book }: { book: PhysicalBook }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      aria-label={`View ${book.title}`}
      className={`book-3d ${active ? "is-active" : ""}`}
      onClick={() => setActive((value) => !value)}
    >
      <span className="book-pages" />
      <span className="book-back" />
      <span className="book-spine" />
      <span className="book-front">
        {book.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover} alt={`${book.title} cover`} loading="lazy" />
        ) : (
          <InitialCover book={book} />
        )}
        <span className="book-gloss" />
      </span>
    </button>
  );
}

function PhysicalCard({ book, index }: { book: PhysicalBook; index: number }) {
  return (
    <motion.article
      className="book-card"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, delay: Math.min(index * 0.035, 0.2) }}
    >
      <div className="book-stage">
        <Book3D book={book} />
        <div className="shelf-line" />
      </div>
      <div className="book-copy">
        <div className="book-meta-row">
          <span className="category-chip">{book.category}</span>
          {!book.verified && <span className="verify-chip">verification pending</span>}
        </div>
        <h3>{book.title}</h3>
        <p className="author">{book.author}</p>
        <p className="description">{book.description}</p>
        <div className="book-actions">
          <a className="request-button" href={requestUrl(book)} target="_blank" rel="noreferrer">
            Request Book <ExternalLink size={15} />
          </a>
          {book.source && (
            <a className="info-button" href={book.source} target="_blank" rel="noreferrer" aria-label={`Book information for ${book.title}`}>
              Info
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function LibraryShell() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(physicalBooks.map((book) => book.category))).sort()],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return physicalBooks.filter((book) => {
      const categoryMatch = category === "All" || book.category === category;
      const textMatch = !q || [book.title, book.author, book.category].some((value) => value.toLowerCase().includes(q));
      return categoryMatch && textMatch;
    });
  }, [query, category]);

  return (
    <main>
      <header className="site-header">
        <a href="#top" className="brand" aria-label="NFCPS Book Library home">
          <span className="brand-mark"><BookOpen size={21} /></span>
          <span><strong>NFCPS</strong><small>BOOK LIBRARY</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#top">Home</a>
          <a href="#library">Physical Library</a>
          <a href="#ebooks">Free E-books</a>
          <a href="#about">About</a>
        </nav>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.nav className="mobile-nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {[["Home", "#top"], ["Physical Library", "#library"], ["Free E-books", "#ebooks"], ["About", "#about"]].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <section className="hero" id="top">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="star-field" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ left: `${(i * 47) % 100}%`, top: `${(i * 71) % 92}%`, animationDelay: `${(i % 7) * 0.45}s` }} />
          ))}
        </div>
        <motion.div className="hero-inner" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>
          <div className="eyebrow"><Sparkles size={14} /> NFCPS UNIZIK CHAPTER</div>
          <h1>NFCPS <span>BOOK LIBRARY</span></h1>
          <p className="tagline">Christ, the Therapy for All.</p>
          <p className="hero-copy">Discover physical books in the fellowship library and more than 500 trusted free Christian e-books gathered into one beautiful place.</p>
          <div className="hero-actions">
            <a href="#library" className="primary-cta">Explore Library <ArrowRight size={18} /></a>
            <a href="#ebooks" className="secondary-cta">Browse 500+ Free E-books</a>
          </div>
        </motion.div>
        <motion.div className="hero-books" initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.28, duration: 0.75 }}>
          {physicalBooks.filter((book) => book.cover).slice(0, 5).map((book, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img key={book.id} src={book.cover} alt="" animate={{ y: [0, i % 2 ? 8 : -6, 0] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </motion.div>
      </section>

      <section className="stats-wrap" aria-label="Library statistics">
        <div className="stat"><strong>{physicalBooks.length}</strong><span>Physical Books</span></div>
        <div className="stat"><strong>500+</strong><span>Free E-books</span></div>
        <div className="stat"><strong>{categories.length - 1}</strong><span>Categories</span></div>
        <div className="stat"><strong>{physicalBooks.filter((book) => book.verified).length}</strong><span>Verified Titles</span></div>
      </section>

      <section id="library" className="library-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">PHYSICAL COLLECTION</span>
            <h2>Choose your next book.</h2>
            <p>Tap a book for a 3D pull-out effect, search instantly, then request the physical copy directly on WhatsApp.</p>
          </div>
          <LibraryBig size={36} />
        </div>

        <label className="search-box">
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author or category…" />
        </label>

        <div className="category-row" aria-label="Book categories">
          {categories.map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={category === item ? "category-filter active" : "category-filter"}>{item}</button>
          ))}
        </div>
        <p className="results-note">Showing {filtered.length} of {physicalBooks.length} books</p>

        {filtered.length > 0 ? (
          <div className="book-grid">{filtered.map((book, index) => <PhysicalCard key={book.id} book={book} index={index} />)}</div>
        ) : (
          <div className="empty-state"><Search size={30} /><h3>No books found</h3><p>Try another title, author or category.</p></div>
        )}
      </section>

      <EbookCatalog />

      <section id="about" className="about-section">
        <div className="about-card">
          <HeartHandshake size={35} />
          <span className="section-kicker">ABOUT THE LIBRARY</span>
          <h2>Built for growth in Christ.</h2>
          <p>NFCPS Book Library brings the UNIZIK chapter's physical collection together with trusted digital Christian resources, making it easier for students to discover, request and read books that strengthen faith and understanding.</p>
          <blockquote>“Christ, the Therapy for All.”</blockquote>
        </div>
      </section>

      <footer>
        <div className="footer-brand"><BookOpen /><div><strong>NFCPS BOOK LIBRARY</strong><span>National Fellowship of Christian Pharmacy Students · UNIZIK Chapter</span></div></div>
        <p>Christ, the Therapy for All.</p>
        <span>© 2026 NFCPS UNIZIK</span>
      </footer>
    </main>
  );
}
