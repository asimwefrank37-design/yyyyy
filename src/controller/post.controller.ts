import { Request, Response } from "express";
import mongoose, { HydratedDocument, Types } from "mongoose";
import { cloudinaryReady } from "../config/cloudinary";
import { Category } from "../model/category.model";
import { Post, POST_LIMITS, PostRecord } from "../model/post.model";
import { Tag } from "../model/tag.model";
import { deleteCover, uploadCover } from "../services/avatar.service";
import { removePost } from "../services/content.service";
import { resolveTags, TagInputError } from "../services/tag.service";
import { databaseReady } from "../utils/db.helper";
import { POST_POPULATE, PopulatedPost, publicPost } from "../utils/post.helper";
import { pageInfo, paging, queryText } from "../utils/query.helper";
import { errorResponse, successResponse } from "../utils/response.helper";
import { uniqueSlug } from "../utils/slug.helper";

type PostDoc = HydratedDocument<PostRecord>;

class PostInputError extends Error {}

const fail = (res: Response, label: string, error: unknown) => {
  if (error instanceof PostInputError || error instanceof TagInputError) {
    return res.status(400).json(errorResponse(error.message));
  }
  console.error(`${label} failed:`, error instanceof Error ? error.message : error);
  return res.status(500).json(errorResponse(`Could not ${label.toLowerCase()}`));
};

const sendPost = async (res: Response, status: number, post: PostDoc, message?: string) => {
  await post.populate(POST_POPULATE);
  const data = { post: publicPost(post.toObject() as unknown as PopulatedPost, { withBody: true }) };
  return res.status(status).json(message ? successResponse(data, message) : successResponse(data));
};

// Loads a post the logged-in user wrote. Sends 404 or 403 and returns null otherwise.
const loadOwnPost = async (req: Request, res: Response, { allowAdmin = false } = {}) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    res.status(404).json(errorResponse("Post not found"));
    return null;
  }

  const post = await Post.findById(id);
  if (!post) {
    res.status(404).json(errorResponse("Post not found"));
    return null;
  }

  const isOwner = String(post.author) === req.user?.userId;
  const isAdmin = allowAdmin && req.user?.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json(errorResponse("You can only change your own posts"));
    return null;
  }

  return post;
};

// Reads the editable fields from the request body. A field that was not sent stays undefined.
const readPostInput = async (body: Record<string, unknown> | undefined) => {
  const input: {
    title?: string;
    excerpt?: string;
    body?: string;
    category?: Types.ObjectId | null;
    tags?: Types.ObjectId[];
  } = {};

  if (body?.title !== undefined) {
    if (typeof body.title !== "string") throw new PostInputError("Title must be text");
    input.title = body.title.trim();
    if (!input.title) throw new PostInputError("Title is required");
    if (input.title.length > POST_LIMITS.title) {
      throw new PostInputError(`Title must be ${POST_LIMITS.title} characters or fewer`);
    }
  }

  if (body?.excerpt !== undefined) {
    if (typeof body.excerpt !== "string") throw new PostInputError("Summary must be text");
    input.excerpt = body.excerpt.trim();
    if (input.excerpt.length > POST_LIMITS.excerpt) {
      throw new PostInputError(`Summary must be ${POST_LIMITS.excerpt} characters or fewer`);
    }
  }

  if (body?.body !== undefined) {
    if (typeof body.body !== "string") throw new PostInputError("Body must be text");
    input.body = body.body;
    if (input.body.length > POST_LIMITS.body) {
      throw new PostInputError(`Body must be ${POST_LIMITS.body} characters or fewer`);
    }
  }

  if (body?.category !== undefined) {
    if (body.category === null || body.category === "") {
      input.category = null;
    } else {
      const id = String(body.category);
      const exists = mongoose.isValidObjectId(id) && (await Category.exists({ _id: id }));
      if (!exists) throw new PostInputError("Choose a category that exists");
      input.category = new Types.ObjectId(id);
    }
  }

  if (body?.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string")) {
      throw new PostInputError("Tags must be a list of names");
    }
    input.tags = await resolveTags(body.tags as string[], POST_LIMITS.tags);
  }

  return input;
};

const publishProblem = async (post: PostDoc) => {
  if (!post.title.trim()) return "Add a title before publishing";
  if (!post.body.trim()) return "Write the post before publishing";
  if (!post.category || !(await Category.exists({ _id: post.category }))) {
    return "Choose a category before publishing";
  }
  return "";
};

export const createPost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;
    const userId = req.user!.userId;

    const input = await readPostInput(req.body);
    if (!input.title) {
      return res.status(400).json(errorResponse("Title is required"));
    }

    const post = await Post.create({
      author: userId,
      title: input.title,
      slug: await uniqueSlug(Post, input.title),
      body: input.body ?? "",
      excerpt: input.excerpt ?? "",
      category: input.category ?? null,
      tags: input.tags ?? [],
      status: "draft",
    });

    return sendPost(res, 201, post, "Draft saved");
  } catch (error) {
    return fail(res, "Save the draft", error);
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    // Check ownership first so someone else's request cannot create tags.
    const post = await loadOwnPost(req, res);
    if (!post) return;

    const input = await readPostInput(req.body);
    if (Object.keys(input).length === 0) {
      return res.status(400).json(errorResponse("Send title, excerpt, body, category, or tags to update"));
    }

    if (input.title !== undefined && input.title !== post.title) {
      post.title = input.title;
      // Published links stay the same. A draft's slug follows its title.
      if (post.status === "draft") post.slug = await uniqueSlug(Post, input.title, post._id);
    }
    if (input.excerpt !== undefined) post.excerpt = input.excerpt;
    if (input.body !== undefined) post.body = input.body;
    if (input.category !== undefined) post.category = input.category;
    if (input.tags !== undefined) post.tags = input.tags;

    if (post.status === "published") {
      const problem = await publishProblem(post);
      if (problem) {
        return res.status(400).json(errorResponse(`${problem}. Unpublish it first to leave it unfinished.`));
      }
    }

    await post.save();
    return sendPost(res, 200, post, post.status === "draft" ? "Draft saved" : "Post updated");
  } catch (error) {
    return fail(res, "Update the post", error);
  }
};

export const publishPost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await loadOwnPost(req, res);
    if (!post) return;

    const problem = await publishProblem(post);
    if (problem) {
      return res.status(400).json(errorResponse(problem));
    }

    if (post.status !== "published") {
      post.status = "published";
      // Publishing again after unpublishing keeps the first date.
      post.publishedAt = post.publishedAt ?? new Date();
      await post.save();
    }

    return sendPost(res, 200, post, "Post published");
  } catch (error) {
    return fail(res, "Publish the post", error);
  }
};

export const unpublishPost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await loadOwnPost(req, res);
    if (!post) return;

    if (post.status !== "draft") {
      post.status = "draft";
      await post.save();
    }

    return sendPost(res, 200, post, "Post moved back to drafts");
  } catch (error) {
    return fail(res, "Unpublish the post", error);
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await loadOwnPost(req, res, { allowAdmin: true });
    if (!post) return;

    await removePost(post._id);

    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    return fail(res, "Delete the post", error);
  }
};

export const setPostCover = async (req: Request, res: Response) => {
  let uploadedId = "";

  try {
    if (!databaseReady(res)) return;

    if (!req.file) {
      return res.status(400).json(errorResponse("Choose an image in the cover field"));
    }
    if (!cloudinaryReady()) {
      return res.status(503).json(errorResponse("Image upload is not configured. Set the Cloudinary environment variables."));
    }

    const post = await loadOwnPost(req, res);
    if (!post) return;

    const oldCoverId = post.coverImage?.publicId;
    const cover = await uploadCover(req.file.buffer);
    uploadedId = cover.publicId;
    post.coverImage = cover;
    await post.save();

    if (oldCoverId) await deleteCover(oldCoverId);

    return sendPost(res, 200, post, "Cover image saved");
  } catch (error) {
    if (uploadedId) await deleteCover(uploadedId);
    return fail(res, "Save the cover image", error);
  }
};

export const listMyPosts = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;
    const filter: Record<string, unknown> = { author: req.user!.userId };
    const status = queryText(req.query.status);
    if (status === "draft" || status === "published") filter.status = status;

    const { page, limit, skip } = paging(req);
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POST_POPULATE)
        .lean<PopulatedPost[]>(),
      Post.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ posts: posts.map((post) => publicPost(post)), pagination: pageInfo(page, limit, total) }),
    );
  } catch (error) {
    return fail(res, "Load your posts", error);
  }
};

export const getMyPost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await loadOwnPost(req, res);
    if (!post) return;

    return sendPost(res, 200, post);
  } catch (error) {
    return fail(res, "Load the post", error);
  }
};

export const listPublishedPosts = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const { page, limit, skip } = paging(req);
    const empty = () =>
      res.status(200).json(successResponse({ posts: [], pagination: pageInfo(page, limit, 0) }));

    const filter: Record<string, unknown> = { status: "published" };

    const categorySlug = queryText(req.query.category).toLowerCase();
    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug }).select("_id");
      if (!category) return empty();
      filter.category = category._id;
    }

    const tagSlug = queryText(req.query.tag).toLowerCase();
    if (tagSlug) {
      const tag = await Tag.findOne({ slug: tagSlug }).select("_id");
      if (!tag) return empty();
      filter.tags = tag._id;
    }

    const author = queryText(req.query.author);
    if (author) {
      if (!mongoose.isValidObjectId(author)) return empty();
      filter.author = author;
    }

    const search = queryText(req.query.search);
    if (search) filter.$text = { $search: search };

    const direction = queryText(req.query.sort) === "oldest" ? 1 : -1;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: direction, _id: direction })
        .skip(skip)
        .limit(limit)
        .populate(POST_POPULATE)
        .lean<PopulatedPost[]>(),
      Post.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ posts: posts.map((post) => publicPost(post)), pagination: pageInfo(page, limit, total) }),
    );
  } catch (error) {
    return fail(res, "Load the posts", error);
  }
};

export const getPublishedPost = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const post = await Post.findOne({ slug: String(req.params.slug).toLowerCase(), status: "published" })
      .populate(POST_POPULATE)
      .lean<PopulatedPost>();
    if (!post) {
      return res.status(404).json(errorResponse("Post not found"));
    }

    return res.status(200).json(successResponse({ post: publicPost(post, { withBody: true }) }));
  } catch (error) {
    return fail(res, "Load the post", error);
  }
};
