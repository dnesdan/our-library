export type Profile = "Dan" | "Lucia";
export type ReadingStatus = "Reading" | "Finished" | "Want to Read" | "Unread";

export type Book = {
  id: number;
  title: string;
  author: string;
  year: number;
  genre: string;
  series?: string;
  owner: "Shared" | "Dan" | "Lucia";
  color: string;
  ink: string;
  accent: string;
  motif: "sun" | "moon" | "line" | "orb" | "type" | "arch";
  description: string;
  highShelf?: boolean;
  states: Record<Profile, { status: ReadingStatus; progress: number; favorite: boolean; rating: number }>;
};

const descriptions = [
  "A quietly absorbing story about memory, distance, and the places we choose to call home.",
  "An atmospheric, sharply observed novel where old secrets surface in unexpected ways.",
  "Ambitious ideas meet intimate lives in a book made for long evenings and unhurried reading.",
  "A vivid journey through history, landscape, and the small choices that shape a life.",
  "Elegant, humane, and full of detail — the kind of book that lingers after the last page.",
];

const raw: Array<[string, string, number, string, string | undefined, Book["owner"], string, string, string, Book["motif"]]> = [
  ["Dune", "Frank Herbert", 1965, "Science Fiction", "Dune Chronicles", "Shared", "#d99a3e", "#2c1a0f", "#f2d08b", "sun"],
  ["The Snowman", "Jo Nesbø", 2007, "Crime", "Harry Hole", "Shared", "#e8ece9", "#17211e", "#ba2f2a", "line"],
  ["1984", "George Orwell", 1949, "Literature", undefined, "Dan", "#b8332c", "#f6e8cb", "#1e1714", "type"],
  ["The Night Archive", "Mara Voss", 2021, "Fantasy", "The Archive", "Lucia", "#232441", "#eee3c9", "#aa8259", "moon"],
  ["The Glass Hotel", "Emily St. John Mandel", 2020, "Literature", undefined, "Lucia", "#6f8e91", "#f3ead9", "#d7b56d", "orb"],
  ["A Short History of Nearly Everything", "Bill Bryson", 2003, "History", undefined, "Shared", "#183c60", "#f5ead4", "#d57a3d", "orb"],
  ["Klara and the Sun", "Kazuo Ishiguro", 2021, "Literature", undefined, "Lucia", "#f0b249", "#27221d", "#d9563b", "sun"],
  ["The Pragmatic Programmer", "David Thomas & Andrew Hunt", 1999, "Technology", undefined, "Dan", "#303841", "#f2e6ce", "#8dbb9b", "line"],
  ["The Name of the Rose", "Umberto Eco", 1980, "Crime", undefined, "Shared", "#6a1f20", "#eadbb8", "#c49a51", "arch"],
  ["Norwegian Wood", "Haruki Murakami", 1987, "Literature", undefined, "Shared", "#316c59", "#f5eee0", "#d84d47", "moon"],
  ["The Left Hand of Darkness", "Ursula K. Le Guin", 1969, "Science Fiction", "Hainish Cycle", "Lucia", "#d7d1c3", "#1f2629", "#5c7e8e", "orb"],
  ["Sapiens", "Yuval Noah Harari", 2011, "History", undefined, "Dan", "#f0e6d0", "#322a25", "#b54f38", "line"],
  ["The Shadow of the Wind", "Carlos Ruiz Zafón", 2001, "Literature", "Cemetery of Forgotten Books", "Shared", "#2d2c30", "#f0dec1", "#a96c47", "arch"],
  ["Circe", "Madeline Miller", 2018, "Fantasy", undefined, "Lucia", "#c58d28", "#251b10", "#f4d68f", "sun"],
  ["Project Hail Mary", "Andy Weir", 2021, "Science Fiction", undefined, "Dan", "#162a39", "#f5e9d2", "#d8633e", "orb"],
  ["The Cartographer’s Wife", "Elena Vale", 2019, "Travel", "Atlas Stories", "Lucia", "#c46a46", "#f5eadb", "#243d45", "line"],
  ["Atomic Habits", "James Clear", 2018, "Biography", undefined, "Dan", "#f3f0e7", "#22231f", "#d5a84c", "orb"],
  ["The Midnight Library", "Matt Haig", 2020, "Fantasy", undefined, "Shared", "#164b47", "#f0dfb6", "#c8a15d", "arch"],
  ["The Three-Body Problem", "Cixin Liu", 2008, "Science Fiction", "Remembrance of Earth's Past", "Dan", "#222e33", "#ece4d4", "#d55b38", "sun"],
  ["Educated", "Tara Westover", 2018, "Biography", undefined, "Lucia", "#ebe5d6", "#262a2b", "#d9b45b", "line"],
  ["The Silent Patient", "Alex Michaelides", 2019, "Crime", undefined, "Shared", "#e9e4da", "#261e1d", "#9e2626", "type"],
  ["Piranesi", "Susanna Clarke", 2020, "Fantasy", undefined, "Lucia", "#8aa2a5", "#f5eadb", "#d7b66f", "arch"],
  ["Seven Brief Lessons on Physics", "Carlo Rovelli", 2014, "Science Fiction", undefined, "Dan", "#171e2e", "#eae5d8", "#cf5341", "orb"],
  ["The Thursday Murder Club", "Richard Osman", 2020, "Crime", "Thursday Murder Club", "Shared", "#e9d6aa", "#35291d", "#d85c3a", "type"],
  ["A Gentleman in Moscow", "Amor Towles", 2016, "Literature", undefined, "Shared", "#8e332d", "#f4e4c9", "#d4a459", "arch"],
  ["The Code Breaker", "Walter Isaacson", 2021, "Technology", undefined, "Dan", "#e5dfd3", "#212a35", "#5d83a1", "line"],
  ["Invisible Cities", "Italo Calvino", 1972, "Travel", undefined, "Lucia", "#bc6849", "#f2e1c5", "#294d53", "arch"],
  ["Foundation", "Isaac Asimov", 1951, "Science Fiction", "Foundation", "Dan", "#385b70", "#f5e9cd", "#c07b48", "orb"],
  ["The Secret History", "Donna Tartt", 1992, "Literature", undefined, "Lucia", "#233e39", "#efe0bc", "#bb8b50", "arch"],
  ["On Writing", "Stephen King", 2000, "Biography", undefined, "Shared", "#2b2e33", "#f0e8d9", "#a44237", "type"],
  ["The Long Way Home", "Nora Bell", 2022, "Travel", "Atlas Stories", "Shared", "#8f5747", "#f5ead8", "#d9b670", "sun"],
  ["Neuromancer", "William Gibson", 1984, "Science Fiction", "Sprawl", "Dan", "#313f48", "#eee5d4", "#8aa26b", "line"],
  ["The Paris Apartment", "Lucy Foley", 2022, "Crime", undefined, "Lucia", "#7e2028", "#f2ddbd", "#c99d60", "arch"],
  ["Braiding Sweetgrass", "Robin Wall Kimmerer", 2013, "Biography", undefined, "Lucia", "#496a55", "#f1e5cb", "#b89152", "line"],
  ["The Master Algorithm", "Pedro Domingos", 2015, "Technology", undefined, "Dan", "#d8d4c8", "#202b35", "#b64739", "orb"],
  ["The Ember Crown", "Iris Thorne", 2023, "Fantasy", "Ash & Laurel", "Shared", "#5b2727", "#f0d9b4", "#d19847", "sun"],
  ["Crime and Punishment", "Fyodor Dostoevsky", 1866, "Literature", undefined, "Shared", "#39332f", "#efe0c6", "#9c4639", "type"],
  ["The Silk Roads", "Peter Frankopan", 2015, "History", undefined, "Dan", "#b07843", "#221d18", "#e2c181", "line"],
  ["The Book of Tea", "Kakuzō Okakura", 1906, "History", undefined, "Lucia", "#d8cba8", "#29342d", "#7f9a78", "moon"],
  ["Leviathan Wakes", "James S. A. Corey", 2011, "Science Fiction", "The Expanse", "Shared", "#1d2e42", "#f1e4ca", "#c2633e", "orb"],
  ["The Lighthouse Keeper", "Ada North", 2018, "Literature", undefined, "Lucia", "#2d5262", "#f2e8d6", "#e0af61", "sun"],
  ["A Memory Called Empire", "Arkady Martine", 2019, "Science Fiction", "Teixcalaan", "Dan", "#492e50", "#f0e2cb", "#cb8d52", "moon"],
  ["The Art of Stillness", "Pico Iyer", 2014, "Travel", undefined, "Shared", "#e8e0ce", "#273331", "#bd6847", "orb"],
  ["The Last Algorithm", "Elias Ward", 2024, "Technology", "Quiet Machines", "Dan", "#2b3038", "#f2e6d1", "#c07146", "line"],
];

export const books: Book[] = raw.map((b, index) => {
  const danProgress = [68, 100, 17, 0, 0, 100, 0, 54, 100, 24, 0][index % 11];
  const luciaProgress = [35, 42, 100, 76, 20, 0, 61, 0, 100, 0, 48, 100][index % 12];
  const status = (p: number): ReadingStatus => p === 100 ? "Finished" : p > 0 ? "Reading" : index % 4 === 0 ? "Want to Read" : "Unread";
  return {
    id: index + 1,
    title: b[0], author: b[1], year: b[2], genre: b[3], series: b[4], owner: b[5],
    color: b[6], ink: b[7], accent: b[8], motif: b[9],
    description: descriptions[index % descriptions.length],
    highShelf: index % 7 === 0 || [1, 18, 35].includes(index),
    states: {
      Dan: { status: status(danProgress), progress: danProgress, favorite: index % 6 === 0, rating: danProgress === 100 ? 4 + (index % 2) : 0 },
      Lucia: { status: status(luciaProgress), progress: luciaProgress, favorite: index % 5 === 0 || index === 1, rating: luciaProgress === 100 ? 4 + ((index + 1) % 2) : 0 },
    },
  };
});

export const readerPages = [
  ["Chapter Nine", "The room remembered the rain.", "It traced the tall windows in silver threads and softened the city beyond them until every roof and chimney seemed drawn in charcoal. On the table, the book waited where it had been left, its ribbon marking a place neither of them could quite remember choosing.", "Lucia crossed to the shelves. The ladder gave a familiar wooden sigh as she moved it along the brass rail. Somewhere below, the fire settled with a small bright crack."],
  ["A Quiet Discovery", "There are houses that reveal themselves all at once, and houses that prefer to be read slowly.", "This one had kept its smallest room hidden behind a wall of winter coats. When Dan pressed the old brass catch, the panel opened on shelves no wider than a hand, each one crowded with notebooks, postcards, and thin volumes bound in fading cloth.", "They stood together at the threshold, delighted by the impossible abundance of it."],
  ["In the Margins", "The first note was written in green ink.", "Not a name, not a date — only a sentence in the narrow margin: Keep this for a rainy Sunday. Beneath it, in another hand and a different decade, someone had added: Or for the person who makes any day feel like one.", "Outside, the rain continued. Inside, the lamp made a small gold island beside the chair."],
  ["The Map", "By midnight they had covered the table with clues.", "A library card. A tram ticket. A photograph of a hill above the river. The pieces did not make a map in any ordinary sense, yet arranged together they pointed unmistakably toward a place both of them knew.", "Dan turned the photograph over. There, almost erased by time, was the outline of a door."],
  ["A Door in the Hill", "Morning arrived pale and clear.", "They took the steep path slowly, carrying coffee in paper cups and the small red book between them. The city fell away behind the trees. At the crest, exactly where the photograph promised, ivy covered a shallow stone arch.", "The key from the book's hollow spine fit on the first try."],
  ["The Room Beyond", "Warm air met them on the other side.", "The room should have been cold, abandoned for years, but a fire burned low in the grate. Shelves climbed into shadow. A wooden ladder rested beneath a row of books whose spines bore no titles.", "On the table lay one open volume, waiting at a blank page."],
  ["What We Keep", "Every collection begins with a choice.", "They understood then that the room did not preserve every story, only the ones two people agreed were worth carrying together. A journey. A joke. A difficult winter. The exact light on an ordinary Tuesday afternoon.", "Lucia picked up the pen. Dan turned the page."],
  ["Our Library", "They wrote until the fire was embers.", "The shelves shifted quietly around them, making space. One book became three, then seven, each spine taking on a color of its own. At the top of the tallest case, a small brass plaque caught the last of the lamplight.", "It read simply: Our Library."],
];
