import { AiInputError, AiUnavailableError, mockAiEnabled, requestJson } from "./llm.service";

const JSON_RULE =
  "Respond with JSON only. Do not use markdown. Do not add keys that were not requested.";

const asRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const cleanText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const stringList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
};

export const alignTags = (suggested: string[], existing: string[]) => {
  const seen = new Set<string>();
  const aligned: string[] = [];

  for (const tag of suggested) {
    const clean = tag.trim();
    if (!clean) continue;
    const match = existing.find((item) => item.toLowerCase() === clean.toLowerCase());
    const value = match ?? clean;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aligned.push(value);
    if (aligned.length === 5) break;
  }

  return aligned;
};

const clip = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
};

const sentences = (text: string) => {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
};

const mockTitles = (draft: string, title: string) => {
  const firstLine = draft.split("\n").find((line) => line.trim()) ?? draft;
  const base = title.trim() || clip(firstLine, 70);
  return [base, `Notes on ${clip(base, 48)}`, `What I noticed about ${clip(base, 40)}`];
};

const mockSummary = (draft: string) => {
  const parts = sentences(draft).slice(0, 2);
  if (parts.length === 0) return clip(draft, 220);
  return parts.join(" ");
};

const KEYWORDS: Array<[RegExp, string]> = [
  [/bus|commute|lane|taxi/i, "transport"],
  [/kigali|nyamirambo|kimironko/i, "Kigali"],
  [/market|food|tomato|isombe|recipe|lunch/i, "food"],
  [/school|class|fee|student/i, "school"],
  [/javascript|code|phone|mobile money|app/i, "tech"],
  [/farm|rain|musanze|harvest/i, "farming"],
  [/match|football|apr|goal/i, "sport"],
];

const mockTags = (draft: string, existing: string[]) => {
  const found = KEYWORDS.filter(([pattern]) => pattern.test(draft)).map(([, tag]) => tag);
  return alignTags(found, existing);
};

const mockImprove = (paragraph: string) => {
  const clean = paragraph.replace(/\s+/g, " ").trim();
  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
};

export const assertDraft = (draft: string) => {
  if (draft.trim().length < 20) {
    throw new AiInputError("Write a little more of the draft before asking the assistant.");
  }
  if (draft.length > 12000) {
    throw new AiInputError("This draft is too long for one assistant request. Select a smaller part.");
  }
};

export const assertParagraph = (paragraph: string) => {
  if (paragraph.trim().length < 10) {
    throw new AiInputError("Select a paragraph in the draft first.");
  }
  if (paragraph.length > 4000) {
    throw new AiInputError("Select a shorter paragraph. The assistant does not rewrite the whole post.");
  }
};

export const suggestTitles = async (draft: string, title: string) => {
  assertDraft(draft);
  if (mockAiEnabled()) return mockTitles(draft, title);

  const payload = await requestJson(
    [
      "You suggest blog titles. The author decides what to keep.",
      "Return exactly 3 title options based on the draft.",
      "Do not write the post, a summary, or tags.",
      'JSON shape: {"titles":["...","...","..."]}',
      JSON_RULE,
    ].join(" "),
    `Working title: ${title.trim() || "(none yet)"}\n\nDraft:\n${draft}`,
  );

  const titles = stringList(asRecord(payload)?.titles).slice(0, 3);
  if (titles.length === 0) {
    throw new AiUnavailableError("The assistant did not return any titles. Try again.");
  }
  return titles;
};

export const writeSummary = async (draft: string, title: string) => {
  assertDraft(draft);
  if (mockAiEnabled()) return mockSummary(draft);

  const payload = await requestJson(
    [
      "You write a homepage excerpt for a blog post. The author decides what to keep.",
      "Write 2 or 3 sentences. Stay faithful to the draft and do not add facts.",
      "Do not write a new article.",
      'JSON shape: {"summary":"..."}',
      JSON_RULE,
    ].join(" "),
    `Working title: ${title.trim() || "(none yet)"}\n\nDraft:\n${draft}`,
  );

  const summary = cleanText(asRecord(payload)?.summary);
  if (!summary) {
    throw new AiUnavailableError("The assistant did not return a summary. Try again.");
  }
  return summary;
};

export const suggestTags = async (draft: string, title: string, existingTags: string[]) => {
  assertDraft(draft);
  const existing = existingTags.map((tag) => tag.trim()).filter(Boolean);
  if (mockAiEnabled()) return mockTags(`${title}\n${draft}`, existing);

  const payload = await requestJson(
    [
      "You suggest tags for a blog post. The author decides what to keep.",
      "Return at most 5 short tags.",
      "Use a tag from the existing list when it fits, and keep that list's spelling.",
      "Invent a tag only when none of the existing tags fit.",
      'JSON shape: {"tags":["..."]}',
      JSON_RULE,
    ].join(" "),
    `Existing tags: ${existing.length ? existing.join(", ") : "(none yet)"}\nWorking title: ${
      title.trim() || "(none yet)"
    }\n\nDraft:\n${draft}`,
  );

  const tags = alignTags(stringList(asRecord(payload)?.tags), existing);
  if (tags.length === 0) {
    throw new AiUnavailableError("The assistant did not return any tags. Try again.");
  }
  return tags;
};

export const improveParagraph = async (paragraph: string) => {
  assertParagraph(paragraph);
  const improved = mockAiEnabled()
    ? mockImprove(paragraph)
    : cleanText(
        asRecord(
          await requestJson(
            [
              "You edit one paragraph for clarity and grammar.",
              "Keep the author's meaning, facts, and voice.",
              "Do not add ideas, examples, or a closing the author did not write.",
              "Do not write any other paragraph or a full post.",
              'JSON shape: {"improved":"..."}',
              JSON_RULE,
            ].join(" "),
            paragraph,
          ),
        )?.improved,
      );

  if (!improved) {
    throw new AiUnavailableError("The assistant did not return a revision. Try again.");
  }

  if (improved.length > Math.max(paragraph.length * 3, paragraph.length + 600)) {
    throw new AiUnavailableError(
      "The assistant changed too much of the paragraph. Try again, or keep your version.",
    );
  }

  return improved;
};
