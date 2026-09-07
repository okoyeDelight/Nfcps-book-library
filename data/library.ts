import { physicalBooks as builtInBooks, type PhysicalBook } from "@/data/books";
import adminBooks from "@/data/admin-books.json";

export type { PhysicalBook } from "@/data/books";

const verifiedCorrections: Record<number, Partial<PhysicalBook>> = {
  10: {
    author: "Oguejiofo C. P. Ezeanya",
    description: "A 2014 Christian retreat resource published by Christus Doorways Ltd., Enugu, focused on prayer, family history, spiritual healing and freedom.",
    source: "https://hts.org.za/index.php/hts/rt/printerFriendly/7138/21257",
    verified: true,
  },
};

export const physicalBooks: PhysicalBook[] = [
  ...builtInBooks.map((book) => ({ ...book, ...(verifiedCorrections[book.id] ?? {}) })),
  ...(adminBooks as PhysicalBook[]),
];
