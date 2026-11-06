import { Schema, Types, model } from "mongoose";

export const COMMENT_MAX = 1000;

export interface CommentRecord {
  post: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
}

const commentSchema = new Schema<CommentRecord>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: COMMENT_MAX },
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, createdAt: 1 });

export const Comment = model<CommentRecord>("Comment", commentSchema);
