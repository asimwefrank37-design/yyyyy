import dotenv from "dotenv";
import mongoose from "mongoose";
import { User } from "../model/user.model";

dotenv.config();

// Usage: npm run make-admin -- someone@example.com
const main = async () => {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Pass the email of an existing account: npm run make-admin -- someone@example.com");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("Set MONGO_URI in .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { returnDocument: "after" });
  await mongoose.disconnect();

  if (!user) {
    console.error(`No account with the email ${email}. Sign up first, then run this again.`);
    process.exit(1);
  }

  console.log(`${user.firstName} ${user.lastName} (${email}) is now an admin.`);
};

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
