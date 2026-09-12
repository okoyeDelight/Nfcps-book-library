'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { openReader, type ReaderBook } from './ReaderExperience';
import ConceptBookCover from './ConceptBookCover';

type ModernBook = {
    id: number;
    title: string;
    author: string;
    note: string;
    url: string;
    access: string;
};

type FreeBook = {
    id: number;
    title: string;
    author: string;
    note: string;
};

const MODERN: ModernBook[] = [
    { id: -101, title: 'Atomic Habits', author: 'James Clear', note: 'Systems, habits and small improvements that compound.', url: 'https://jamesclear.com/atomic-habits', access: 'Official book page' },
    { id: -102, title: 'Ikigai', author: 'Héctor García & Francesc Miralles', note: 'Purpose, meaningful work and a life worth waking up for.', url: 'https://www.penguinrandomhouse.com/books/549469/ikigai-by-hector-garcia-and-francesc-miralles/', access: 'Publisher page' },
    { id: -103, title: 'Rework', author: 'Jason Fried & David Heinemeier Hansson', note: 'A practical challenge to conventional ideas about building a business.', url: 'https://www.penguinrandomhouse.com/books/56502/rework-by-jason-fried-and-david-heinemeier-hansson/9780307463746/', access: 'Publisher page' },
    { id: -104, title: 'Shoe Dog', author: 'Phil Knight', note: 'Nike’s messy, risky and persistent path from idea to global company.', url: 'https://www.simonandschuster.com/books/Shoe-Dog/Phil-Knight/9781501135927', access: 'Publisher page' },
    { id: -105, title: 'Think Like a Monk', author: 'Jay Shetty', note: 'Attention, purpose, discipline and inner clarity.', url: 'https://www.simonandschuster.com/books/Think-Like-a-Monk/Jay-Shetty/9781982134501', access: 'Publisher page' },
    { id: -106, title: 'Limitless', author: 'Jim Kwik', note: 'Learning, memory, focus and unlocking more of your mental capacity.', url: 'https://www.penguinrandomhouse.com/books/616861/limitless-expanded-edition-by-jim-kwik/', access: 'Publisher page' },
    { id: -107, title: 'Hooked', author: 'Nir Eyal', note: 'Why products become habits and how attention-shaping systems are built.', url: 'https://www.penguinrandomhouse.com/books/317898/hooked-by-nir-eyal/9780698190665/', access: 'Publisher page' },
    { id: -108, title: 'The Mountain Is You', author: 'Brianna Wiest', note: 'Self-sabotage, resilience and becoming the person capable of the climb.', url: 'https://shopcatalog.com/products/the-mountain-is-you', access: 'Official publisher shop' },
    { id: -109, title: 'The Alchemist', author: 'Paulo Coelho', note: 'A story about calling, courage, desire and the cost of pursuing a dream.', url: 'https://www.harpercollins.com/products/the-alchemist-paulo-coelho', access: 'Publisher page' },
    { id: -110, title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', note: 'A curated guide to wealth, judgment and happiness.', url: 'https://www.navalmanack.com/', access: 'Free official edition' },
];

const FREE: FreeBook[] = [
    { id: 4507, title: 'As a Man Thinketh', author: 'James Allen', note: 'A short classic about thought, character and the direction of a life.' },
    { id: 8581, title: 'The Art of Money Getting', author: 'P. T. Barnum', note: 'Practical old-school lessons on work, money, debt, integrity and opportunity.' },
    { id: 368, title: 'Acres of Diamonds', author: 'Russell H. Conwell', note: 'A reminder to recognize opportunities already close to you.' },
    { id: 935, title: 'Self-Help', author: 'Samuel Smiles', note: 'Industry, perseverance, character and self-education.' },
    { id: 45109, title: 'The Enchiridion', author: 'Epictetus', note: 'A compact Stoic handbook on control, judgment and inner freedom.' },
    { id: 2680, title: 'Meditations', author: 'Marcus Aurelius', note: 'Private reflections on discipline, duty, character and calm.' },
    { id: 59844, title: 'The Science of Getting Rich', author: 'W. D. Wattles', note: 'A historically influential prosperity text; read critically alongside Scripture and sound financial wisdom.' },
    { id: 58585, title: 'The Prophet', author: 'Kahlil Gibran', note: 'Poetic reflections on work, love, giving, freedom, friendship and life.' },
];

const readerBook = (book: FreeBook): ReaderBook => ({
    id: book.id,
    title: book.title,
    author: book.author,
    cover: `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`,
    summary: book.note,
    formats: {
        'image/jpeg': `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.cover.medium.jpg`,
        'text/plain; charset=utf-8': `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`,
        'text/html': `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}-images.html`,
        'application/epub+zip': `https://www.gutenberg.org/ebooks/${book.id}.epub3.images`,
    },
});

const matches = (book: ModernBook | FreeBook, needle: string) => {
    if (!needle) return true;
    return `${book.title} ${book.author} ${book.note}`.toLowerCase().includes(needle);
};

function CuratedShelf({ query }: { query: string }) {
    const needle = query.trim().toLowerCase();
    const modern = MODERN.filter(book => matches(book, needle));
    const free = FREE.filter(book => matches(book, needle));

    if (needle && modern.length === 0 && free.length === 0) return null;

    return (
        <div className='nfcps-growth-discovery' aria-label='Growth and business book discovery'>
            {modern.length > 0 && (
                <section className='books-shelf'>
                    <div className='books-shelf-title'>
                        <div>
                            <h2>{needle ? 'Modern growth matches' : 'Modern Growth & Business'}</h2>
                            <p>{needle ? 'Curated titles matching your search.' : 'Books from your inspiration shelf, linked only to legitimate official or publisher sources.'}</p>
                        </div>
                        <span>{modern.length} {modern.length === 1 ? 'pick' : 'picks'}</span>
                    </div>
                    <div className='books-track'>
                        {modern.map(book => (
                            <a className='books-tile' key={book.id} href={book.url} target='_blank' rel='noreferrer' aria-label={`Open official source for ${book.title}`}>
                                <ConceptBookCover id={book.id} title={book.title} author={book.author} />
                                <span>
                                    <strong>{book.title}</strong>
                                    <small>{book.author}</small>
                                    <em>{book.access} · <ExternalLink size={11} /></em>
                                </span>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {free.length > 0 && (
                <section className='books-shelf'>
                    <div className='books-shelf-title'>
                        <div>
                            <h2>{needle ? 'Free growth classics' : 'Read Free · Growth Classics'}</h2>
                            <p>{needle ? 'Legal public-domain matches you can read directly inside NFCPS One.' : 'Related themes — habits, focus, money, purpose, character and self-mastery — in legal public-domain editions.'}</p>
                        </div>
                        <span>{free.length} {free.length === 1 ? 'book' : 'books'}</span>
                    </div>
                    <div className='books-track'>
                        {free.map(book => (
                            <button className='books-tile' key={book.id} onClick={() => openReader(readerBook(book))} aria-label={`Read ${book.title} in NFCPS One`}>
                                <ConceptBookCover id={book.id} title={book.title} author={book.author} />
                                <span>
                                    <strong>{book.title}</strong>
                                    <small>{book.author}</small>
                                    <em><BookOpen size={11} /> Read in NFCPS</em>
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default function GrowthDiscovery() {
    const [target, setTarget] = useState<HTMLElement | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let ownedAnchor: HTMLElement | null = null;

        const attach = () => {
            let anchor = document.querySelector<HTMLElement>('.nfcps-growth-discovery-anchor');
            const filters = document.querySelector<HTMLElement>('.books-page .books-filters');
            if (!filters?.parentElement) return;
            if (!anchor) {
                anchor = document.createElement('div');
                anchor.className = 'nfcps-growth-discovery-anchor';
                anchor.dataset.nfcpsOwner = 'growth-discovery';
                filters.insertAdjacentElement('afterend', anchor);
                ownedAnchor = anchor;
            }
            setTarget(anchor);
            const input = document.querySelector<HTMLInputElement>('.books-page .books-search input');
            if (input) setQuery(input.value);
        };

        const syncSearch = (event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement && input.matches('.books-page .books-search input')) {
                setQuery(input.value);
            }
        };

        attach();
        const observer = new MutationObserver(attach);
        observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener('input', syncSearch, true);

        return () => {
            observer.disconnect();
            document.removeEventListener('input', syncSearch, true);
            setTarget(null);
            if (ownedAnchor?.dataset.nfcpsOwner === 'growth-discovery') ownedAnchor.remove();
        };
    }, []);

    return target ? createPortal(<CuratedShelf query={query} />, target) : null;
}
