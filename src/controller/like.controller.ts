import { Request, Response } from "express";
import { Like } from "../model/like.model";
import { Post } from "../model/post.model";
import { databaseReady, isDuplicateKey } from "../utils/db.helper";
import { findPublishedPost } from "../utils/post.helper";
import { errorResponse, successResponse } from "../utils/response.helper";

const currentCount = async (postId: unknown) => {
  const post = await Post.findById(postId).select("likeCount");
  return post?.likeCount ?? 0;
};

// Like the post, or remove the like if it is already there.
export const toggleLike = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await findPublishedPost(String(req.params.id));
    if (!post) {
      return res.status(404).json(errorResponse("Post not found"));
    }

    const filter = { post: post._id, user: req.user!.userId };

    const removed = await Like.findOneAndDelete(filter);
    if (removed) {
      await Post.updateOne({ _id: post._id, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } });
      return res.status(200).json(successResponse({ liked: false, likeCount: await currentCount(post._id) }));
    }

    try {
      await Like.create(filter);
      await Post.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } });
    } catch (error) {
      // A second tap arrived at the same moment and already saved the like.
      if (!isDuplicateKey(error)) throw error;
    }

    return res.status(200).json(successResponse({ liked: true, likeCount: await currentCount(post._id) }));
  } catch (error) {
    console.error("Like failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not update the like"));
  }
};

// Whether the logged-in user has liked the post, for the heart on the post page.
export const getLike = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await findPublishedPost(String(req.params.id));
    if (!post) {
      return res.status(404).json(errorResponse("Post not found"));
    }

    const liked = Boolean(await Like.exists({ post: post._id, user: req.user!.userId }));
    return res.status(200).json(successResponse({ liked, likeCount: post.likeCount }));
  } catch (error) {
    console.error("Load like failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the like"));
  }
};
