import { Types } from "mongoose";
import { Comment } from "../model/comment.model";
import { Like } from "../model/like.model";
import { Post } from "../model/post.model";
import { deleteCover } from "./avatar.service";

// Deletes a post with its comments, likes, and cover image.
// Returns the ids of the comments that went with it, or null if the post was already gone.
export const removePost = async (postId: Types.ObjectId | string) => {
  const post = await Post.findById(postId).select("coverImage");
  if (!post) return null;

  const comments = await Comment.find({ post: post._id }).select("_id");
  await Promise.all([Comment.deleteMany({ post: post._id }), Like.deleteMany({ post: post._id })]);
  await post.deleteOne();
  if (post.coverImage?.publicId) await deleteCover(post.coverImage.publicId);

  return comments.map((comment) => comment._id);
};

// Deletes a comment and lowers its post's commentCount. Returns false if it was already gone.
export const removeComment = async (commentId: Types.ObjectId | string) => {
  const comment = await Comment.findByIdAndDelete(commentId);
  if (!comment) return false;
  await Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  return true;
};
