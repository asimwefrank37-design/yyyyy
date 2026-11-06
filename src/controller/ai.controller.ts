import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { DEV_USER_ID, devSessionEnabled } from "../config/devFlags";
import { Tag } from "../model/tag.model";
import { ensureDevAccount } from "../services/devAccount.service";
import { AiInputError, AiUnavailableError, assertConfigured, mockAiEnabled } from "../services/llm.service";
import {
  assertDraft,
  assertParagraph,
  improveParagraph,
  suggestTags,
  suggestTitles,
  writeSummary,
} from "../services/ai.service";
import { AiLimitError, consumeAiRequest, getAiUsage } from "../services/aiLimit.service";
import { errorResponse, successResponse } from "../utils/response.helper";

const readText = (value: unknown) => (typeof value === "string" ? value : "");

const readTags = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
};

const sendFailure = (res: Response, error: unknown) => {
  if (error instanceof AiInputError) {
    return res.status(400).json(errorResponse(error.message));
  }
  if (error instanceof AiLimitError) {
    return res.status(429).json(errorResponse(error.message));
  }
  if (error instanceof AiUnavailableError) {
    console.error("AI request failed:", error.message);
    return res.status(503).json(errorResponse(error.message));
  }
  console.error("AI request failed:", error instanceof Error ? error.message : error);
  return res.status(503).json(
    errorResponse("The assistant is unavailable right now. Keep writing and try again."),
  );
};

const storedTags = async () => {
  if (mongoose.connection.readyState !== 1) return [];
  const tags = await Tag.find().select("name").limit(200);
  return tags.map((tag) => tag.name);
};

export const devSession = async (req: Request, res: Response) => {
  if (!devSessionEnabled()) {
    return res.status(404).json(errorResponse("Not found"));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json(errorResponse("The server is missing JWT_SECRET"));
  }

  try {
    // With a database, sign in as a real dev account so posts can be saved.
    // Without one, fall back to an account-less token that only reaches the AI routes.
    const userId =
      mongoose.connection.readyState === 1 ? String((await ensureDevAccount())._id) : DEV_USER_ID;
    const user = { userId, role: "author" as const };
    const token = jwt.sign(user, secret, { expiresIn: "12h" });
    return res.json(successResponse({ token, user }));
  } catch (error) {
    console.error("Dev session failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not start the dev session"));
  }
};

export const usage = async (req: Request, res: Response) => {
  const snapshot = await getAiUsage(req.user?.userId ?? "");
  return res.json(successResponse(snapshot));
};

export const titles = async (req: Request, res: Response) => {
  try {
    const draft = readText(req.body?.draft);
    const title = readText(req.body?.title);
    assertDraft(draft);
    assertConfigured();
    const usageSnapshot = await consumeAiRequest(req.user?.userId ?? "");
    const suggestions = await suggestTitles(draft, title);
    return res.json(
      successResponse({
        titles: suggestions,
        usage: usageSnapshot,
        mock: mockAiEnabled(),
      }),
    );
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const summary = async (req: Request, res: Response) => {
  try {
    const draft = readText(req.body?.draft);
    const title = readText(req.body?.title);
    assertDraft(draft);
    assertConfigured();
    const usageSnapshot = await consumeAiRequest(req.user?.userId ?? "");
    const suggestion = await writeSummary(draft, title);
    return res.json(
      successResponse({
        summary: suggestion,
        usage: usageSnapshot,
        mock: mockAiEnabled(),
      }),
    );
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const tags = async (req: Request, res: Response) => {
  try {
    const draft = readText(req.body?.draft);
    const title = readText(req.body?.title);
    assertDraft(draft);
    assertConfigured();
    const existing = [...readTags(req.body?.existingTags), ...(await storedTags())];
    const usageSnapshot = await consumeAiRequest(req.user?.userId ?? "");
    const suggestions = await suggestTags(draft, title, existing);
    return res.json(
      successResponse({
        tags: suggestions,
        usage: usageSnapshot,
        mock: mockAiEnabled(),
      }),
    );
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const improve = async (req: Request, res: Response) => {
  try {
    const paragraph = readText(req.body?.paragraph);
    assertParagraph(paragraph);
    assertConfigured();
    const usageSnapshot = await consumeAiRequest(req.user?.userId ?? "");
    const improved = await improveParagraph(paragraph);
    return res.json(
      successResponse({
        improved,
        usage: usageSnapshot,
        mock: mockAiEnabled(),
      }),
    );
  } catch (error) {
    return sendFailure(res, error);
  }
};
