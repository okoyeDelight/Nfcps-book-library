export type RecommendedBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  cover: string;
  href: string;
  free: boolean;
};

const gutenbergCover = (id: number) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
const openLibraryCover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
const googleSearch = (title: string, author: string) => `https://books.google.com/books?q=${encodeURIComponent(`${title} ${author}`)}`;

export const recommendedChristianBooks: RecommendedBook[] = [
  {
    id: "pilgrims-progress",
    title: "The Pilgrim's Progress",
    author: "John Bunyan",
    category: "Christian Classics",
    description: "A landmark Christian allegory about perseverance, temptation, grace and the believer's journey toward the Celestial City.",
    cover: gutenbergCover(131),
    href: "https://www.gutenberg.org/ebooks/131",
    free: true,
  },
  {
    id: "imitation-of-christ",
    title: "The Imitation of Christ",
    author: "Thomas à Kempis",
    category: "Devotional",
    description: "A historic devotional classic on humility, inward holiness, discipleship and learning to centre everyday life on Christ.",
    cover: gutenbergCover(1653),
    href: "https://www.gutenberg.org/ebooks/1653",
    free: true,
  },
  {
    id: "practice-presence",
    title: "The Practice of the Presence of God",
    author: "Brother Lawrence",
    category: "Devotional",
    description: "Short, practical reflections on learning to remain aware of God's presence in ordinary work and daily life.",
    cover: gutenbergCover(5657),
    href: "https://www.gutenberg.org/ebooks/5657",
    free: true,
  },
  {
    id: "orthodoxy",
    title: "Orthodoxy",
    author: "G. K. Chesterton",
    category: "Apologetics",
    description: "Chesterton's energetic defence of Christian belief, wonder and the surprising coherence of historic orthodoxy.",
    cover: gutenbergCover(16769),
    href: "https://www.gutenberg.org/ebooks/16769",
    free: true,
  },
  {
    id: "lord-teach-us-pray",
    title: "Lord, Teach Us To Pray",
    author: "Andrew Murray",
    category: "Prayer",
    description: "A practical classic on learning prayer from Christ, growing in dependence on God and developing a deeper life of communion.",
    cover: gutenbergCover(26709),
    href: "https://www.gutenberg.org/ebooks/26709",
    free: true,
  },
  {
    id: "ministry-intercession",
    title: "The Ministry of Intercession",
    author: "Andrew Murray",
    category: "Prayer",
    description: "A call to rediscover intercessory prayer as a vital ministry of the believer and a source of spiritual strength for the Church.",
    cover: gutenbergCover(29296),
    href: "https://www.gutenberg.org/ebooks/29296",
    free: true,
  },
  {
    id: "mere-christianity",
    title: "Mere Christianity",
    author: "C. S. Lewis",
    category: "Apologetics",
    description: "A widely read introduction to core Christian belief, morality and the claims of Christ.",
    cover: openLibraryCover("9780060652920"),
    href: googleSearch("Mere Christianity", "C. S. Lewis"),
    free: false,
  },
  {
    id: "knowing-god",
    title: "Knowing God",
    author: "J. I. Packer",
    category: "Theology",
    description: "A rich introduction to the character of God and what it means to know Him personally rather than merely know about Him.",
    cover: openLibraryCover("9780830816507"),
    href: googleSearch("Knowing God", "J. I. Packer"),
    free: false,
  },
  {
    id: "cost-discipleship",
    title: "The Cost of Discipleship",
    author: "Dietrich Bonhoeffer",
    category: "Discipleship",
    description: "A challenging exploration of costly grace, obedience and what it means to follow Jesus seriously.",
    cover: openLibraryCover("9780684815008"),
    href: googleSearch("The Cost of Discipleship", "Dietrich Bonhoeffer"),
    free: false,
  },
  {
    id: "celebration-discipline",
    title: "Celebration of Discipline",
    author: "Richard J. Foster",
    category: "Spiritual Formation",
    description: "A practical guide to classic Christian disciplines such as prayer, study, simplicity, service and worship.",
    cover: openLibraryCover("9780060628390"),
    href: googleSearch("Celebration of Discipline", "Richard J. Foster"),
    free: false,
  },
  {
    id: "holiness-god",
    title: "The Holiness of God",
    author: "R. C. Sproul",
    category: "Theology",
    description: "A clear and memorable exploration of God's holiness and the way it reshapes worship, sin, grace and Christian living.",
    cover: openLibraryCover("9780842339650"),
    href: googleSearch("The Holiness of God", "R. C. Sproul"),
    free: false,
  },
  {
    id: "desiring-god",
    title: "Desiring God",
    author: "John Piper",
    category: "Christian Living",
    description: "A call to pursue deep joy in God and to make delight in Him central to worship, obedience and the Christian life.",
    cover: openLibraryCover("9781601423108"),
    href: googleSearch("Desiring God", "John Piper"),
    free: false,
  },
];
