import { Schema, Types, model } from "mongoose";

export interface LikeRecord {
  post: Types.ObjectId;
  user: Types.ObjectId;
}

const likeSchema = new Schema<LikeRecord>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// One like per person per post.
likeSchema.index({ user: 1, post: 1 }, { unique: true });
likeSchema.index({ post: 1 });

export const Like = model<LikeRecord>("Like", likeSchema);
