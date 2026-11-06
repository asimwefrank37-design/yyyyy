import { Response } from "express";
import mongoose from "mongoose";
import { errorResponse } from "./response.helper";

export const databaseReady = (res: Response) => {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json(errorResponse("Database is not connected. Set MONGO_URI and restart the API."));
  return false;
};

export const isDuplicateKey = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === 11000;
