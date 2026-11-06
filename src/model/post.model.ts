import { Schema, Types, model } from "mongoose";

export type PostStatus = "draft" | "published";

export interface CoverImage {
  url: string;
  publicId: string;
}

export interface PostRecord {
  author: Types.ObjectId;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  coverImage?: CoverImage;
  category?: Types.ObjectId | null;
  tags: Types.ObjectId[];
  status: PostStatus;
  publishedAt?: Date | null;
  likeCount: number;
  commentCount: number;
}

export const POST_LIMITS = {
  title: 150,
  excerpt: 300,
  body: 50000,
  tags: 5,
};

const postSchema = new Schema<PostRecord>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: POST_LIMITS.title },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // A draft can be saved before the body is written. Publishing checks it.
    body: { type: String, default: "", maxlength: POST_LIMITS.body },
    excerpt: { type: String, default: "", trim: true, maxlength: POST_LIMITS.excerpt },
    coverImage: {
      type: new Schema<CoverImage>(
        { url: { type: String, required: true }, publicId: { type: String, required: true } },
        { _id: false },
      ),
      default: undefined,
    },
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    tags: {
      type: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
      default: [],
      validate: {
        validator: (value: Types.ObjectId[]) => value.length <= POST_LIMITS.tags,
        message: `A post can have at most ${POST_LIMITS.tags} tags`,
      },
    },
    status: { type: String, enum: ["draft", "published"], default: "draft", required: true },
    publishedAt: { type: Date, default: null },
    likeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ author: 1, status: 1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ tags: 1, status: 1 });
postSchema.index(
  { title: "text", excerpt: "text", body: "text" },
  { weights: { title: 5, excerpt: 2, body: 1 }, name: "post_search" },
);

export const Post = model<PostRecord>("Post", postSchema);
