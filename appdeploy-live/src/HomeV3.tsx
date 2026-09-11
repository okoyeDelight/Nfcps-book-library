'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Play } from 'lucide-react';
import { openReader, type ReaderBook } from './ReaderExperience';
import ConceptBookCover from './ConceptBookCover';

type ReaderRecord = { book: ReaderBook; progress: number; lastOpened: number };
type SpatialTier = 'full' | 'light' | 'static';

const FALLBACK: ReaderBook = {
    id: 25141,
    title: 'The Pursuit of God',
    author: 'A. W. Tozer',
    cover: 'https://www.gutenberg.org/cache/epub/25141/pg25141.cover.medium.jpg',
    summary: 'A devotional classic about seeking God Himself.',
    formats: {
        'image/jpeg': 'https://www.gutenberg.org/cache/epub/25141/pg25141.cover.medium.jpg',
        'text/plain; charset=utf-8': 'https://www.gutenberg.org/cache/epub/25141/pg25141.txt',
        'text/html': 'https://www.gutenberg.org/cache/epub/25141/pg25141-images.html',
        'application/epub+zip': 'https://www.gutenberg.org/ebooks/25141.epub3.images',
    },
};

const SCENE = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=88';

function resolveSpatialTier(): SpatialTier {
    if (typeof window === 'undefined') return 'static';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency || 4;
    const memory = nav.deviceMemory || 4;
    if (cores <= 4 || memory <= 4) return 'light';
    return 'full';
}

export default function HomeV3({
    greeting,
    current,
    onGoRead,
    watchHref,
}: {
    greeting: string;
    current: ReaderRecord | null;
    onGoRead: () => void;
    watchHref: string;
}) {
    const rootRef = useRef<HTMLElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [tier, setTier] = useState<SpatialTier>('static');
    const book = current?.book || FALLBACK;
    const progress = Math.max(0, Math.min(100, current?.progress || 0));
    const openFocus = () => current ? openReader(book) : onGoRead();

    useEffect(() => {
        const nextTier = resolveSpatialTier();
        setTier(nextTier);
        if (nextTier === 'static') return;

        const update = () => {
            rafRef.current = null;
            const node = rootRef.current;
            if (!node) return;
            const y = Math.max(0, Math.min(window.scrollY, 420));
            node.style.setProperty('--spatial-scroll', `${y}px`);
        };
        const onScroll = () => {
            if (rafRef.current !== null) return;
            rafRef.current = window.requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <section ref={rootRef} className={`spatial-home spatial-home-${tier}`}>
            <div className='spatial-home-hero'>
                <div className='spatial-home-base' style={{ backgroundImage: `url(${SCENE})` }} />
                <div className='spatial-home-shade' />
                <div className='spatial-home-glow spatial-home-glow-emerald' />
                <div className='spatial-home-glow spatial-home-glow-brass' />
                <div className='spatial-home-ridge spatial-home-ridge-distant' />
                <div className='spatial-home-ridge spatial-home-ridge-near' />

                <div className='spatial-home-content'>
                    <div className='spatial-home-greeting'>
                        <h1>Make room<br />for what matters.</h1>
                    </div>

                    <section className='spatial-home-focus' aria-label='Continue reading'>
                        <div className='spatial-home-cover'>
                            <ConceptBookCover id={book.id} title={book.title} author={book.author} />
                        </div>
                        <div className='spatial-home-focus-copy'>
                            <small>{current ? 'CONTINUE READING' : 'BEGIN HERE'}</small>
                            <h2>{book.title}</h2>
                            <p>{book.author}</p>
                            <div className='spatial-home-progress' aria-label={`${Math.round(progress)} percent complete`}>
                                <i><b style={{ width: `${Math.max(current ? 3 : 0, progress)}%` }} /></i>
                                <span>{current ? `${Math.round(progress)}%` : 'Start here'}</span>
                            </div>
                            <button className='spatial-home-continue' onClick={openFocus}>
                                <BookOpen />
                                <span>{current ? 'Continue' : 'Start reading'}</span>
                                <ChevronRight />
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <section className='spatial-home-today'>
                <header>
                    <div>
                        <small>CURATED FOR TODAY</small>
                        <h2>For You Today</h2>
                    </div>
                    <a href={watchHref}>See all <ChevronRight /></a>
                </header>
                <div className='spatial-home-track'>
                    <a className='spatial-home-card' href={watchHref}>
                        <img src='https://i.ytimg.com/vi/3RHdq_h0ZH4/maxresdefault.jpg' alt='Featured sermon' />
                        <i />
                        <span>
                            <small>WATCH</small>
                            <strong>The Power of Prayer</strong>
                            <em>Apostle Michael Orokpo</em>
                        </span>
                        <b><Play /></b>
                    </a>
                    <button className='spatial-home-card spatial-home-card-quiet' onClick={onGoRead}>
                        <img src='https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=78' alt='Quiet landscape' />
                        <i />
                        <span>
                            <small>READ</small>
                            <strong>Rest in His Presence</strong>
                            <em>Open your reading shelf</em>
                        </span>
                        <b><BookOpen /></b>
                    </button>
                </div>
            </section>
        </section>
    );
}
