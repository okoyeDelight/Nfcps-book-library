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

type BatchResult = {
  books: GutendexBook[];
  count: number;
  next: string | null;
};

const MAX_EBOOKS = 500;
const PAGES_PER_BATCH = 2;

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
  { id: 1653, title: "The Imitation of Christ", authors: [{ name: "Thomas, à Kempis" }], subjects: ["Devotional literature"], bookshelves: ["Christianity"], summaries: ["A devotional classic on humility, inner holiness and following Christ."], formats: { "text/html": "https://www.gutenberg.org/ebooks/1653.html.images", "image/jpeg": "https://www.gutenberg.org/cache/epub/1653/pg1653.cover.medium.jpg" }, download_count: 0 },
  { id: 5657, title: "The Practice of the Presence of God", authors: [{ name: "Brother Lawrence" }], subjects: ["Christian life"], bookshelves: ["Christianity"], summaries: ["Reflections on living with a continual awareness of God's presence in ordinary life."], formats: { "text/html": "https://www.gutenberg.org/ebooks/5657.html.images", "image/jpeg": "https://www.gutenberg.org/cache/epub/5657/pg5657.cover.medium.jpg" }, download_count: 0 },
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

async function fetchBatch(startUrl: string, pages: number, signal?: AbortSignal): Promise<BatchResult> {
  let url: string | null = startUrl;
  let count = 0;
  const collected: GutendexBook[] = [];

  for (let page = 0; page < pages && url && collected.length < MAX_EBOOKS; page += 1) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("Catalog unavailable");
    const data = (await response.json()) as GutendexResponse;
    if (!count) count = data.count;
    collected.push(...data.results);
    url = data.next;
  }

  return { books: collected.slice(0, MAX_EBOOKS), count, next: url };
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
  const [count, setCount] = useState(MAX_EBOOKS);
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
        const startUrl = `https://gutendex.com/books/?${params.toString()}`;
        const batch = await fetchBatch(startUrl, PAGES_PER_BATCH, controller.signal);
        setBooks(batch.books);
        setCount(Math.min(batch.count || MAX_EBOOKS, MAX_EBOOKS));
        setNextUrl(batch.next);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setOffline(true);
          setBooks(fallbackBooks);
          setCount(MAX_EBOOKS);
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
    if (!nextUrl || loadingMore || books.length >= MAX_EBOOKS) return;
    setLoadingMore(true);
    try {
      const batch = await fetchBatch(nextUrl, PAGES_PER_BATCH);
      setBooks((current) => {
        const ids = new Set(current.map((book) => book.id));
        const merged = [...current, ...batch.books.filter((book) => !ids.has(book.id))];
        return merged.slice(0, MAX_EBOOKS);
      });
      setNextUrl(batch.next);
    } finally {
      setLoadingMore(false);
    }
  }

  const target = Math.min(count || MAX_EBOOKS, MAX_EBOOKS);
  const visibleCount = useMemo(() => target.toLocaleString(), [target]);
  const progress = Math.min(100, Math.round((books.length / Math.max(target, 1)) * 100));
  const canLoadMore = Boolean(nextUrl) && books.length < target && books.length < MAX_EBOOKS && !offline;

  return (
    <section id="ebooks" className="ebooks-section catalog-section">
      <div className="catalog-hero">
        <div className="ebook-icon"><BookOpen size={27} /></div>
        <div>
          <span className="section-kicker">FREE DIGITAL RESOURCES</span>
          <h2>Up to 500 Free Christian E-books</h2>
          <p>
            Browse public-domain Christian books from Project Gutenberg in one place. We progressively load the collection in fast batches, so you can keep opening the shelves until as many as 500 matching books are available.
          </p>
        </div>
        <div className="catalog-count"><strong>{offline ? "500+" : visibleCount}</strong><span>browse target</span></div>
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
        <div className="catalog-notice"><WifiOff size={16} /> Live catalog could not be reached. Showing an offline sample; reload when connected to continue toward the 500-book collection.</div>
      )}

      {loading ? (
        <div className="catalog-loading"><LoaderCircle className="spin" /><span>Opening the digital shelves…</span></div>
      ) : books.length ? (
        <>
          <div className="catalog-progress">
            <div className="catalog-progress-copy"><strong>{books.length}</strong><span>loaded of up to {target}</span></div>
            <div className="catalog-progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="catalog-grid">
            {books.map((book, index) => (
              <motion.article key={book.id} className="catalog-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.35, delay: Math.min(index * 0.01, 0.12) }}>
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
          {canLoadMore && (
            <div className="load-more-wrap"><button className="load-more-button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <><LoaderCircle className="spin" size={17} /> Loading two more shelves…</> : <>Load more books <BookOpen size={16} /></>}</button></div>
          )}
          {!canLoadMore && !offline && <p className="catalog-end-note">You have reached the available books for this search/topic, capped at 500.</p>}
        </>
      ) : (
        <div className="empty-state"><Search size={30} /><h3>No free e-books found</h3><p>Try a different title, author or topic.</p></div>
      )}
    </section>
  );
}
