import crypto from "crypto";
import bcrypt from "bcrypt";
import { User } from "../model/user.model";

export const DEV_ACCOUNT_EMAIL = "dev-writer@openmargin.local";

// The account behind the dev session, so the editor can save real posts on a dev machine.
// Its password is random and never shown, so nobody can log in to it with a password.
export const ensureDevAccount = async () => {
  const existing = await User.findOne({ email: DEV_ACCOUNT_EMAIL }).select("_id role");
  if (existing) return existing;

  const password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  try {
    return await User.create({
      firstName: "Dev",
      lastName: "Writer",
      email: DEV_ACCOUNT_EMAIL,
      password,
      role: "author",
      bio: "The local dev session account.",
      avatar: { url: "/logo.svg", publicId: "local:logo" },
    });
  } catch {
    // Two requests created it at the same moment.
    const raced = await User.findOne({ email: DEV_ACCOUNT_EMAIL }).select("_id role");
    if (!raced) throw new Error("Could not create the dev account");
    return raced;
  }
};
