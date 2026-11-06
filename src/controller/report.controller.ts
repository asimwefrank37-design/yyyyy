import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment } from "../model/comment.model";
import { Post } from "../model/post.model";
import { Report, REPORT_DETAILS_MAX, REPORT_REASONS, ReportReason } from "../model/report.model";
import { databaseReady } from "../utils/db.helper";
import { errorResponse, successResponse } from "../utils/response.helper";

const PREVIEW_MAX = 140;

const clip = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= PREVIEW_MAX ? clean : `${clean.slice(0, PREVIEW_MAX - 1).trim()}…`;
};

// What was reported, read at the time of the report. Null when it does not exist or cannot be reported.
const findTarget = async (targetType: string, targetId: string) => {
  if (targetType === "post") {
    const post = await Post.findOne({ _id: targetId, status: "published" }).select("author title");
    if (!post) return null;
    return { author: post.author, preview: clip(post.title), postTitle: post.title };
  }

  const comment = await Comment.findById(targetId).select("author body post");
  if (!comment) return null;
  const post = await Post.findById(comment.post).select("title status");
  if (!post || post.status !== "published") return null;
  return { author: comment.author, preview: clip(comment.body), postTitle: post.title };
};

export const createReport = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const targetType = typeof req.body?.targetType === "string" ? req.body.targetType : "";
    const targetId = typeof req.body?.targetId === "string" ? req.body.targetId.trim() : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
    const details = typeof req.body?.details === "string" ? req.body.details.trim() : "";

    if (targetType !== "post" && targetType !== "comment") {
      return res.status(400).json(errorResponse('targetType must be "post" or "comment"'));
    }
    if (!REPORT_REASONS.includes(reason as ReportReason)) {
      return res.status(400).json(errorResponse(`reason must be one of: ${REPORT_REASONS.join(", ")}`));
    }
    if (details.length > REPORT_DETAILS_MAX) {
      return res.status(400).json(errorResponse(`Details must be ${REPORT_DETAILS_MAX} characters or fewer`));
    }

    const target = mongoose.isValidObjectId(targetId) ? await findTarget(targetType, targetId) : null;
    if (!target) {
      return res.status(404).json(errorResponse(`That ${targetType} was not found`));
    }

    const reporter = req.user!.userId;
    if (String(target.author) === reporter) {
      return res.status(400).json(errorResponse(`You cannot report your own ${targetType}`));
    }

    const alreadyOpen = await Report.exists({ reporter, targetType, targetId, status: "open" });
    if (alreadyOpen) {
      return res.status(409).json(errorResponse(`You have already reported this ${targetType}. An admin will look at it.`));
    }

    const report = await Report.create({
      reporter,
      targetType,
      targetId,
      targetAuthor: target.author,
      preview: target.preview,
      postTitle: target.postTitle,
      reason,
      details,
    });

    return res
      .status(201)
      .json(successResponse({ report: { id: report._id, status: report.status } }, "Thanks. An admin will review your report."));
  } catch (error) {
    console.error("Create report failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not send the report"));
  }
};
