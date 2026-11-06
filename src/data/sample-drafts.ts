export interface SampleDraft {
  id: number;
  topic: string;
  title: string;
  body: string;
  paragraph: string;
  existingTags: string[];
}

const tags = ["Kigali", "transport", "daily life", "food", "school", "tech", "sport", "farming"];

export const sampleDrafts: SampleDraft[] = [
  {
    id: 1,
    topic: "short commute note",
    title: "",
    body: "The new bus lanes on KN 5 made my morning shorter. I still stand, but the bus no longer sits behind taxis at the roundabout.",
    paragraph:
      "The new bus lanes on KN 5 made my morning shorter. I still stand, but the bus no longer sits behind taxis at the roundabout.",
    existingTags: tags,
  },
  {
    id: 2,
    topic: "Kigali bus lanes, medium",
    title: "One month on the new bus lanes",
    body: "I have taken the Nyabugogo bus every weekday for a month since the lanes opened. The ride itself is not pretty. People still pack the aisle, and the afternoon bus home is loud. What changed is the waiting. On KN 3 the bus used to crawl behind cars that stopped twice in one block. Now it keeps a clearer path, and I get to the office before the standup starts. I do not know if the lanes are fair to the taxis. I only know that my walk from the stop is the same, and my watch is less angry.",
    paragraph:
      "On KN 3 the bus used to crawl behind cars that stopped twice in one block. Now it keeps a clearer path, and I get to the office before the standup starts.",
    existingTags: tags,
  },
  {
    id: 3,
    topic: "market food, short",
    title: "Tomatoes at Kimironko",
    body: "The tomato seller at Kimironko knows I always ask for the soft ones. She laughs and gives me two extra when I buy a kilo for sauce.",
    paragraph:
      "The tomato seller at Kimironko knows I always ask for the soft ones. She laughs and gives me two extra when I buy a kilo for sauce.",
    existingTags: tags,
  },
  {
    id: 4,
    topic: "learning to code",
    title: "My first week of JavaScript",
    body: "I kept closing the laptop when the error was red. On Thursday a classmate sat with me and read the message out loud, word by word. The bug was a missing comma. I felt silly, then I felt awake. The page finally showed my name. I am still slow, and I still dislike the red text, but I can find a comma now.",
    paragraph:
      "I kept closing the laptop when the error was red. On Thursday a classmate sat with me and read the message out loud, word by word.",
    existingTags: tags,
  },
  {
    id: 5,
    topic: "farming, longer",
    title: "Rain in Musanze",
    body: "My uncle called before sunrise to say the beans were leaning. The rain had come hard for three nights, and the stakes he cut last week were too short. I took the bus up with a bundle of longer sticks and a plastic sheet that smelled like the shop. We worked until the mist lifted off the field. He does not trust a forecast on a phone. He trusts the way the soil sticks to the hoe. By noon the row was standing again. We ate potatoes with the skins on and he told me not to write that the rain was a disaster. It was a heavy rain. The beans are still there. Some of the lower leaves went yellow, and we will watch them. That is the whole story he wanted told.",
    paragraph:
      "He does not trust a forecast on a phone. He trusts the way the soil sticks to the hoe.",
    existingTags: tags,
  },
  {
    id: 6,
    topic: "football, strong voice",
    title: "",
    body: "APR did not deserve that draw. The goalkeeper was the only one who looked like he came to work. Everyone else passed sideways and waited for a whistle that was never going to save them.",
    paragraph:
      "APR did not deserve that draw. The goalkeeper was the only one who looked like he came to work.",
    existingTags: tags,
  },
  {
    id: 7,
    topic: "recipe voice",
    title: "Isombe on a Sunday",
    body: "Soak the cassava leaves until the water runs clearer, then pound them until your arm complains. Fry the onion slowly. Add the peanut flour only after the leaves have softened, or the sauce goes thick too soon. My aunt adds a little smoked fish at the end and tells everyone she did not. Serve it with boiled green banana, not with a lecture.",
    paragraph:
      "Add the peanut flour only after the leaves have softened, or the sauce goes thick too soon.",
    existingTags: tags,
  },
  {
    id: 8,
    topic: "very short power cut",
    title: "Lights out",
    body: "The power went at 7, right when the kettle clicked. We ate bread in the doorway and waited.",
    paragraph: "The power went at 7, right when the kettle clicked. We ate bread in the doorway and waited.",
    existingTags: tags,
  },
  {
    id: 9,
    topic: "messy grammar, school fees",
    title: "The line at the bank",
    body: "Yesterday I go to the bank for school fees and the line was very long and the person tell me to come back tomorrow but I already miss class and my mother she is not happy because the money was ready since monday.",
    paragraph:
      "Yesterday I go to the bank for school fees and the line was very long and the person tell me to come back tomorrow but I already miss class and my mother she is not happy because the money was ready since monday.",
    existingTags: tags,
  },
  {
    id: 10,
    topic: "moving cities, long",
    title: "From Huye to Kigali",
    body: "I moved with two bags and a mattress tied to the roof of a friend's car. Huye was quiet in a way I understood. Kigali is quiet only very early, before the moto engines start. The first week I got lost between two buildings that looked the same and I was ashamed to call anyone. I bought milk from a shop that stays open late and drank it warm because I had not bought a pan yet. Work is fine. The room is fine. What I miss is the path behind my old house, the one that turns to mud and then to a view of the valley. I do not want to write that the city is too big. I want to write that I am still learning which bus takes me home without making me stand for forty minutes. Last night I found that bus. I knew it was the right one because the conductor said the stop the way my cousin says it, quickly, like everyone should already know.",
    paragraph:
      "I do not want to write that the city is too big. I want to write that I am still learning which bus takes me home without making me stand for forty minutes.",
    existingTags: tags,
  },
];
