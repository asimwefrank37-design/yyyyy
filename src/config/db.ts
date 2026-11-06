import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI is not set. AI usage limits stay in memory for this run.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.warn("MongoDB connection failed. AI usage limits stay in memory for this run.");
    console.warn(error instanceof Error ? error.message : error);
  }
};
