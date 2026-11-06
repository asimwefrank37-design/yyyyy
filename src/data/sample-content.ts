// Sample data for local development. The posts match reactapp/src/data/posts.js,
// so the homepage looks the same once it reads from the API.

export const SAMPLE_CATEGORIES = [
  { name: "City", description: "Streets, transport, and how Kigali moves." },
  { name: "Food", description: "Markets, kitchens, and recipes." },
  { name: "Craft", description: "Writing, making, learning." },
  { name: "Field Notes", description: "Farms, weather, and the hills." },
];

// Every sample author logs in with this password. Local development only.
export const SAMPLE_PASSWORD = "openmargin-sample";

export const SAMPLE_AUTHORS = [
  { key: "amina", firstName: "Amina", lastName: "Uwase", bio: "Rides the Nyabugogo bus and writes about it." },
  { key: "eric", firstName: "Eric", lastName: "Habimana", bio: "Markets, kitchens, and the walk home." },
  { key: "diane", firstName: "Diane", lastName: "Mukamana", bio: "Learning to code, one comma at a time." },
  { key: "claude", firstName: "Claude", lastName: "Ndayisaba", bio: "Notes from my uncle's farm in Musanze." },
  { key: "ineza", firstName: "Ineza", lastName: "Keza", bio: "Sunday recipes, no lectures." },
  { key: "patrick", firstName: "Patrick", lastName: "Mugisha", bio: "New to Kigali, still finding the right bus." },
  { key: "keza", firstName: "Keza", lastName: "Irakoze", bio: "Keeps the margin open." },
  { key: "samuel", firstName: "Samuel", lastName: "Hakizimana", bio: "Small evenings, written down." },
].map((author) => ({ ...author, email: `${author.key}@example.com` }));

type SampleAuthorKey = (typeof SAMPLE_AUTHORS)[number]["key"];

export interface SamplePost {
  author: SampleAuthorKey;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  image: string;
  publishedAt: string | null;
  likedBy: SampleAuthorKey[];
  comments: { author: SampleAuthorKey; body: string }[];
}

export const SAMPLE_POSTS: SamplePost[] = [
  {
    author: "amina",
    title: "One month on Kigali's new bus lanes",
    excerpt: "The aisle is still crowded. What changed is the waiting, and the watch that used to scold me every morning.",
    category: "City",
    tags: ["Kigali", "transport", "daily life"],
    image: "/images/road.jpg",
    publishedAt: "2026-10-21T07:30:00Z",
    body: "I have taken the Nyabugogo bus every weekday since the lanes opened. The ride itself is not pretty. People still pack the aisle, and the afternoon bus home is loud. What changed is the waiting. On KN 3 the bus used to crawl behind cars that stopped twice in one block. Now it keeps a clearer path, and I get to the office before the standup starts. I do not know yet if the lanes are fair to everyone else on the road. I only know my walk from the stop is the same, and my morning is quieter.",
    likedBy: ["eric", "diane", "patrick", "keza"],
    comments: [
      { author: "patrick", body: "Same on my route. The evening bus is still slow at the roundabout though." },
      { author: "eric", body: "The quieter morning is the real story here." },
    ],
  },
  {
    author: "eric",
    title: "The tomato seller who knows my order",
    excerpt: "She laughs when I ask for the soft ones, then adds two extra for the sauce I always burn.",
    category: "Food",
    tags: ["Kigali", "food", "market"],
    image: "/images/market.jpg",
    publishedAt: "2026-10-18T09:00:00Z",
    body: "The tomato seller at Kimironko knows I always ask for the soft ones. She laughs and gives me two extra when I buy a kilo for sauce. The market is louder on Saturday, and the walk back up the hill takes longer when the bag is wet. I still go. A kitchen without those tomatoes tastes like I skipped the week.",
    likedBy: ["amina", "ineza", "samuel"],
    comments: [{ author: "ineza", body: "Two extra for the sauce you always burn. I felt that." }],
  },
  {
    author: "diane",
    title: "The comma that taught me to stay",
    excerpt: "I used to close the laptop when the error turned red. A classmate read it out loud, one word at a time.",
    category: "Craft",
    tags: ["tech", "school"],
    image: "/images/writing.jpg",
    publishedAt: "2026-10-14T18:15:00Z",
    body: "I kept closing the laptop when the error was red. On Thursday a classmate sat with me and read the message out loud, word by word. The bug was a missing comma. I felt silly, then I felt awake. The page finally showed my name. I am still slow, and I still dislike the red text, but I can find a comma now.",
    likedBy: ["keza", "amina"],
    comments: [],
  },
  {
    author: "claude",
    title: "He asked me not to call the rain a disaster",
    excerpt: "The beans were leaning. We worked until the mist lifted, then ate potatoes with the skins on.",
    category: "Field Notes",
    tags: ["farming", "Musanze"],
    image: "/images/rain.jpg",
    publishedAt: "2026-10-09T06:45:00Z",
    body: "My uncle called before sunrise to say the beans were leaning. The rain had come hard for three nights, and the stakes he cut last week were too short. We worked until the mist lifted off the field. He does not trust a forecast on a phone. He trusts the way the soil sticks to the hoe. By noon the row was standing again. He told me not to write that the rain was a disaster. It was a heavy rain. The beans are still there.",
    likedBy: ["diane", "samuel", "eric", "amina", "keza"],
    comments: [{ author: "samuel", body: "Trusting the soil over the phone. Your uncle is right." }],
  },
  {
    author: "ineza",
    title: "Isombe, without the lecture",
    excerpt: "Pound the leaves until your arm complains. Add the peanut flour late, or the sauce turns stubborn.",
    category: "Food",
    tags: ["food", "recipe"],
    image: "/images/kitchen.jpg",
    publishedAt: "2026-10-05T12:00:00Z",
    body: "Soak the cassava leaves until the water runs clearer, then pound them until your arm complains. Fry the onion slowly. Add the peanut flour only after the leaves have softened, or the sauce goes thick too soon. My aunt adds a little smoked fish at the end and tells everyone she did not. Serve it with boiled green banana, not with a speech.",
    likedBy: ["eric"],
    comments: [],
  },
  {
    author: "patrick",
    title: "The bus conductor who said my stop correctly",
    excerpt: "I moved with two bags and a mattress. Last night I found the bus that takes me home without the long stand.",
    category: "City",
    tags: ["Kigali", "transport", "moving"],
    image: "/images/city.jpg",
    publishedAt: "2026-09-28T20:10:00Z",
    body: "I moved with two bags and a mattress tied to the roof of a friend's car. Huye was quiet in a way I understood. Kigali is quiet only very early. The first week I got lost between two buildings that looked the same. What I miss is the path behind my old house. I do not want to write that the city is too big. I want to write that I am still learning which bus takes me home. Last night I found it. The conductor said the stop the way my cousin says it, quickly, like everyone should already know.",
    likedBy: ["amina", "claude"],
    comments: [{ author: "amina", body: "Welcome to Kigali. Which bus was it?" }],
  },
  {
    author: "keza",
    title: "Why the margin is the point",
    excerpt: "The finished sentence is not the whole draft. The note in the margin is where the next writer begins.",
    category: "Craft",
    tags: ["writing"],
    image: "/images/books.jpg",
    publishedAt: "2026-09-20T10:00:00Z",
    body: "Open Margin started as a habit, not a brand. We left notes in the margins of each other's drafts: a clearer verb, a fact to check, a sentence that should stay because it sounded like the writer. This site is that habit with the door open. Bring a draft. Read someone else's. The margin is not empty space. It is the room we leave for the next sentence.",
    likedBy: ["diane", "ineza", "patrick"],
    comments: [],
  },
  {
    author: "samuel",
    title: "Bread in the doorway",
    excerpt: "The power went at seven, right when the kettle clicked. We waited with the door open and the street doing the lighting.",
    category: "City",
    tags: ["daily life", "Kigali"],
    image: "/images/writing.jpg",
    publishedAt: "2026-09-12T19:00:00Z",
    body: "The power went at 7, right when the kettle clicked. We ate bread in the doorway and waited. A neighbor's radio kept going on batteries. Nobody made a speech about it. When the lights returned, the kettle finished the cup it had started, and the evening went on as if the dark had been a short chapter.",
    likedBy: [],
    comments: [],
  },
  {
    author: "amina",
    title: "Notes for the evening bus",
    excerpt: "",
    category: "City",
    tags: ["transport"],
    image: "",
    publishedAt: null,
    body: "Still a draft. The evening bus is a different story from the morning one.",
    likedBy: [],
    comments: [],
  },
];
