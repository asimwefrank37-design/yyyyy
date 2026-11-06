import dotenv from "dotenv";
import mongoose from "mongoose";
import { seedCategories } from "../services/seed.service";

dotenv.config();

// Adds City, Food, Craft, and Field Notes. Running this again skips the ones that exist.
const main = async () => {
  if (!process.env.MONGO_URI) {
    console.error("Set MONGO_URI in .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  await seedCategories();
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
