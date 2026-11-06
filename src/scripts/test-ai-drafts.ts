import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { sampleDrafts } from "../data/sample-drafts";
import { improveParagraph, suggestTags, suggestTitles, writeSummary } from "../services/ai.service";

dotenv.config();

const main = async () => {
  if (process.env.MOCK_AI !== "true" && !process.env.LLM_API_KEY) {
    console.error("Set LLM_API_KEY, or set MOCK_AI=true to preview the script without a model.");
    process.exit(1);
  }

  const mock = process.env.MOCK_AI === "true";
  const note = mock
    ? "Mock mode. Run again with LLM_API_KEY set and MOCK_AI=false, then write where a suggestion was wrong or changed the author's meaning."
    : "";

  const results = [];

  for (const draft of sampleDrafts) {
    const titles = await suggestTitles(draft.body, draft.title);
    const summary = await writeSummary(draft.body, draft.title);
    const tags = await suggestTags(draft.body, draft.title, draft.existingTags);
    const improved = await improveParagraph(draft.paragraph);

    results.push({
      id: draft.id,
      topic: draft.topic,
      titles,
      summary,
      tags,
      paragraph: draft.paragraph,
      improved,
      notes: note,
    });
    console.log(`Checked draft ${draft.id}: ${draft.topic}`);
  }

  const file = path.resolve(__dirname, "../../ai-test-results.json");
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        mock,
        checkedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${results.length} draft checks to ${file}`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
