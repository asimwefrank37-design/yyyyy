import dotenv from "dotenv";
import mongoose from "mongoose";
import { SAMPLE_PASSWORD } from "../data/sample-content";
import { seedSamplePosts } from "../services/seed.service";

dotenv.config();

// Usage: npm run seed:sample
// Adds the categories, 8 sample authors, their posts, likes, and comments, and one draft.
const main = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("Sample data is for local development. Refusing to run with NODE_ENV=production.");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("Set MONGO_URI in .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  await seedSamplePosts();
  await mongoose.disconnect();

  console.log(`\nSample authors log in with their email (for example amina@example.com) and the password "${SAMPLE_PASSWORD}".`);
};

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
