import { Schema, model } from "mongoose";

export type UserRole = "admin" | "author";

export interface Avatar {
  url: string;
  publicId: string;
}

export interface UserRecord {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  bio: string;
  avatar: Avatar;
  isBlocked: boolean;
  resetCode?: string;
  resetCodeExpiration?: Date;
  resetAttempts?: number;
}

const userSchema = new Schema<UserRecord>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 40 },
    lastName: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "author"], default: "author", required: true },
    bio: { type: String, default: "", trim: true, maxlength: 280 },
    avatar: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    isBlocked: { type: Boolean, default: false },
    resetCode: { type: String, select: false },
    resetCodeExpiration: { type: Date, select: false },
    resetAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

export const User = model<UserRecord>("User", userSchema);
