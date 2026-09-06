import { physicalBooks as builtInBooks, type PhysicalBook } from "@/data/books";
import adminBooks from "@/data/admin-books.json";

export type { PhysicalBook } from "@/data/books";

export const physicalBooks: PhysicalBook[] = [
  ...builtInBooks,
  ...(adminBooks as PhysicalBook[]),
];
