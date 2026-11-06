import { Request, Response } from "express";
import mongoose from "mongoose";
import { Comment, COMMENT_MAX } from "../model/comment.model";
import { Post } from "../model/post.model";
import { removeComment } from "../services/content.service";
import { databaseReady } from "../utils/db.helper";
import { findPublishedPost } from "../utils/post.helper";
import { pageInfo, paging } from "../utils/query.helper";
import { errorResponse, successResponse } from "../utils/response.helper";

const AUTHOR_FIELDS = "firstName lastName avatar";

type PopulatedComment = {
  _id: unknown;
  body: string;
  author: { _id: unknown; firstName?: string; lastName?: string; avatar?: { url?: string } } | null;
  createdAt?: Date;
};

const publicComment = (comment: PopulatedComment) => ({
  id: comment._id,
  body: comment.body,
  author: comment.author
    ? {
        id: comment.author._id,
        firstName: comment.author.firstName ?? "",
        lastName: comment.author.lastName ?? "",
        avatar: comment.author.avatar?.url ?? "",
      }
    : null,
  createdAt: comment.createdAt,
});

export const listComments = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await findPublishedPost(String(req.params.id));
    if (!post) {
      return res.status(404).json(errorResponse("Post not found"));
    }

    // Oldest first, so the thread reads top to bottom.
    const { page, limit, skip } = paging(req, { defaultLimit: 20, maxLimit: 100 });
    const filter = { post: post._id };
    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .populate("author", AUTHOR_FIELDS)
        .lean<PopulatedComment[]>(),
      Comment.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ comments: comments.map(publicComment), pagination: pageInfo(page, limit, total) }),
    );
  } catch (error) {
    console.error("List comments failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the comments"));
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body) {
      return res.status(400).json(errorResponse("Write a comment first"));
    }
    if (body.length > COMMENT_MAX) {
      return res.status(400).json(errorResponse(`Comments must be ${COMMENT_MAX} characters or fewer`));
    }

    const post = await findPublishedPost(String(req.params.id));
    if (!post) {
      return res.status(404).json(errorResponse("Post not found"));
    }

    const comment = await Comment.create({ post: post._id, author: req.user!.userId, body });
    await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

    await comment.populate("author", AUTHOR_FIELDS);
    return res
      .status(201)
      .json(successResponse({ comment: publicComment(comment.toObject() as unknown as PopulatedComment) }, "Comment added"));
  } catch (error) {
    console.error("Add comment failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not add the comment"));
  }
};

// The comment's author or an admin can remove it.
export const deleteComment = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json(errorResponse("Comment not found"));
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json(errorResponse("Comment not found"));
    }

    const isAuthor = String(comment.author) === req.user?.userId;
    if (!isAuthor && req.user?.role !== "admin") {
      return res.status(403).json(errorResponse("You can only delete your own comments"));
    }

    await removeComment(comment._id);

    return res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.error("Delete comment failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not delete the comment"));
  }
};
