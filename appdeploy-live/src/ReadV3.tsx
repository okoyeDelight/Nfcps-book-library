'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Download, LoaderCircle, Search } from 'lucide-react';
import { api } from '@appdeploy/client';
import { openReader, type ReaderBook } from './ReaderExperience';
import ConceptBookCover from './ConceptBookCover';

type ReaderRecord = { book: ReaderBook; progress: number; lastOpened: number };
type EBook = {
    id: number;
    title: string;
    authors: { name: string }[];
    subjects: string[];
    summaries?: string[];
    formats: Record<string, string>;
};
type EResponse = { count: number; next: string | null; results: EBook[]; degraded?: boolean };

type Filter = { label: string; query: string; needles: string[] };

const make = (id: number, title: string, name: string, subjects: string[], summary: string): EBook => ({
    id,
    title,
    authors: [{ name }],
    subjects,
    summaries: [summary],
    formats: {
        'image/jpeg': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`,
        'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
        'text/html': `https://www.gutenberg.org/cache/epub/${id}/pg${id}-images.html`,
        'application/epub+zip': `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
    },
});

const LOCAL: EBook[] = [
    make(25141, 'The Pursuit of God', 'A. W. Tozer', ['Christian life', 'Prayer', 'Devotional'], 'A devotional classic about seeking God Himself beyond routine religion.'),
    make(131, "The Pilgrim's Progress", 'John Bunyan', ['Christian life', 'Faith', 'Allegory'], 'A Christian allegory of perseverance, temptation and the journey of faith.'),
    make(1653, 'The Imitation of Christ', 'Thomas à Kempis', ['Christian life', 'Spiritual life', 'Devotional'], 'A classic on humility, inward life and following Christ.'),
    make(57121, 'Humility: The Beauty of Holiness', 'Andrew Murray', ['Christian life', 'Holiness', 'Humility'], 'Andrew Murray on humility as a central mark of Christlike holiness.'),
    make(16769, 'Orthodoxy', 'G. K. Chesterton', ['Theology', 'Apologetics', 'Christianity'], 'A lively Christian classic about faith, wonder, reason and the shape of belief.'),
    make(26709, 'Lord, Teach Us To Pray', 'Andrew Murray', ['Prayer', 'Devotional', 'Christian life'], 'Practical devotional teaching on learning prayer from Christ.'),
    make(10, 'The King James Version of the Bible', 'Various', ['Bible', 'Scripture', 'Bible study'], 'The complete King James Version of the Bible.'),
    make(395, 'The Holy War', 'John Bunyan', ['Christian fiction', 'Spiritual warfare', 'Christian life'], 'Bunyan’s allegory of the battle for the human soul.'),
    make(654, 'Grace Abounding to the Chief of Sinners', 'John Bunyan', ['Grace', 'Christian biography', 'Christian life'], 'Bunyan’s testimony of conversion, struggle and grace.'),
    make(3270, 'The Jerusalem Sinner Saved', 'John Bunyan', ['Salvation', 'Grace', 'Sermons'], 'A meditation on mercy and the reach of the gospel.'),
    make(3548, 'The Pharisee and the Publican', 'John Bunyan', ['Sermons', 'Humility', 'Grace'], 'A reflection on self-righteousness, repentance and mercy.'),
    make(5831, 'The Riches of Bunyan', 'John Bunyan', ['Theology', 'Doctrine', 'Prayer'], 'Selections from Bunyan on God, Scripture, grace and prayer.'),
    make(13750, 'The Heavenly Footman', 'John Bunyan', ['Christian life', 'Discipleship'], 'A call to perseverance in the Christian journey.'),
    make(30657, 'Sovereign Grace', 'D. L. Moody', ['Grace', 'Sermons', 'Theology'], 'Moody on grace as the source of salvation and Christian service.'),
    make(33341, 'Secret Power', 'D. L. Moody', ['Holy Spirit', 'Christian life', 'Ministry'], 'Teaching on the Holy Spirit and spiritual power.'),
    make(33015, 'The Overcoming Life', 'D. L. Moody', ['Christian life', 'Sermons', 'Discipleship'], 'Sermons on spiritual warfare, repentance and victory.'),
    make(61883, 'Prevailing Prayer', 'D. L. Moody', ['Prayer', 'Christian life'], 'A practical study of prayer and what hinders it.'),
    make(36655, 'Pleasure & Profit in Bible Study', 'D. L. Moody', ['Bible', 'Bible study'], 'A practical guide to deeper study of Scripture.'),
    make(30449, 'The Way to God and How to Find It', 'D. L. Moody', ['Sermons', 'Salvation', 'Christian life'], 'Moody on God’s love, faith and coming to Christ.'),
    make(30740, 'Men of the Bible', 'D. L. Moody', ['Bible', 'Biography', 'Bible study'], 'Lessons from the lives and faith of biblical figures.'),
    make(30768, 'Sowing and Reaping', 'D. L. Moody', ['Christian life', 'Sermons'], 'A study of the biblical principle of sowing and reaping.'),
    make(13871, 'The Practice of the Presence of God', 'Brother Lawrence', ['Devotional', 'Prayer', 'Spiritual life'], 'A classic invitation to communion with God in ordinary life.'),
    make(77585, 'Confessions of St. Augustine', 'Augustine of Hippo', ['Christian biography', 'Theology', 'Spiritual life'], 'Augustine’s account of conversion, desire and the search for God.'),
    make(65115, 'Power Through Prayer', 'E. M. Bounds', ['Prayer', 'Ministry', 'Christian life'], 'A forceful call for prayer to become the hidden life behind Christian ministry.'),
    make(12854, "The Master's Indwelling", 'Andrew Murray', ['Christian life', 'Holy Spirit', 'Devotional'], 'Andrew Murray on the indwelling life of Christ and full surrender to Him.'),
    make(29296, 'The Ministry of Intercession', 'Andrew Murray', ['Prayer', 'Intercession', 'Christian life'], 'A sustained invitation into intercessory prayer and fellowship with Christ.'),
    make(37292, 'Thoughts for the Quiet Hour', 'D. L. Moody', ['Devotional', 'Christian life', 'Meditations'], 'Short devotional readings for quiet reflection and daily spiritual formation.'),
    make(26990, 'Holy in Christ', 'Andrew Murray', ['Holiness', 'Christian life', 'Devotional'], 'Meditations on holiness, union with Christ and life set apart to God.'),
    make(41994, "Money: Thoughts for God's Stewards", 'Andrew Murray', ['Stewardship', 'Christian life', 'Discipleship'], 'A practical Christian reflection on money, generosity and faithful stewardship.'),
    make(26003, 'Jesus Himself', 'Andrew Murray', ['Jesus Christ', 'Devotional', 'Christian life'], 'A brief devotional focus on Christ Himself as the believer’s life and sufficiency.'),
    make(57109, 'Unfailing Springs', 'J. Hudson Taylor', ['Missions', 'Devotional', 'Christian life'], 'Devotional readings shaped by missionary faith, dependence and the sufficiency of God.'),
    make(65066, 'The Life and Diary of David Brainerd', 'David Brainerd', ['Christian biography', 'Missions', 'Prayer'], 'The influential diary of a missionary life marked by prayer, longing and perseverance.'),
    make(33247, 'The Spirit-Filled Life', 'John MacNeil', ['Holy Spirit', 'Christian life', 'Prayer'], 'Teaching on dependence on the Holy Spirit for daily Christian living and service.'),
    make(73032, 'The Reality of Prayer', 'E. M. Bounds', ['Prayer', 'Christian life', 'Devotional'], 'A classic exploration of prayer as a living, practical reality in the life of faith.'),
    make(63486, 'The Preacher and Prayer', 'E. M. Bounds', ['Prayer', 'Ministry', 'Sermons'], 'A call for preaching and ministry to be formed in deep private prayer.'),
    make(42657, 'Gleanings Among the Sheaves', 'C. H. Spurgeon', ['Sermons', 'Devotional', 'Christian life'], 'Short spiritual selections drawn from Spurgeon’s preaching and pastoral insight.'),
    make(30241, 'The Person and Work of the Holy Spirit', 'R. A. Torrey', ['Holy Spirit', 'Theology', 'Bible study'], 'A biblical study of the person, work and ministry of the Holy Spirit.'),
    make(42518, 'Talks to Farmers', 'C. H. Spurgeon', ['Sermons', 'Christian life', 'Discipleship'], 'Plainspoken Christian counsel and gospel preaching with vivid everyday illustrations.'),
    make(38162, 'Practical Religion', 'J. C. Ryle', ['Christian life', 'Discipleship', 'Holiness'], 'Direct pastoral teaching on the habits and convictions of practical Christian living.'),
    make(60669, 'Around the Wicket Gate', 'C. H. Spurgeon', ['Salvation', 'Faith', 'Christian life'], 'A warm guide for seekers wrestling with faith, assurance and coming to Christ.'),
    make(34632, 'Selected Sermons of Jonathan Edwards', 'Jonathan Edwards', ['Sermons', 'Theology', 'Revival'], 'A selection of sermons from one of the most influential voices of the Great Awakening.'),
    make(73271, 'The Essentials of Prayer', 'E. M. Bounds', ['Prayer', 'Christian life', 'Devotional'], 'Teaching on the character, conditions and spiritual essentials of prevailing prayer.'),
    make(66112, 'The Purpose in Prayer', 'E. M. Bounds', ['Prayer', 'Christian life', 'Intercession'], 'Reflections on God’s purposes in prayer and the believer’s participation through intercession.'),
    make(70657, 'Prayer and Praying Men', 'E. M. Bounds', ['Prayer', 'Bible', 'Christian biography'], 'Biblical portraits of men whose lives demonstrate the power and practice of prayer.'),
];

const FILTERS: Filter[] = [
    { label: 'All', query: 'Christianity', needles: [] },
    { label: 'Prayer', query: 'Prayer', needles: ['prayer', 'intercession'] },
    { label: 'Bible', query: 'Bible', needles: ['bible', 'scripture'] },
    { label: 'Theology', query: 'Theology', needles: ['theology', 'doctrine', 'holy spirit'] },
    { label: 'Devotional', query: 'Devotional literature', needles: ['devotional', 'meditations'] },
    { label: 'Growth', query: 'Christian life', needles: ['christian life', 'discipleship', 'holiness'] },
];

const REMOTE = ['Christianity', 'Prayer', 'Bible', 'Theology', 'Devotional literature', 'Christian life', 'Sermons', 'Missions', 'Church history', 'Jesus Christ'];

const tidy = (name: string) => {
    const parts = name.split(',').map(x => x.trim()).filter(Boolean).filter(x => !/^\d{3,4}/.test(x));
    return parts.length > 1 ? `${parts.slice(1).join(' ')} ${parts[0]}` : parts[0] || 'Unknown author';
};

const author = (book: EBook) => book.authors.length ? book.authors.map(a => tidy(a.name)).join(', ') : 'Unknown author';
const haystack = (book: EBook) => `${book.title} ${author(book)} ${book.subjects.join(' ')}`.toLowerCase();
const merge = (...groups: EBook[][]) => Array.from(new Map(groups.flat().map(book => [book.id, book])).values());
const download = (book: EBook) => book.formats['application/epub+zip'] || book.formats['text/html'] || `https://www.gutenberg.org/ebooks/${book.id}`;
const readerBook = (book: EBook): ReaderBook => ({
    id: book.id,
    title: book.title,
    author: author(book),
    formats: book.formats,
    cover: book.formats['image/jpeg'] || '',
    summary: book.summaries?.[0],
});

function BookTile({ book, onOpen }: { book: EBook; onOpen: (book: EBook) => void }) {
    return (
        <button className='books-tile' onClick={() => onOpen(book)}>
            <ConceptBookCover id={book.id} title={book.title} author={author(book)} />
            <span>
                <strong>{book.title}</strong>
                <small>{author(book)}</small>
            </span>
        </button>
    );
}

function Shelf({ title, books, onOpen }: { title: string; books: EBook[]; onOpen: (book: EBook) => void }) {
    if (!books.length) return null;
    return (
        <section className='books-shelf'>
            <div className='books-shelf-title'>
                <h2>{title}</h2>
                <span>{books.length} titles <ChevronRight /></span>
            </div>
            <div className='books-track'>
                {books.map(book => <BookTile key={`${title}-${book.id}`} book={book} onOpen={onOpen} />)}
            </div>
        </section>
    );
}

function Detail({ book, all, onClose }: { book: EBook; all: EBook[]; onClose: () => void }) {
    const [tab, setTab] = useState<'about' | 'chapters' | 'related'>('about');
    const related = all.filter(other => other.id !== book.id && other.subjects.some(subject => book.subjects.includes(subject))).slice(0, 5);
    const read = () => {
        onClose();
        openReader(readerBook(book));
    };

    return (
        <section className='books-detail'>
            <header className='books-detail-bar'>
                <button onClick={onClose} aria-label='Back to books'><ArrowLeft /></button>
                <strong>Book</strong>
                <span />
            </header>
            <div className='books-detail-scroll'>
                <div className='books-detail-art'>
                    <ConceptBookCover id={book.id} title={book.title} author={author(book)} className='books-detail-cover' />
                </div>
                <h1>{book.title}</h1>
                <p className='books-detail-author'>{author(book)}</p>
                <div className='books-detail-actions'>
                    <button className='books-read-primary' onClick={read}><BookOpen /> Read</button>
                    <a href={download(book)} target='_blank' rel='noreferrer'><Download /> Download</a>
                </div>
                <nav className='books-detail-tabs'>
                    <button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>About</button>
                    <button className={tab === 'chapters' ? 'active' : ''} onClick={() => setTab('chapters')}>Contents</button>
                    <button className={tab === 'related' ? 'active' : ''} onClick={() => setTab('related')}>Related</button>
                </nav>
                {tab === 'about' && (
                    <div className='books-detail-copy'>
                        <p>{book.summaries?.[0] || 'A trusted public-domain Christian classic selected for the NFCPS reading shelf.'}</p>
                        <div className='books-tags'>{book.subjects.slice(0, 5).map(subject => <span key={subject}>{subject}</span>)}</div>
                    </div>
                )}
                {tab === 'chapters' && (
                    <div className='books-detail-copy'>
                        <p>Open the book to browse detected chapters, search inside the text, jump to bookmarks, or switch between page and continuous reading.</p>
                        <button className='books-inline-action' onClick={read}>Open reading view <ChevronRight /></button>
                    </div>
                )}
                {tab === 'related' && (
                    <div className='books-related'>
                        {related.length ? related.map(item => <BookTile key={item.id} book={item} onOpen={() => { onClose(); openReader(readerBook(item)); }} />) : <p>More related books will appear as the NFCPS shelf grows.</p>}
                    </div>
                )}
            </div>
        </section>
    );
}

export default function ReadV3({ current, onSettings }: { current: ReaderRecord | null; onSettings: () => void }) {
    const [books, setBooks] = useState<EBook[]>(LOCAL);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>(FILTERS[0]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selected, setSelected] = useState<EBook | null>(null);
    const [nextByTopic, setNextByTopic] = useState<Record<string, string | null>>({});
    const [visibleCount, setVisibleCount] = useState(72);
    const sentinel = useRef<HTMLDivElement | null>(null);
    const topicTurn = useRef(0);

    useEffect(() => {
        let live = true;
        setLoading(true);
        setVisibleCount(72);
        setNextByTopic({});
        topicTurn.current = 0;
        const topics = query.trim() ? [filter.query] : filter.label === 'All' ? REMOTE : [filter.query];
        void Promise.allSettled(topics.map(async topic => {
            const params = new URLSearchParams({ topic });
            if (query.trim()) params.set('search', query.trim());
            const response = await api.get(`/api/ebooks/catalog?${params}`);
            return { topic, data: response.data as EResponse };
        })).then(results => {
            if (!live) return;
            const remote = results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value.data.results) ? result.value.data.results.filter(item => item?.id && item?.title) : []);
            const cursors: Record<string, string | null> = {};
            for (const result of results) {
                if (result.status === 'fulfilled') cursors[result.value.topic] = result.value.data.next || null;
            }
            setBooks(merge(LOCAL, remote));
            setNextByTopic(cursors);
        }).finally(() => {
            if (live) setLoading(false);
        });
        return () => { live = false; };
    }, [filter.label, filter.query, query]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return books.filter(book => {
            const text = haystack(book);
            const categoryMatch = !filter.needles.length || filter.needles.some(item => text.includes(item));
            return categoryMatch && (!needle || text.includes(needle));
        });
    }, [books, filter, query]);

    const localVisible = useMemo(() => filtered.filter(book => LOCAL.some(item => item.id === book.id)), [filtered]);
    const prayer = filtered.filter(book => /prayer|intercession/.test(haystack(book))).slice(0, 14);
    const devotional = filtered.filter(book => /devotional|spiritual life|meditations|christian life/.test(haystack(book))).slice(0, 14);
    const bible = filtered.filter(book => /bible|scripture|doctrine|theology/.test(haystack(book))).slice(0, 14);
    const activeTopics = useMemo(() => query.trim() ? [filter.query] : filter.label === 'All' ? REMOTE : [filter.query], [filter.label, filter.query, query]);
    const canReveal = visibleCount < filtered.length;
    const canFetch = activeTopics.some(topic => Boolean(nextByTopic[topic]));

    const loadMore = async () => {
        if (loadingMore) return;
        if (canReveal) {
            setVisibleCount(value => Math.min(filtered.length, value + 60));
            return;
        }
        const available = activeTopics.filter(topic => Boolean(nextByTopic[topic]));
        if (!available.length) return;
        const start = topicTurn.current % available.length;
        const chosen = Array.from(new Set([available[start], available[(start + 1) % available.length]])).filter(Boolean).slice(0, 2);
        topicTurn.current += chosen.length;
        setLoadingMore(true);
        try {
            const results = await Promise.allSettled(chosen.map(async topic => {
                const params = new URLSearchParams({ topic, cursor: String(nextByTopic[topic]) });
                if (query.trim()) params.set('search', query.trim());
                const response = await api.get(`/api/ebooks/catalog?${params}`);
                return { topic, data: response.data as EResponse };
            }));
            const incoming = results.flatMap(result => result.status === 'fulfilled' && Array.isArray(result.value.data.results) ? result.value.data.results.filter(item => item?.id && item?.title) : []);
            if (incoming.length) setBooks(previous => merge(previous, incoming));
            setNextByTopic(previous => {
                const next = { ...previous };
                for (const result of results) {
                    if (result.status === 'fulfilled') next[result.value.topic] = result.value.data.next || null;
                }
                return next;
            });
            setVisibleCount(value => value + 60);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        const target = sentinel.current;
        if (!target) return;
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) void loadMore();
        }, { rootMargin: '900px 0px' });
        observer.observe(target);
        return () => observer.disconnect();
    }, [filtered.length, visibleCount, loadingMore, nextByTopic, filter.label, filter.query, query]);

    return (
        <section className='books-page'>
            <header className='books-page-bar'>
                <div>
                    <h1>Read</h1>
                    <p>Quiet pages. Lasting formation.</p>
                </div>
                <button onClick={onSettings} aria-label='Reading settings'>Aa</button>
            </header>

            {current && (
                <button className='books-resume' onClick={() => openReader(current.book)}>
                    <ConceptBookCover id={current.book.id} title={current.book.title} author={current.book.author} />
                    <span>
                        <small>CONTINUE READING</small>
                        <strong>{current.book.title}</strong>
                        <em>{current.book.author}</em>
                        <div className='books-progress'><i style={{ width: `${Math.max(3, Math.min(100, current.progress))}%` }} /></div>
                        <b>{Math.round(current.progress)}% · Resume</b>
                    </span>
                    <ChevronRight />
                </button>
            )}

            <label className='books-search'>
                <Search />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder='Search books, authors or topics' />
                {loading && <LoaderCircle className='spin' />}
            </label>

            <div className='books-filters'>
                {FILTERS.map(item => (
                    <button key={item.label} className={filter.label === item.label ? 'active' : ''} onClick={() => setFilter(item)}>{item.label}</button>
                ))}
            </div>

            {query.trim() ? (
                <section className='books-all'>
                    <div className='books-shelf-title'><h2>Search results</h2><span>{filtered.length} found</span></div>
                    <div className='books-grid'>{filtered.slice(0, visibleCount).map(book => <BookTile key={book.id} book={book} onOpen={setSelected} />)}</div>
                </section>
            ) : (
                <>
                    <Shelf title='For You' books={localVisible.slice(0, 12)} onOpen={setSelected} />
                    <Shelf title='Christian Classics' books={localVisible.slice(10, 25)} onOpen={setSelected} />
                    <Shelf title='Prayer & Spiritual Life' books={prayer.length ? prayer : localVisible.slice(20, 34)} onOpen={setSelected} />
                    <Shelf title='Bible & Study' books={bible.length ? bible : localVisible.slice(5, 19)} onOpen={setSelected} />
                    <Shelf title='Devotional Reading' books={devotional.length ? devotional : localVisible.slice(14, 28)} onOpen={setSelected} />
                    <section className='books-all'>
                        <div className='books-shelf-title'>
                            <div><h2>All Books</h2><p>A living public-domain library that keeps expanding as you scroll.</p></div>
                            <span>{filtered.length}+ discovered</span>
                        </div>
                        <div className='books-grid'>{filtered.slice(0, visibleCount).map(book => <BookTile key={`all-${book.id}`} book={book} onOpen={setSelected} />)}</div>
                    </section>
                </>
            )}

            <div ref={sentinel} className='books-infinite-sentinel' aria-live='polite'>
                {loadingMore ? <><LoaderCircle className='spin' /><span>Discovering more books…</span></> : canReveal || canFetch ? <><BookOpen /><span>Keep scrolling · {books.length} titles discovered so far</span></> : <><BookOpen /><span>More titles appear when the wider catalogue is available.</span></>}
            </div>

            {selected && <Detail book={selected} all={books} onClose={() => setSelected(null)} />}
        </section>
    );
}
