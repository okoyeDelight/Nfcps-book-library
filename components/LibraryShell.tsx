"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  HeartHandshake,
  LibraryBig,
  Menu,
  Rotate3D,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { physicalBooks, type PhysicalBook } from "@/data/library";
import { recommendedChristianBooks, type RecommendedBook } from "@/data/recommended";
import EbookCatalog from "@/components/EbookCatalog";

const WHATSAPP = "2349079543695";

function requestUrl(book: PhysicalBook) {
  const text = `Hello! I would like to request “${book.title}” by ${book.author} from the NFCPS Book Library.`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function InitialCover({ book }: { book: PhysicalBook }) {
  return (
    <div className={`fallback-cover fallback-${((book.id - 1) % 6) + 1}`}>
      <span>NFCPS LIBRARY</span>
      <strong>{book.title.split(" ").slice(0, 7).join(" ")}</strong>
      <small>{book.author}</small>
    </div>
  );
}

function BookArtwork({ book }: { book: PhysicalBook }) {
  const [failed, setFailed] = useState(false);
  if (!book.cover || failed) return <InitialCover book={book} />;
  return <img src={book.cover} alt={`${book.title} cover`} loading="lazy" onError={() => setFailed(true)} />;
}

function BookRear({ book }: { book: PhysicalBook }) {
  return (
    <span className="book-rear-inner">
      <small>NFCPS · UNIZIK</small>
      <BookOpen size={30} />
      <strong>{book.title}</strong>
      <span>{book.author}</span>
      <em>Christ, the Therapy for All.</em>
    </span>
  );
}

function Book3D({ book }: { book: PhysicalBook }) {
  const [turns, setTurns] = useState(0);
  const angle = turns * 180 - 12;
  return (
    <>
      <button
        type="button"
        aria-label={`Turn ${book.title} in 3D`}
        className="book-3d"
        style={{ transform: `rotateY(${angle}deg) rotateX(2deg)` }}
        onClick={() => setTurns((value) => value + 1)}
      >
        <span className="book-pages" />
        <span className="book-spine" />
        <span className="book-front"><BookArtwork book={book} /><span className="book-gloss" /></span>
        <span className="book-rear"><BookRear book={book} /></span>
      </button>
      <span className="flip-hint"><Rotate3D size={13} /> Tap book to keep turning it</span>
    </>
  );
}

function PhysicalCard({ book, index, onOpen }: { book: PhysicalBook; index: number; onOpen: () => void }) {
  return (
    <motion.article className="book-card" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.42, delay: Math.min(index * 0.035, 0.2) }}>
      <div className="book-stage"><Book3D book={book} /><div className="shelf-line" /></div>
      <div className="book-copy">
        <div className="book-meta-row"><span className="category-chip">{book.category}</span>{!book.verified && <span className="verify-chip">verification pending</span>}</div>
        <h3>{book.title}</h3>
        <p className="author">{book.author}</p>
        <p className="description">{book.description}</p>
        <div className="book-actions book-actions-three">
          <button type="button" className="details-button" onClick={onOpen}><Eye size={15} /> Details</button>
          <a className="request-button" href={requestUrl(book)} target="_blank" rel="noreferrer">Request <ExternalLink size={15} /></a>
          {book.source && <a className="info-button" href={book.source} target="_blank" rel="noreferrer" aria-label={`Book information for ${book.title}`}>Info</a>}
        </div>
      </div>
    </motion.article>
  );
}

function RecommendedCard({ book, index }: { book: RecommendedBook; index: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <motion.article className="recommended-card" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.38, delay: Math.min(index * 0.025, 0.16) }}>
      <div className="recommended-cover-stage">
        <div className="recommended-book">
          {!failed ? <img src={book.cover} alt={`${book.title} cover`} loading="lazy" onError={() => setFailed(true)} /> : <div className="recommended-fallback"><small>NFCPS RECOMMENDS</small><strong>{book.title}</strong><span>{book.author}</span></div>}
          <span className="recommended-pages" />
        </div>
      </div>
      <div className="recommended-copy">
        <div className="book-meta-row"><span className="category-chip">{book.category}</span><span className={book.free ? "free-chip" : "recommended-chip"}>{book.free ? "free classic" : "recommended"}</span></div>
        <h3>{book.title}</h3>
        <p className="author">{book.author}</p>
        <p className="description">{book.description}</p>
        <a className={book.free ? "download-button" : "secondary-cta recommended-link"} href={book.href} target="_blank" rel="noreferrer">
          {book.free ? <>Read / Download Free <Download size={15} /></> : <>Learn more <ExternalLink size={15} /></>}
        </a>
      </div>
    </motion.article>
  );
}

function BookModal({ book, onClose }: { book: PhysicalBook | null; onClose: () => void }) {
  useEffect(() => {
    if (!book) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyHandler = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", keyHandler);
    return () => { document.body.style.overflow = original; window.removeEventListener("keydown", keyHandler); };
  }, [book, onClose]);

  return (
    <AnimatePresence>
      {book && (
        <motion.div className="book-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div className="book-modal" role="dialog" aria-modal="true" aria-label={`${book.title} details`} initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ type: "spring", stiffness: 280, damping: 28 }} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close book details"><X size={20} /></button>
            <div className="modal-book-stage">
              <div className="modal-book-3d modal-auto-spin">
                <span className="modal-book-pages" />
                <span className="modal-book-spine" />
                <span className="modal-book-front"><BookArtwork book={book} /><span className="book-gloss" /></span>
                <span className="modal-book-rear"><BookRear book={book} /></span>
              </div>
              <div className="modal-shelf" />
              <span className="modal-spin-label"><Rotate3D size={14} /> 360° preview</span>
            </div>
            <div className="modal-copy">
              <div className="book-meta-row"><span className="category-chip">{book.category}</span><span className={book.verified ? "verified-chip" : "verify-chip"}>{book.verified ? "verified title" : "edition verification pending"}</span></div>
              <h2>{book.title}</h2><p className="modal-author">{book.author}</p><p className="modal-description">{book.description}</p>
              <div className="modal-note"><BookOpen size={18} /><span>This is part of the NFCPS UNIZIK physical collection. Requesting it opens WhatsApp with the title already filled in.</span></div>
              <div className="modal-actions"><a className="primary-cta modal-request" href={requestUrl(book)} target="_blank" rel="noreferrer">Request this book <ExternalLink size={17} /></a>{book.source && <a className="secondary-cta" href={book.source} target="_blank" rel="noreferrer">View book information</a>}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LibraryShell() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeBook, setActiveBook] = useState<PhysicalBook | null>(null);
  const categories = useMemo(() => ["All", ...Array.from(new Set(physicalBooks.map((book) => book.category))).sort()], []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return physicalBooks.filter((book) => (category === "All" || book.category === category) && (!q || [book.title, book.author, book.category].some((value) => value.toLowerCase().includes(q))));
  }, [query, category]);

  const navItems = [["Home", "#top"], ["Physical Library", "#library"], ["Recommended", "#recommended"], ["Free E-books", "#ebooks"], ["About", "#about"], ["Admin", "/admin"]];

  return (
    <main>
      <header className="site-header">
        <a href="#top" className="brand" aria-label="NFCPS Book Library home"><span className="brand-mark"><BookOpen size={21} /></span><span><strong>NFCPS</strong><small>BOOK LIBRARY</small></span></a>
        <nav className="desktop-nav" aria-label="Primary navigation">{navItems.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        <AnimatePresence>{menuOpen && <motion.nav className="mobile-nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>{navItems.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</motion.nav>}</AnimatePresence>
      </header>

      <section className="hero" id="top">
        <div className="ambient ambient-one" /><div className="ambient ambient-two" />
        <div className="star-field" aria-hidden="true">{Array.from({ length: 24 }).map((_, i) => <span key={i} style={{ left: `${(i * 47) % 100}%`, top: `${(i * 71) % 92}%`, animationDelay: `${(i % 7) * 0.45}s` }} />)}</div>
        <motion.div className="hero-inner" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}><div className="eyebrow"><Sparkles size={14} /> NFCPS UNIZIK CHAPTER</div><h1>NFCPS <span>BOOK LIBRARY</span></h1><p className="tagline">Christ, the Therapy for All.</p><p className="hero-copy">Discover physical books in the fellowship library, curated Christian recommendations and up to 500 trusted free public-domain e-books.</p><div className="hero-actions"><a href="#library" className="primary-cta">Explore Library <ArrowRight size={18} /></a><a href="#ebooks" className="secondary-cta">Browse Free E-books</a></div></motion.div>
        <motion.div className="hero-books" initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.28, duration: 0.75 }}>{physicalBooks.filter((book) => book.cover).slice(0, 5).map((book, i) => <motion.img key={book.id} src={book.cover} alt="" animate={{ y: [0, i % 2 ? 8 : -6, 0], rotate: [i - 2, 2 - i, i - 2] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }} />)}</motion.div>
      </section>

      <section className="stats-wrap" aria-label="Library statistics"><div className="stat"><strong>{physicalBooks.length}</strong><span>Physical Books</span></div><div className="stat"><strong>500</strong><span>E-book Browse Cap</span></div><div className="stat"><strong>{recommendedChristianBooks.length}</strong><span>Recommended Reads</span></div><div className="stat"><strong>{categories.length - 1}</strong><span>Categories</span></div></section>

      <section id="library" className="library-section">
        <div className="section-heading"><div><span className="section-kicker">PHYSICAL COLLECTION</span><h2>Choose your next book.</h2><p>Tap the actual 3D book to turn it over again and again. Use Details for a full rotating preview, or request the physical copy on WhatsApp.</p></div><LibraryBig size={36} /></div>
        <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author or category…" /></label>
        <div className="category-row" aria-label="Book categories">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "category-filter active" : "category-filter"}>{item}</button>)}</div>
        <p className="results-note">Showing {filtered.length} of {physicalBooks.length} books</p>
        {filtered.length ? <div className="book-grid">{filtered.map((book, index) => <PhysicalCard key={book.id} book={book} index={index} onOpen={() => setActiveBook(book)} />)}</div> : <div className="empty-state"><Search size={30} /><h3>No books found</h3><p>Try another title, author or category.</p></div>}
      </section>

      <section id="recommended" className="recommended-section">
        <div className="section-heading"><div><span className="section-kicker">NFCPS RECOMMENDS</span><h2>Recommended Christian Reads.</h2><p>A growing shortlist for prayer, discipleship, theology, apologetics and spiritual formation. Free classics link to legal public-domain copies; modern titles link only to book information.</p></div><Star size={36} /></div>
        <div className="recommended-grid">{recommendedChristianBooks.map((book, index) => <RecommendedCard key={book.id} book={book} index={index} />)}</div>
      </section>

      <EbookCatalog />

      <section id="about" className="about-section"><div className="about-card"><HeartHandshake size={35} /><span className="section-kicker">ABOUT THE LIBRARY</span><h2>Built for growth in Christ.</h2><p>NFCPS Book Library brings the UNIZIK chapter's physical collection together with trusted digital Christian resources, making it easier for students to discover, request and read books that strengthen faith and understanding.</p><blockquote>“Christ, the Therapy for All.”</blockquote></div></section>
      <footer><div className="footer-brand"><BookOpen /><div><strong>NFCPS BOOK LIBRARY</strong><span>National Fellowship of Christian Pharmacy Students · UNIZIK Chapter</span></div></div><p>Christ, the Therapy for All.</p><span>© 2026 NFCPS UNIZIK</span></footer>
      <BookModal book={activeBook} onClose={() => setActiveBook(null)} />
    </main>
  );
}
