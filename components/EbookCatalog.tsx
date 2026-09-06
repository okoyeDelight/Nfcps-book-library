"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Download, ExternalLink, LoaderCircle, Search, WifiOff } from "lucide-react";

type GutendexAuthor = { name: string };
type GutendexBook = {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  bookshelves: string[];
  summaries?: string[];
  formats: Record<string, string>;
  download_count: number;
};
type GutendexResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
};

const TOPICS = [
  ["Christianity", "Christianity"],
  ["Bible", "Bible"],
  ["Theology", "Theology"],
  ["Prayer", "Prayer"],
  ["Sermons", "Sermons"],
  ["Missions", "Missions"],
  ["Devotional", "Devotional literature"],
] as const;

const fallbackBooks: GutendexBook[] = [
  { id: 131, title: "The Pilgrim's Progress", authors: [{ name: "Bunyan, John" }], subjects: ["Christian life"], bookshelves: ["Christianity"], summaries: ["A classic Christian allegory of a believer's journey toward the Celestial City."], formats: { "text/html": "https://www.gutenberg.org/ebooks/131.html.images", "image/jpeg": "https://www.gutenberg.org/cache/epub/131/pg131.cover.medium.jpg" }, download_count: 0 },
  { id: 1653, title: "The Imitation of Christ", authors: [{ name: "Thomas, à Kempis" }], subjects: ["Devotional literature"], bookshelves: ["Christianity"], summaries: ["A devotional classic on humility, inner holiness and following Christ."], formats: { "text/html": "https://www.gutenberg.org/ebooks/1653.html.images" }, download_count: 0 },
  { id: 5657, title: "The Practice of the Presence of God", authors: [{ name: "Brother Lawrence" }], subjects: ["Christian life"], bookshelves: ["Christianity"], summaries: ["Reflections on living with a continual awareness of God's presence in ordinary life."], formats: { "text/html": "https://www.gutenberg.org/ebooks/5657.html.images" }, download_count: 0 },
];

function authorName(book: GutendexBook) {
  if (!book.authors.length) return "Unknown author";
  return book.authors.map((author) => author.name.replace(/, ([^,]+)$/, " $1")).join(", ");
}

function coverUrl(book: GutendexBook) {
  return book.formats["image/jpeg"] || "";
}

function downloadUrl(book: GutendexBook) {
  return (
    book.formats["application/epub+zip"] ||
    book.formats["application/x-mobipocket-ebook"] ||
    book.formats["text/html"] ||
    book.formats["text/plain; charset=utf-8"] ||
    `https://www.gutenberg.org/ebooks/${book.id}`
  );
}

function shortDescription(book: GutendexBook) {
  const summary = book.summaries?.[0];
  if (summary) return summary.length > 215 ? `${summary.slice(0, 212)}…` : summary;
  const subject = book.subjects.slice(0, 2).join(" · ");
  return subject || "A public-domain Christian resource available free through Project Gutenberg.";
}

function EbookCover({ book }: { book: GutendexBook }) {
  const cover = coverUrl(book);
  if (cover) {
    return (
      <div className="catalog-book-3d">
        <span className="catalog-pages" />
        <span className="catalog-spine" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={`${book.title} cover`} loading="lazy" />
      </div>
    );
  }
  return (
    <div className="catalog-book-3d catalog-fallback">
      <span className="catalog-pages" />
      <span className="catalog-spine" />
      <span className="catalog-fallback-inner">
        <small>PROJECT GUTENBERG</small>
        <strong>{book.title}</strong>
        <em>{authorName(book)}</em>
      </span>
    </div>
  );
}

export default function EbookCatalog() {
  const [topic, setTopic] = useState("Christianity");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [books, setBooks] = useState<GutendexBook[]>(fallbackBooks);
  const [count, setCount] = useState(500);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 450);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setOffline(false);
      try {
        const params = new URLSearchParams({ languages: "en", topic, sort: "popular" });
        if (debouncedQuery) params.set("search", debouncedQuery);
        const response = await fetch(`https://gutendex.com/books/?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog unavailable");
        const data = (await response.json()) as GutendexResponse;
        setBooks(data.results);
        setCount(data.count);
        setNextUrl(data.next);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setOffline(true);
          setBooks(fallbackBooks);
          setCount(500);
          setNextUrl(null);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [topic, debouncedQuery]);

  async function loadMore() {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(nextUrl);
      if (!response.ok) throw new Error("Could not load more");
      const data = (await response.json()) as GutendexResponse;
      setBooks((current) => {
        const ids = new Set(current.map((book) => book.id));
        return [...current, ...data.results.filter((book) => !ids.has(book.id))];
      });
      setNextUrl(data.next);
    } finally {
      setLoadingMore(false);
    }
  }

  const visibleCount = useMemo(() => count.toLocaleString(), [count]);

  return (
    <section id="ebooks" className="ebooks-section catalog-section">
      <div className="catalog-hero">
        <div className="ebook-icon"><BookOpen size={27} /></div>
        <div>
          <span className="section-kicker">FREE DIGITAL RESOURCES</span>
          <h2>500+ Free Christian E-books</h2>
          <p>
            Browse public-domain Christian books from Project Gutenberg in one place. Covers, authors and download formats are loaded from the live Gutenberg catalog, while downloads remain on the original trusted source.
          </p>
        </div>
        <div className="catalog-count"><strong>{offline ? "500+" : visibleCount}</strong><span>titles in this collection</span></div>
      </div>

      <div className="catalog-toolbar">
        <label className="search-box catalog-search">
          <Search size={19} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search free e-books by title or author…" />
        </label>
        <div className="catalog-topics" aria-label="E-book topics">
          {TOPICS.map(([label, value]) => (
            <button key={value} className={topic === value ? "category-filter active" : "category-filter"} onClick={() => setTopic(value)}>{label}</button>
          ))}
        </div>
      </div>

      {offline && (
        <div className="catalog-notice"><WifiOff size={16} /> Live catalog could not be reached. Showing a small offline sample; reload when connected to browse the full 500+ collection.</div>
      )}

      {loading ? (
        <div className="catalog-loading"><LoaderCircle className="spin" /><span>Opening the digital shelves…</span></div>
      ) : books.length ? (
        <>
          <p className="results-note">Showing {books.length} books · {offline ? "500+" : visibleCount} available for this topic</p>
          <div className="catalog-grid">
            {books.map((book, index) => (
              <motion.article key={book.id} className="catalog-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35, delay: Math.min(index * 0.018, 0.15) }}>
                <div className="catalog-cover-stage"><EbookCover book={book} /></div>
                <div className="catalog-copy">
                  <span className="source-chip">Project Gutenberg #{book.id}</span>
                  <h3>{book.title}</h3>
                  <p className="author">{authorName(book)}</p>
                  <p className="description">{shortDescription(book)}</p>
                  <div className="catalog-actions">
                    <a className="download-button" href={downloadUrl(book)} target="_blank" rel="noreferrer">Download Free <Download size={15} /></a>
                    <a className="info-button catalog-info" href={`https://www.gutenberg.org/ebooks/${book.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${book.title} on Project Gutenberg`}><ExternalLink size={15} /></a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
          {nextUrl && !offline && (
            <div className="load-more-wrap"><button className="load-more-button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <><LoaderCircle className="spin" size={17} /> Loading…</> : <>Load more books <Download size={16} /></>}</button></div>
          )}
        </>
      ) : (
        <div className="empty-state"><Search size={30} /><h3>No free e-books found</h3><p>Try a different title, author or topic.</p></div>
      )}
    </section>
  );
}
