'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Download, LoaderCircle, Search } from 'lucide-react';
import { api } from '@appdeploy/client';
import { openReader, type ReaderBook } from './ReaderExperience';

type EBook = {
    id: number;
    title: string;
    authors: { name: string }[];
    subjects: string[];
    summaries?: string[];
    formats: Record<string, string>;
};

type EResponse = {
    count: number;
    next: string | null;
    results: EBook[];
    degraded?: boolean;
};

type CacheEntry = {
    books: EBook[];
    count: number;
    next: string | null;
    at: number;
};

type FilterKey = 'All' | 'Prayer' | 'Bible' | 'Theology' | 'Devotional' | 'Growth' | 'Missions' | 'Sermons';

type CoreRow = {
    id: number;
    title: string;
    author: string;
    subjects: string[];
    summary: string;
};

const makeBook = ({ id, title, author, subjects, summary }: CoreRow): EBook => ({
    id,
    title,
    authors: [{ name: author }],
    subjects,
    summaries: [summary],
    formats: {
        'image/jpeg': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
        'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
        'text/html': `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
        'application/epub+zip': `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
    },
});

const CORE_ROWS: CoreRow[] = [
    { id: 25141, title: 'The Pursuit of God', author: 'A. W. Tozer', subjects: ['Christianity', 'Prayer', 'Devotional', 'Spiritual Growth'], summary: 'A devotional classic about seeking God Himself beyond routine religious experience.' },
    { id: 131, title: 'The Pilgrim\'s Progress', author: 'John Bunyan', subjects: ['Christianity', 'Faith', 'Devotional', 'Spiritual Growth'], summary: 'A Christian allegory about perseverance, temptation and the journey of faith.' },
    { id: 1653, title: 'The Imitation of Christ', author: 'Thomas à Kempis', subjects: ['Christianity', 'Devotional', 'Spiritual Growth'], summary: 'A classic devotional work on humility, inward life and following Christ.' },
    { id: 57121, title: 'Humility: The Beauty of Holiness', author: 'Andrew Murray', subjects: ['Christianity', 'Devotional', 'Holiness', 'Spiritual Growth'], summary: 'Andrew Murray reflects on humility as a central mark of Christlike holiness.' },
    { id: 16769, title: 'Orthodoxy', author: 'G. K. Chesterton', subjects: ['Christianity', 'Theology', 'Apologetics'], summary: 'A lively exploration of Christian faith, reason, wonder and belief.' },
    { id: 26709, title: 'Lord, Teach Us To Pray', author: 'Andrew Murray', subjects: ['Christianity', 'Prayer', 'Devotional'], summary: 'Practical devotional teaching on learning prayer from Christ.' },
    { id: 3296, title: 'The Confessions of St. Augustine', author: 'St. Augustine', subjects: ['Christianity', 'Devotional', 'Theology', 'Spiritual Growth'], summary: 'Augustine\'s influential spiritual autobiography of conversion, grace and the search for God.' },
    { id: 21190, title: 'Expositions of Holy Scripture: Epistles', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Commentary', 'Sermons'], summary: 'Expository studies from several New Testament epistles.' },
    { id: 470, title: 'Heretics', author: 'G. K. Chesterton', subjects: ['Christianity', 'Theology', 'Apologetics'], summary: 'Essays examining ideas, culture and belief from Chesterton\'s Christian perspective.' },
    { id: 53527, title: 'The Existence and Attributes of God', author: 'Stephen Charnock', subjects: ['Christianity', 'Theology', 'Doctrine'], summary: 'A substantial classic treatment of the existence and attributes of God.' },
    { id: 1549, title: 'Commentary on the Epistle to the Galatians', author: 'Martin Luther', subjects: ['Christianity', 'Bible', 'Commentary', 'Theology'], summary: 'Martin Luther\'s exposition of Galatians with emphasis on grace and faith.' },
    { id: 654, title: 'Grace Abounding to the Chief of Sinners', author: 'John Bunyan', subjects: ['Christianity', 'Devotional', 'Grace', 'Spiritual Growth'], summary: 'John Bunyan\'s personal account of conviction, grace and Christian experience.' },
    { id: 13871, title: 'The Practice of the Presence of God', author: 'Brother Lawrence', subjects: ['Christianity', 'Prayer', 'Devotional', 'Spiritual Growth'], summary: 'Short conversations and letters about living consciously in God\'s presence.' },
    { id: 34736, title: 'True Christianity', author: 'Johann Arndt', subjects: ['Christianity', 'Devotional', 'Theology', 'Spiritual Growth'], summary: 'A classic call to inward renewal and practical Christian life.' },
    { id: 24989, title: 'A Short Method of Prayer', author: 'Jeanne Guyon', subjects: ['Christianity', 'Prayer', 'Devotional'], summary: 'A concise devotional guide to prayer and inward communion with God.' },
    { id: 1911, title: 'Concerning Christian Liberty', author: 'Martin Luther', subjects: ['Christianity', 'Theology', 'Faith'], summary: 'Luther\'s classic reflection on Christian freedom, faith and service.' },
    { id: 23038, title: 'Quiet Talks on the Crowned Christ of Revelation', author: 'S. D. Gordon', subjects: ['Christianity', 'Bible', 'Devotional', 'Theology'], summary: 'Devotional reflections on Christ and themes from the book of Revelation.' },
    { id: 26881, title: 'The Gospel of Luke: An Exposition', author: 'Charles R. Erdman', subjects: ['Christianity', 'Bible', 'Commentary'], summary: 'An accessible exposition of the Gospel of Luke.' },
    { id: 418, title: 'A Treatise on Good Works', author: 'Martin Luther', subjects: ['Christianity', 'Theology', 'Spiritual Growth'], summary: 'A Reformation-era treatment of faith, obedience and Christian good works.' },
    { id: 13601, title: 'Expositions of Holy Scripture: Romans and Corinthians', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Commentary', 'Sermons'], summary: 'Expository sermons and studies from Romans and Corinthians.' },
    { id: 7925, title: 'Expositions of Holy Scripture: Psalms', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Psalms', 'Sermons'], summary: 'Expository reflections and sermons from the Psalms.' },
    { id: 8070, title: 'Expositions of Holy Scripture: St. John I–XIV', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Gospel', 'Sermons'], summary: 'Expository sermons covering the opening fourteen chapters of John.' },
    { id: 20160, title: 'A History of American Christianity', author: 'Leonard Woolsey Bacon', subjects: ['Christianity', 'History', 'Missions'], summary: 'A historical survey of the development of Christianity in America.' },
    { id: 8200, title: 'Expositions of Holy Scripture: St. Luke', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Gospel', 'Sermons'], summary: 'Expository sermons and studies from the Gospel of Luke.' },
    { id: 11553, title: 'The Wonders of Prayer', author: 'Various', subjects: ['Christianity', 'Prayer', 'Devotional'], summary: 'Accounts and reflections centered on prayer and answers to prayer.' },
    { id: 53346, title: 'The Analogy of Religion', author: 'Joseph Butler', subjects: ['Christianity', 'Theology', 'Apologetics'], summary: 'Joseph Butler\'s classic philosophical defense of revealed and natural religion.' },
    { id: 1722, title: 'Martin Luther\'s Large Catechism', author: 'Martin Luther', subjects: ['Christianity', 'Theology', 'Doctrine', 'Bible'], summary: 'Luther\'s extended teaching on core Christian doctrine and the catechism.' },
    { id: 19939, title: 'History of the Missions to the Oriental Churches, Vol. II', author: 'Rufus Anderson', subjects: ['Christianity', 'Missions', 'History'], summary: 'A historical account of Protestant mission work among Oriental churches.' },
    { id: 25133, title: 'Spiritual Torrents', author: 'Jeanne Guyon', subjects: ['Christianity', 'Devotional', 'Prayer', 'Spiritual Growth'], summary: 'A devotional work on stages of the inward spiritual life.' },
    { id: 7883, title: 'Expositions of Holy Scripture: Historical Books and Wisdom', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Commentary', 'Sermons'], summary: 'Expositions spanning Kings, Chronicles, Ezra, Nehemiah, Esther, Job and wisdom literature.' },
    { id: 13341, title: 'Hymns and Spiritual Songs', author: 'Isaac Watts', subjects: ['Christianity', 'Devotional', 'Worship'], summary: 'A historic collection of Christian hymns and spiritual songs.' },
    { id: 8068, title: 'Expositions of Holy Scripture: Deuteronomy to Second Kings', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Commentary', 'Sermons'], summary: 'Expository sermons across major Old Testament historical passages.' },
    { id: 14139, title: 'New Tabernacle Sermons', author: 'T. De Witt Talmage', subjects: ['Christianity', 'Sermons', 'Devotional'], summary: 'A collection of historic Christian sermons for preaching and devotional reading.' },
    { id: 19100, title: 'The Covenants and the Covenanters', author: 'James Kerr', subjects: ['Christianity', 'Theology', 'History'], summary: 'Historical and theological material on the Scottish Covenanters and covenant faith.' },
    { id: 16700, title: 'The Ancient Church', author: 'W. D. Killen', subjects: ['Christianity', 'History', 'Theology'], summary: 'A history of the early church, including doctrine, worship and constitution.' },
    { id: 7351, title: 'Expositions of Holy Scripture: St. Matthew IX–XXVIII', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Gospel', 'Sermons'], summary: 'Expository sermons from the middle and later chapters of Matthew.' },
    { id: 13166, title: 'The Psalms of David', author: 'Isaac Watts', subjects: ['Christianity', 'Bible', 'Psalms', 'Worship'], summary: 'Isaac Watts\' metrical Christian renderings of the Psalms.' },
    { id: 8397, title: 'Expositions of Holy Scripture: The Acts', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Acts', 'Sermons'], summary: 'Expository sermons and studies from the Acts of the Apostles.' },
    { id: 17678, title: 'The Apology of the Church of England', author: 'John Jewel', subjects: ['Christianity', 'Theology', 'Apologetics', 'History'], summary: 'A Reformation-era defense and explanation of the Church of England.' },
    { id: 8069, title: 'Expositions of Holy Scripture: Isaiah and Jeremiah', author: 'Alexander Maclaren', subjects: ['Christianity', 'Bible', 'Prophets', 'Sermons'], summary: 'Expository sermons and studies from Isaiah and Jeremiah.' },
    { id: 65115, title: 'Power Through Prayer', author: 'Edward M. Bounds', subjects: ['Christianity', 'Prayer', 'Devotional', 'Spiritual Growth'], summary: 'A classic call to a deeper life of prayer, especially for Christian ministry.' },
    { id: 29296, title: 'The Ministry of Intercession', author: 'Andrew Murray', subjects: ['Christianity', 'Prayer', 'Intercession', 'Devotional'], summary: 'Andrew Murray\'s plea for sustained intercessory prayer.' },
    { id: 66112, title: 'Purpose in Prayer', author: 'Edward M. Bounds', subjects: ['Christianity', 'Prayer', 'Devotional'], summary: 'Reflections on the purpose, persistence and spiritual work of prayer.' },
    { id: 13196, title: 'Quiet Talks on Prayer', author: 'S. D. Gordon', subjects: ['Christianity', 'Prayer', 'Devotional'], summary: 'Warm, practical devotional talks on prayer and fellowship with God.' },
];

const CORE = CORE_ROWS.map(makeBook);

const FILTERS: { label: FilterKey; remoteTopic: string; terms: string[] }[] = [
    { label: 'All', remoteTopic: 'Christianity', terms: [] },
    { label: 'Prayer', remoteTopic: 'Prayer', terms: ['prayer', 'intercession'] },
    { label: 'Bible', remoteTopic: 'Bible', terms: ['bible', 'commentary', 'gospel', 'psalms', 'acts', 'prophets', 'scripture'] },
    { label: 'Theology', remoteTopic: 'Theology', terms: ['theology', 'doctrine', 'apologetics'] },
    { label: 'Devotional', remoteTopic: 'Devotional literature', terms: ['devotional', 'holiness', 'worship'] },
    { label: 'Growth', remoteTopic: 'Spiritual life', terms: ['spiritual growth', 'faith', 'grace', 'holiness'] },
    { label: 'Missions', remoteTopic: 'Missions', terms: ['missions'] },
    { label: 'Sermons', remoteTopic: 'Sermons', terms: ['sermons'] },
];

const TTL = 30 * 60 * 1000;

const author = (book: EBook) => book.authors.length
    ? book.authors.map(item => item.name.replace(/, ([^,]+)$/, ' $1')).join(', ')
    : 'Unknown author';

const cover = (book: EBook) => book.formats['image/jpeg'] || '';

const download = (book: EBook) => book.formats['application/epub+zip']
    || book.formats['text/html']
    || `https://www.gutenberg.org/ebooks/${book.id}`;

const readerBook = (book: EBook): ReaderBook => ({
    id: book.id,
    title: book.title,
    author: author(book),
    formats: book.formats,
    cover: cover(book),
    summary: book.summaries?.[0],
});

const merge = (first: EBook[], second: EBook[]) => Array.from(
    new Map([...first, ...second].map(book => [book.id, book])).values(),
);

const cacheKey = (filter: FilterKey, query: string) => `nfcps-books-v7:${filter}:${query.trim().toLowerCase()}`;

const readCache = (key: string): CacheEntry | null => {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const entry = JSON.parse(raw) as CacheEntry;
        if (!Array.isArray(entry.books) || !entry.books.length || Date.now() - entry.at > TTL) {
            sessionStorage.removeItem(key);
            return null;
        }
        return entry;
    } catch {
        return null;
    }
};

const writeCache = (key: string, entry: CacheEntry) => {
    if (!entry.books.length) return;
    try {
        sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
        // The locally-owned core remains available if session storage is full or disabled.
    }
};

const matchesFilter = (book: EBook, filter: FilterKey) => {
    if (filter === 'All') return true;
    const definition = FILTERS.find(item => item.label === filter);
    if (!definition) return true;
    const haystack = `${book.title} ${author(book)} ${book.subjects.join(' ')}`.toLowerCase();
    return definition.terms.some(term => haystack.includes(term));
};

const localMatch = (filter: FilterKey, query: string) => {
    const needle = query.trim().toLowerCase();
    return CORE.filter(book => {
        if (!matchesFilter(book, filter)) return false;
        if (!needle) return true;
        const haystack = `${book.title} ${author(book)} ${book.subjects.join(' ')}`.toLowerCase();
        return haystack.includes(needle);
    });
};

const catalog = async (filter: FilterKey, query: string, cursor?: string | null) => {
    const definition = FILTERS.find(item => item.label === filter) || FILTERS[0];
    const params = new URLSearchParams({ topic: definition.remoteTopic });
    if (query.trim()) params.set('search', query.trim());
    if (cursor) params.set('cursor', cursor);
    const response = await api.get(`/api/ebooks/catalog?${params}`);
    return response.data as EResponse;
};

function BookCard({ book, rail = false }: { book: EBook; rail?: boolean }) {
    const [badCover, setBadCover] = useState(false);
    return (
        <article className={rail ? 'read-book-v2 rail' : 'read-book-v2'}>
            <button className='read-cover-v2' onClick={() => openReader(readerBook(book))} aria-label={`Read ${book.title}`}>
                {cover(book) && !badCover ? (
                    <img src={cover(book)} alt={`${book.title} cover`} loading='lazy' onError={() => setBadCover(true)} />
                ) : (
                    <span>
                        <small>NFCPS ONE</small>
                        <strong>{book.title}</strong>
                        <em>{author(book)}</em>
                    </span>
                )}
            </button>
            <div className='read-book-v2-copy'>
                <h3>{book.title}</h3>
                <p>{author(book)}</p>
                {!rail && (
                    <div>
                        <button onClick={() => openReader(readerBook(book))}><BookOpen />Read</button>
                        <a href={download(book)} target='_blank' rel='noreferrer' aria-label={`Download ${book.title}`}><Download /></a>
                    </div>
                )}
            </div>
        </article>
    );
}

function Shelf({ title, books }: { title: string; books: EBook[] }) {
    if (!books.length) return null;
    return (
        <section className='read-shelf-v2'>
            <header>
                <h2>{title}</h2>
                <span>{books.length} titles <ChevronRight /></span>
            </header>
            <div className='read-rail-v2'>
                {books.map(book => <BookCard key={`${title}-${book.id}`} book={book} rail />)}
            </div>
        </section>
    );
}

export default function FastEbookCatalog({ recommendations: _recommendations }: { recommendations?: unknown[] }) {
    const [books, setBooks] = useState<EBook[]>(CORE);
    const [next, setNext] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>('All');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [more, setMore] = useState(false);

    const key = useMemo(() => cacheKey(filter, query), [filter, query]);

    useEffect(() => {
        let live = true;
        const local = localMatch(filter, query);
        setBooks(local);
        setNext(null);

        const cached = readCache(key);
        if (cached) {
            setBooks(merge(local, cached.books).filter(book => matchesFilter(book, filter)));
            setNext(cached.next);
        }

        setLoading(true);
        void catalog(filter, query).then(data => {
            if (!live) return;
            const incoming = Array.isArray(data.results)
                ? data.results.filter(book => book?.id && book?.title)
                : [];
            const ready = merge(local, incoming).filter(book => matchesFilter(book, filter));
            setBooks(ready);
            setNext(data.next);
            if (ready.length) {
                writeCache(key, {
                    books: ready,
                    count: data.count || ready.length,
                    next: data.next,
                    at: Date.now(),
                });
            }
        }).catch(() => {
            if (live) setBooks(local);
        }).finally(() => {
            if (live) setLoading(false);
        });

        return () => {
            live = false;
        };
    }, [filter, query, key]);

    const loadMore = async () => {
        if (!next || more) return;
        setMore(true);
        try {
            const data = await catalog(filter, query, next);
            const incoming = Array.isArray(data.results)
                ? data.results.filter(book => book?.id && book?.title)
                : [];
            const ready = merge(books, incoming).filter(book => matchesFilter(book, filter));
            setBooks(ready);
            setNext(data.next);
            if (ready.length) {
                writeCache(key, {
                    books: ready,
                    count: data.count || ready.length,
                    next: data.next,
                    at: Date.now(),
                });
            }
        } finally {
            setMore(false);
        }
    };

    const defaultView = filter === 'All' && !query.trim();
    const forYou = books.slice(0, 8);
    const classics = CORE.filter(book => ['The Pursuit of God', 'The Pilgrim\'s Progress', 'The Imitation of Christ', 'Humility: The Beauty of Holiness', 'Orthodoxy', 'The Confessions of St. Augustine', 'Grace Abounding to the Chief of Sinners', 'The Practice of the Presence of God'].includes(book.title));
    const prayer = CORE.filter(book => matchesFilter(book, 'Prayer')).slice(0, 10);

    return (
        <section className='read-catalog-v2' id='ebooks'>
            <label className='read-search-v2'>
                <Search />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder='Search books, authors or topics' />
                {loading && <LoaderCircle className='spin' />}
            </label>

            <nav className='read-topics-v2' aria-label='Book categories'>
                {FILTERS.map(item => (
                    <button key={item.label} className={filter === item.label ? 'active' : ''} onClick={() => setFilter(item.label)}>
                        {item.label}
                    </button>
                ))}
            </nav>

            {defaultView ? (
                <>
                    <Shelf title='For You' books={forYou} />
                    <Shelf title='Christian Classics' books={classics} />
                    <Shelf title='Prayer & Devotion' books={prayer} />
                    <section className='read-discover-v2 books-all'>
                        <header>
                            <h2>All Books</h2>
                            <span>{books.length} titles</span>
                        </header>
                        <div className='books-grid'>
                            {books.map(book => <BookCard key={book.id} book={book} />)}
                        </div>
                    </section>
                </>
            ) : (
                <section className='read-results-v2'>
                    <header>
                        <h2>{query.trim() ? 'Search results' : filter}</h2>
                        <span>{books.length} {books.length === 1 ? 'book' : 'books'}</span>
                    </header>
                    {books.length ? (
                        <div className='books-grid'>
                            {books.map(book => <BookCard key={book.id} book={book} />)}
                        </div>
                    ) : (
                        <div className='read-empty-v2'>
                            <BookOpen />
                            <strong>No match yet.</strong>
                            <p>Try another title, author or topic.</p>
                        </div>
                    )}
                </section>
            )}

            {next && (
                <button className='read-more-v2' disabled={more} onClick={() => void loadMore()}>
                    {more ? <LoaderCircle className='spin' /> : <ChevronRight />}
                    {more ? 'Loading…' : 'More books'}
                </button>
            )}
        </section>
    );
}
