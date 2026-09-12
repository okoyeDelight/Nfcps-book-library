export type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
  cover?: string;
  verified: boolean;
};

const googleCover = (id: string) =>
  `https://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

const isbnCover = (isbn: string) =>
  `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;

export const books: Book[] = [
  { id: 1, title: 'God Cannot Change — Why Pray?', author: 'Emmanuel Unamba', category: 'Prayer', description: 'The True Nature of a Christian Prayer explores why prayer matters when God is unchanging, presenting prayer as a life aligned with His will.', cover: isbnCover('9789785230758'), verified: true },
  { id: 2, title: 'Love Not the World', author: 'Watchman Nee', category: 'Christian Living', description: 'A call to live in the world without being mastered by its values, systems and attractions.', cover: googleCover('cAiJAAAACAAJ'), verified: true },
  { id: 3, title: 'Wondrous', author: 'Author to verify', category: 'Christian Living', description: 'A title from the NFCPS physical collection. Edition details are still being verified.', verified: false },
  { id: 4, title: 'How Masters Learn: A Guide to Evidence-Based Learning', author: 'G. Obiasor', category: 'Learning', description: 'A practical guide to evidence-based learning, recall, comprehension and disciplined mastery.', verified: true },
  { id: 5, title: 'Living by the Book', author: 'Howard G. Hendricks & William D. Hendricks', category: 'Bible Study', description: 'A practical Bible-study guide built around observation, interpretation and application.', cover: googleCover('f4bhGwAACAAJ'), verified: true },
  { id: 6, title: 'Successful Home Cell Groups', author: 'David Yonggi Cho & Harold Hostetler', category: 'Leadership', description: 'Principles for healthy small-group growth, fellowship, evangelism and leadership.', cover: googleCover('88OZs7zbThAC'), verified: true },
  { id: 7, title: 'Jesus Wept', author: 'Bruce Marchiano', category: 'Christian Living', description: 'A reflection on the compassion of Jesus and what His tears reveal about God in suffering.', cover: googleCover('Fc4QPwAACAAJ'), verified: true },
  { id: 8, title: 'How to Claim the Benefits of the Will', author: 'John Osteen', category: 'Faith', description: 'A faith-building resource on understanding and appropriating what believers have received in Christ.', cover: isbnCover('9780912631035'), verified: true },
  { id: 9, title: 'One Thing Is Needful', author: 'Author to verify', category: 'Spiritual Growth', description: 'A devotional title emphasizing spiritual priorities and centering life on what matters most before God.', verified: false },
  { id: 10, title: 'Christian Retreat & Genealogical Healing', author: 'Oguejiofo C. P. Ezeanya', category: 'Healing', description: 'A 2014 Christian retreat resource from Christus Doorways Ltd., Enugu, focused on prayer, family history, spiritual healing and freedom.', verified: true },
  { id: 11, title: 'Advanced Bible Course: Studies in the Deeper Life', author: 'E. W. Kenyon', category: 'Bible Study', description: 'A structured course for deeper understanding of Scripture, identity in Christ and spiritual growth.', cover: googleCover('qksePQAACAAJ'), verified: true },
  { id: 12, title: 'Feynoi and Beyond', author: 'Nonso Nwagbo', category: 'Christian Fiction', description: 'A spiritual fantasy about keepers of earth, kings, angels and the conflict dividing Lucifer and Michael.', verified: true },
  { id: 13, title: 'Covenant', author: 'Author to verify', category: 'Bible Study', description: 'A covenant-focused title in the NFCPS physical collection; exact edition details are still being confirmed.', verified: false },
  { id: 14, title: 'Marriage Covenant', author: 'Derek Prince', category: 'Marriage', description: 'Biblical principles for commitment, unity, endurance and a Christ-centred marriage.', cover: googleCover('Qbq4AAAACAAJ'), verified: true },
  { id: 15, title: 'What You Don’t Know May Be Killing You', author: 'Don Colbert, M.D.', category: 'Health', description: 'A health-focused guide to overlooked lifestyle and environmental risks and preventive choices.', cover: googleCover('Ev5cEQAAQBAJ'), verified: true },
  { id: 16, title: 'Loyalty and Disloyalty', author: 'Dag Heward-Mills', category: 'Leadership', description: 'A practical leadership book on loyalty, betrayal, allegiance and healthy organisations.', cover: googleCover('_qNfDwAAQBAJ'), verified: true },
  { id: 17, title: 'The Power of Right Believing', author: 'Joseph Prince', category: 'Faith', description: 'A grace-centred book on replacing fear, guilt and destructive patterns with gospel-centred truth.', cover: googleCover('3wLonAEACAAJ'), verified: true },
  { id: 18, title: 'Receiving Divine Revelation', author: 'Fuchsia Pickett', category: 'Spiritual Growth', description: 'A guide to understanding Scripture through the teaching ministry of the Holy Spirit.', cover: googleCover('chxdEQAAQBAJ'), verified: true },
];
