export type PhysicalBook = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
  cover?: string;
  source?: string;
  verified: boolean;
};

export type Ebook = {
  id: string;
  title: string;
  author: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  description: string;
};

const googleCover = (id: string) =>
  `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

const isbnCover = (isbn: string) =>
  `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

export const physicalBooks: PhysicalBook[] = [
  {
    id: 1,
    title: "God Cannot Change — Why Pray?",
    author: "Emmanuel Unamba",
    category: "Prayer",
    description: "The True Nature of a Christian Prayer examines the apparent tension between God's immutability and answered prayer, presenting prayer as a life aligned with God's will rather than an attempt to change His nature.",
    cover: isbnCover("9789785230758"),
    verified: true,
  },
  {
    id: 2,
    title: "Love Not the World",
    author: "Watchman Nee",
    category: "Christian Living",
    description: "Watchman Nee challenges believers to live in the world without being mastered by its values, systems and attractions, calling Christians to distinctiveness and wholehearted devotion to Christ.",
    cover: googleCover("cAiJAAAACAAJ"),
    source: "https://books.google.com/books?id=cAiJAAAACAAJ",
    verified: true,
  },
  {
    id: 3,
    title: "Wondrous",
    author: "Author to verify",
    category: "Christian Living",
    description: "A title from the NFCPS physical collection. The full subtitle and author are still being verified from the original edition so the library does not publish a guessed attribution.",
    verified: false,
  },
  {
    id: 4,
    title: "How Masters Learn: A Guide to Evidence-Based Learning",
    author: "G. Obiasor",
    category: "Learning",
    description: "A practical guide to evidence-based learning strategies, focused on improving study habits, recall, comprehension and the disciplined process of mastering new knowledge.",
    verified: true,
  },
  {
    id: 5,
    title: "Living by the Book",
    author: "Howard G. Hendricks & William D. Hendricks",
    category: "Bible Study",
    description: "A practical Bible-study guide built around observation, interpretation and application, helping readers study Scripture more carefully and apply it more faithfully.",
    cover: googleCover("f4bhGwAACAAJ"),
    source: "https://books.google.com/books?id=f4bhGwAACAAJ",
    verified: true,
  },
  {
    id: 6,
    title: "Successful Home Cell Groups",
    author: "David Yonggi Cho & Harold Hostetler",
    category: "Leadership",
    description: "A practical account of the home-cell model of church life, covering leadership, fellowship, evangelism and the principles behind healthy small-group growth.",
    cover: googleCover("88OZs7zbThAC"),
    source: "https://books.google.com/books?id=88OZs7zbThAC",
    verified: true,
  },
  {
    id: 7,
    title: "Jesus Wept",
    author: "Bruce Marchiano",
    category: "Christian Living",
    description: "Built around John 11:35, this book reflects on the compassion of Jesus and what His tears reveal about God's response to suffering, grief and human pain.",
    cover: googleCover("Fc4QPwAACAAJ"),
    source: "https://books.google.com/books?id=Fc4QPwAACAAJ",
    verified: true,
  },
  {
    id: 8,
    title: "How to Claim the Benefits of the Will",
    author: "John Osteen",
    category: "Faith",
    description: "A short faith-building resource about understanding what believers have received in Christ and learning how to appropriate those promises with confidence.",
    cover: isbnCover("9780912631035"),
    source: "https://www.vccwordshop.com/books/how-to-claim-the-benefits-of-the-will",
    verified: true,
  },
  {
    id: 9,
    title: "One Thing Is Needful",
    author: "Author to verify",
    category: "Spiritual Growth",
    description: "A devotional title in the NFCPS collection emphasizing spiritual priorities and the importance of centering life on what matters most before God. The exact edition details are still being confirmed.",
    verified: false,
  },
  {
    id: 10,
    title: "Christian Retreat & Genealogical Healing",
    author: "Author to verify",
    category: "Healing",
    description: "A Christian retreat resource focused on prayer, family history, spiritual healing and freedom. The edition details are still being verified from the physical copy.",
    verified: false,
  },
  {
    id: 11,
    title: "Advanced Bible Course: Studies in the Deeper Life",
    author: "E. W. Kenyon",
    category: "Bible Study",
    description: "A structured course designed to lead mature Christians into a deeper understanding of Scripture, identity in Christ and practical spiritual growth.",
    cover: googleCover("qksePQAACAAJ"),
    source: "https://books.google.com/books?id=qksePQAACAAJ",
    verified: true,
  },
  {
    id: 12,
    title: "Feynoi and Beyond",
    author: "Nonso Nwagbo",
    category: "Christian Fiction",
    description: "A spiritual fantasy story about the first keepers of earth, kings and angels, and the conflict that eventually divides Lucifer and Michael.",
    verified: true,
  },
  {
    id: 13,
    title: "Covenant",
    author: "Author to verify",
    category: "Bible Study",
    description: "A covenant-focused title in the NFCPS physical collection. The full title and author will be confirmed from a clearer source image rather than guessed from the photographed cover.",
    verified: false,
  },
  {
    id: 14,
    title: "Marriage Covenant",
    author: "Derek Prince",
    category: "Marriage",
    description: "Derek Prince presents marriage as a covenant relationship and explains biblical principles for commitment, unity, endurance and a Christ-centred home.",
    cover: googleCover("Qbq4AAAACAAJ"),
    source: "https://books.google.com/books?id=Qbq4AAAACAAJ",
    verified: true,
  },
  {
    id: 15,
    title: "What You Don't Know May Be Killing You",
    author: "Don Colbert, M.D.",
    category: "Health",
    description: "A health-focused guide to often-overlooked lifestyle and environmental risks, encouraging readers to make more informed choices about prevention and wellbeing.",
    cover: googleCover("Ev5cEQAAQBAJ"),
    source: "https://play.google.com/store/books/details?id=Ev5cEQAAQBAJ",
    verified: true,
  },
  {
    id: 16,
    title: "Loyalty and Disloyalty",
    author: "Dag Heward-Mills",
    category: "Leadership",
    description: "A practical leadership book examining loyalty, betrayal, allegiance and the attitudes that either strengthen or destabilize churches and organisations.",
    cover: googleCover("_qNfDwAAQBAJ"),
    source: "https://books.google.com/books?id=_qNfDwAAQBAJ",
    verified: true,
  },
  {
    id: 17,
    title: "The Power of Right Believing",
    author: "Joseph Prince",
    category: "Faith",
    description: "A grace-centred book on how beliefs shape thoughts, emotions and behaviour, with practical keys for replacing fear, guilt and destructive patterns with gospel-centred truth.",
    cover: googleCover("3wLonAEACAAJ"),
    source: "https://books.google.com/books?id=3wLonAEACAAJ",
    verified: true,
  },
  {
    id: 18,
    title: "Receiving Divine Revelation",
    author: "Fuchsia Pickett",
    category: "Spiritual Growth",
    description: "A guide to understanding Scripture through the teaching ministry of the Holy Spirit and growing in personal revelation of Christ through God's Word.",
    cover: googleCover("chxdEQAAQBAJ"),
    source: "https://play.google.com/store/books/details?id=chxdEQAAQBAJ",
    verified: true,
  },
];

export const freeEbooks: Ebook[] = [
  {
    id: "pilgrims-progress",
    title: "The Pilgrim's Progress",
    author: "John Bunyan",
    category: "Christian Classics",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/131",
    description: "A classic Christian allegory following Christian's journey from the City of Destruction toward the Celestial City.",
  },
  {
    id: "imitation-of-christ",
    title: "The Imitation of Christ",
    author: "Thomas à Kempis",
    category: "Devotional",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/1653",
    description: "A historic devotional work on humility, inner holiness, discipleship and a life centred on Christ.",
  },
  {
    id: "practice-presence",
    title: "The Practice of the Presence of God",
    author: "Brother Lawrence",
    category: "Devotional",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/5657",
    description: "Simple, enduring reflections on learning to live with a continual awareness of God's presence in ordinary life.",
  },
  {
    id: "orthodoxy",
    title: "Orthodoxy",
    author: "G. K. Chesterton",
    category: "Apologetics",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/16769",
    description: "Chesterton's energetic personal defence of Christian belief, wonder, reason and the imaginative coherence of orthodoxy.",
  },
  {
    id: "confessions",
    title: "Confessions of St. Augustine",
    author: "Augustine of Hippo",
    category: "Christian Classics",
    sourceName: "Project Gutenberg",
    sourceUrl: "https://www.gutenberg.org/ebooks/77585",
    description: "Augustine's influential spiritual autobiography tracing sin, conversion, grace, memory and the soul's longing for God.",
  },
];
