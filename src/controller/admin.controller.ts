import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { Post } from "../model/post.model";
import { Report, REPORT_REASON_LABELS, ReportAction, ReportReason, ReportTarget } from "../model/report.model";
import { User } from "../model/user.model";
import { removeComment, removePost } from "../services/content.service";
import { databaseReady } from "../utils/db.helper";
import { pageInfo, paging, queryText } from "../utils/query.helper";
import { errorResponse, successResponse } from "../utils/response.helper";

type PersonRef = { _id: unknown; firstName?: string; lastName?: string; email?: string; isBlocked?: boolean } | null;

type PopulatedReport = {
  _id: unknown;
  targetType: string;
  targetId: unknown;
  preview: string;
  postTitle: string;
  reason: ReportReason;
  details: string;
  status: string;
  actions: ReportAction[];
  reporter: PersonRef;
  targetAuthor: PersonRef;
  resolvedBy: PersonRef;
  resolvedAt?: Date | null;
  createdAt?: Date;
};

const person = (ref: PersonRef) =>
  ref
    ? {
        id: ref._id,
        name: `${ref.firstName ?? ""} ${ref.lastName ?? ""}`.trim(),
        ...(ref.isBlocked !== undefined ? { isBlocked: Boolean(ref.isBlocked) } : {}),
      }
    : null;

const publicReport = (report: PopulatedReport) => ({
  id: report._id,
  status: report.status,
  targetType: report.targetType,
  targetId: report.targetId,
  preview: report.preview,
  postTitle: report.postTitle,
  reason: report.reason,
  reasonLabel: REPORT_REASON_LABELS[report.reason] ?? report.reason,
  details: report.details,
  reporter: person(report.reporter),
  targetAuthor: person(report.targetAuthor),
  actions: report.actions,
  resolvedBy: person(report.resolvedBy),
  resolvedAt: report.resolvedAt ?? null,
  createdAt: report.createdAt,
});

const REPORT_POPULATE = [
  { path: "reporter", select: "firstName lastName" },
  { path: "targetAuthor", select: "firstName lastName isBlocked" },
  { path: "resolvedBy", select: "firstName lastName" },
];

const loadReport = async (id: string) =>
  Report.findById(id).populate(REPORT_POPULATE).lean<PopulatedReport>();

export const listReports = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const status = queryText(req.query.status) || "open";
    const filter: Record<string, unknown> = {};
    if (status === "open" || status === "resolved") filter.status = status;
    else if (status !== "all") {
      return res.status(400).json(errorResponse('status must be "open", "resolved", or "all"'));
    }

    const { page, limit, skip } = paging(req, { defaultLimit: 20, maxLimit: 100 });
    const [reports, total, open, resolved] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate(REPORT_POPULATE)
        .lean<PopulatedReport[]>(),
      Report.countDocuments(filter),
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "resolved" }),
    ]);

    return res.status(200).json(
      successResponse({
        reports: reports.map(publicReport),
        counts: { open, resolved, all: open + resolved },
        pagination: pageInfo(page, limit, total),
      }),
    );
  } catch (error) {
    console.error("List reports failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the reports"));
  }
};

// Closes a report. The admin can remove the reported content, block its author, both, or neither.
export const resolveReport = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json(errorResponse("Report not found"));
    }

    const removeContent = req.body?.removeContent === true;
    const blockUser = req.body?.blockUser === true;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json(errorResponse("Report not found"));
    }
    if (report.status === "resolved") {
      return res.status(409).json(errorResponse("This report is already resolved"));
    }

    if (blockUser) {
      const author = await User.findById(report.targetAuthor).select("role");
      if (author?.role === "admin") {
        return res.status(400).json(errorResponse("An admin cannot be blocked"));
      }
    }

    const actions: ReportAction[] = [];

    if (removeContent) {
      // Other open reports about the same content, or about comments that go with a removed post.
      const alsoGone: { targetType: ReportTarget; targetId: Types.ObjectId }[] = [
        { targetType: report.targetType, targetId: report.targetId },
      ];

      if (report.targetType === "post") {
        const commentIds = (await removePost(report.targetId)) ?? [];
        alsoGone.push(...commentIds.map((targetId) => ({ targetType: "comment" as const, targetId })));
      } else {
        await removeComment(report.targetId);
      }
      actions.push("content_removed");

      await Report.updateMany(
        { _id: { $ne: report._id }, status: "open", $or: alsoGone },
        { status: "resolved", actions: ["content_removed"], resolvedBy: req.user!.userId, resolvedAt: new Date() },
      );
    }

    if (blockUser) {
      await User.updateOne({ _id: report.targetAuthor }, { isBlocked: true });
      actions.push("user_blocked");
    }

    report.status = "resolved";
    report.actions = actions;
    report.resolvedBy = new Types.ObjectId(req.user!.userId);
    report.resolvedAt = new Date();
    await report.save();

    const message = actions.length === 0 ? "Report resolved with no action" : "Report resolved";
    return res.status(200).json(successResponse({ report: publicReport((await loadReport(id))!) }, message));
  } catch (error) {
    console.error("Resolve report failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not resolve the report"));
  }
};

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listUsers = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const filter: Record<string, unknown> = {};

    const status = queryText(req.query.status);
    if (status === "blocked") filter.isBlocked = true;
    else if (status === "active") filter.isBlocked = { $ne: true };

    const search = queryText(req.query.search);
    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }];
    }

    const { page, limit, skip } = paging(req, { defaultLimit: 20, maxLimit: 100 });
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .select("firstName lastName email role isBlocked createdAt"),
      User.countDocuments(filter),
    ]);

    const counts = await Post.aggregate<{ _id: unknown; count: number }>([
      { $match: { author: { $in: users.map((user) => user._id) }, status: "published" } },
      { $group: { _id: "$author", count: { $sum: 1 } } },
    ]);
    const postCounts = new Map(counts.map((row) => [String(row._id), row.count]));

    return res.status(200).json(
      successResponse({
        users: users.map((user) => ({
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isBlocked: Boolean(user.isBlocked),
          postCount: postCounts.get(String(user._id)) ?? 0,
          joinedAt: (user as unknown as { createdAt?: Date }).createdAt ?? null,
        })),
        pagination: pageInfo(page, limit, total),
      }),
    );
  } catch (error) {
    console.error("List users failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the users"));
  }
};

const setBlocked = (blocked: boolean) => async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json(errorResponse("User not found"));
    }

    const user = await User.findById(id).select("firstName lastName role isBlocked");
    if (!user) {
      return res.status(404).json(errorResponse("User not found"));
    }
    if (blocked && user.role === "admin") {
      return res.status(400).json(errorResponse("An admin cannot be blocked"));
    }

    user.isBlocked = blocked;
    await user.save();

    return res.status(200).json(
      successResponse(
        { user: { id: user._id, isBlocked: user.isBlocked } },
        `${user.firstName} ${user.lastName} is ${blocked ? "blocked" : "unblocked"}`,
      ),
    );
  } catch (error) {
    console.error(`${blocked ? "Block" : "Unblock"} user failed:`, error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse(`Could not ${blocked ? "block" : "unblock"} the user`));
  }
};

export const blockUser = setBlocked(true);

export const unblockUser = setBlocked(false);
