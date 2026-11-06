import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { Category } from "../model/category.model";
import { Comment } from "../model/comment.model";
import { Like } from "../model/like.model";
import { Post } from "../model/post.model";
import { User } from "../model/user.model";
import { SAMPLE_AUTHORS, SAMPLE_CATEGORIES, SAMPLE_PASSWORD, SAMPLE_POSTS } from "../data/sample-content";
import { slugify, uniqueSlug } from "../utils/slug.helper";
import { resolveTags } from "./tag.service";

const log = (text: string) => console.log(text);

// Adds the four categories. Ones that already exist are left alone.
export const seedCategories = async () => {
  for (const item of SAMPLE_CATEGORIES) {
    const slug = slugify(item.name);
    const result = await Category.updateOne(
      { slug },
      { $setOnInsert: { name: item.name, slug, description: item.description } },
      { upsert: true },
    );
    log(result.upsertedCount ? `Added category ${item.name}` : `Category ${item.name} already exists`);
  }
};

// Adds sample authors, posts, likes, and comments. Running it again skips what is already there.
export const seedSamplePosts = async () => {
  await seedCategories();

  const password = await bcrypt.hash(SAMPLE_PASSWORD, 10);
  const authorIds = new Map<string, Types.ObjectId>();
  for (const author of SAMPLE_AUTHORS) {
    const result = await User.findOneAndUpdate(
      { email: author.email },
      {
        $setOnInsert: {
          firstName: author.firstName,
          lastName: author.lastName,
          email: author.email,
          password,
          role: "author",
          bio: author.bio,
          avatar: { url: "/logo.svg", publicId: "local:logo" },
        },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: true },
    );
    authorIds.set(author.key, result.value!._id);
    log(result.lastErrorObject?.updatedExisting ? `Author ${author.email} already exists` : `Added author ${author.email}`);
  }

  for (const sample of SAMPLE_POSTS) {
    const authorId = authorIds.get(sample.author);
    if (await Post.exists({ author: authorId, title: sample.title })) {
      log(`Post "${sample.title}" already exists`);
      continue;
    }

    const category = await Category.findOne({ slug: slugify(sample.category) }).select("_id");
    const published = sample.publishedAt !== null;

    const post = await Post.create({
      author: authorId,
      title: sample.title,
      slug: await uniqueSlug(Post, sample.title),
      body: sample.body,
      excerpt: sample.excerpt,
      category: category?._id ?? null,
      tags: await resolveTags(sample.tags, 5),
      coverImage: sample.image ? { url: sample.image, publicId: `local:${sample.image}` } : undefined,
      status: published ? "published" : "draft",
      publishedAt: published ? new Date(sample.publishedAt!) : null,
    });

    if (published) {
      for (const key of sample.likedBy) {
        await Like.create({ post: post._id, user: authorIds.get(key) });
      }
      for (const comment of sample.comments) {
        await Comment.create({ post: post._id, author: authorIds.get(comment.author), body: comment.body });
      }
      post.likeCount = sample.likedBy.length;
      post.commentCount = sample.comments.length;
      await post.save();
    }

    log(`Added ${published ? "post" : "draft"} "${sample.title}"`);
  }
};
