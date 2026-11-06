import mongoose, { PopulateOptions } from "mongoose";
import { CoverImage, Post, PostStatus } from "../model/post.model";

// Likes and comments only work on published posts. Returns null for drafts and bad ids.
export const findPublishedPost = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Post.findOne({ _id: id, status: "published" }).select("_id author likeCount commentCount");
};

export const POST_POPULATE: PopulateOptions[] = [
  { path: "author", select: "firstName lastName avatar" },
  { path: "category", select: "name slug" },
  { path: "tags", select: "name slug" },
];

type AuthorRef = { _id: unknown; firstName?: string; lastName?: string; avatar?: { url?: string } };
type NamedRef = { _id: unknown; name?: string; slug?: string };

// A post after POST_POPULATE has run on it.
export interface PopulatedPost {
  _id: unknown;
  author: AuthorRef | null;
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  coverImage?: CoverImage | null;
  category?: NamedRef | null;
  tags?: NamedRef[];
  status: PostStatus;
  publishedAt?: Date | null;
  likeCount?: number;
  commentCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const WORDS_PER_MINUTE = 200;

export const readTime = (body: string) => {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const named = (ref: NamedRef) => ({ id: ref._id, name: ref.name ?? "", slug: ref.slug ?? "" });

// Cards and lists leave out the body. The post page and the editor ask for it.
export const publicPost = (post: PopulatedPost, { withBody = false } = {}) => ({
  id: post._id,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt ?? "",
  ...(withBody ? { body: post.body } : {}),
  coverImage: post.coverImage?.url ? post.coverImage : null,
  category: post.category ? named(post.category) : null,
  tags: (post.tags ?? []).map(named),
  author: post.author
    ? {
        id: post.author._id,
        firstName: post.author.firstName ?? "",
        lastName: post.author.lastName ?? "",
        avatar: post.author.avatar?.url ?? "",
      }
    : null,
  status: post.status,
  publishedAt: post.publishedAt ?? null,
  readTime: readTime(post.body ?? ""),
  likeCount: post.likeCount ?? 0,
  commentCount: post.commentCount ?? 0,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});
