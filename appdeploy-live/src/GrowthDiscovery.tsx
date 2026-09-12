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
    { id: -103, title: 'Rework', author: 'Jason Fried & David Heinemeier Hansson', note: 'A practical challenge to conventional ideas about building a business.', url: 'https://www.penguinrandomhouse.com/books/56502/rework-by-jason-fried-and-david-heinemeier-hansson/9780307463746/', access: 'Publisher sample' },
    { id: -104, title: 'Shoe Dog', author: 'Phil Knight', note: 'Nike’s messy, risky and persistent path from idea to global company.', url: 'https://www.simonandschuster.com/books/Shoe-Dog/Phil-Knight/9781501135927', access: 'Publisher page' },
    { id: -105, title: 'Think Like a Monk', author: 'Jay Shetty', note: 'Attention, purpose, discipline and inner clarity.', url: 'https://www.simonandschuster.com/books/Think-Like-a-Monk/Jay-Shetty/9781982134501', access: 'Publisher page' },
    { id: -106, title: 'Limitless', author: 'Jim Kwik', note: 'Learning, memory, focus and unlocking more of your mental capacity.', url: 'https://www.penguinrandomhouse.com/books/616861/limitless-expanded-edition-by-jim-kwik/', access: 'Publisher preview' },
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

function CuratedShelf() {
    return (
        <div className='nfcps-growth-discovery'>
            <section className='books-shelf'>
                <div className='books-shelf-title'>
                    <div>
                        <h2>Modern Growth & Business</h2>
                        <p>Books spotted in your inspiration shelf — linked only to legal official or publisher sources.</p>
                    </div>
                    <span>{MODERN.length} picks</span>
                </div>
                <div className='books-track'>
                    {MODERN.map(book => (
                        <a className='books-tile' key={book.id} href={book.url} target='_blank' rel='noreferrer'>
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

            <section className='books-shelf'>
                <div className='books-shelf-title'>
                    <div>
                        <h2>Read Free · Growth Classics</h2>
                        <p>Same themes — habits, focus, money, purpose, character and self-mastery — in legal public-domain editions.</p>
                    </div>
                    <span>{FREE.length} books</span>
                </div>
                <div className='books-track'>
                    {FREE.map(book => (
                        <button className='books-tile' key={book.id} onClick={() => openReader(readerBook(book))}>
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
        </div>
    );
}

export default function GrowthDiscovery() {
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        let anchor = document.querySelector<HTMLElement>('.nfcps-growth-discovery-anchor');
        if (!anchor) {
            const filters = document.querySelector<HTMLElement>('.books-page .books-filters');
            if (!filters?.parentElement) return;
            anchor = document.createElement('div');
            anchor.className = 'nfcps-growth-discovery-anchor';
            filters.insertAdjacentElement('afterend', anchor);
        }
        setTarget(anchor);
        return () => {
            setTarget(null);
            anchor?.remove();
        };
    }, []);

    return target ? createPortal(<CuratedShelf />, target) : null;
}
