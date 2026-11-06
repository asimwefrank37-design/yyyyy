import { Request, Response } from "express";
import mongoose from "mongoose";
import { Category } from "../model/category.model";
import { Post } from "../model/post.model";
import { databaseReady, isDuplicateKey } from "../utils/db.helper";
import { errorResponse, successResponse } from "../utils/response.helper";
import { uniqueSlug } from "../utils/slug.helper";

const NAME_COLLATION = { locale: "en", strength: 2 };

const readText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// undefined means the field was not sent, so it stays unchanged.
const readOptional = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);

const publicCategory = (
  category: {
    _id: unknown;
    name: string;
    slug: string;
    description?: string;
  },
  postCount?: number,
) => ({
  id: category._id,
  name: category.name,
  slug: category.slug,
  description: category.description ?? "",
  ...(postCount !== undefined ? { postCount } : {}),
});

// Published posts per category id, for "24 stories" and the admin table.
const publishedCounts = async () => {
  const rows = await Post.aggregate<{ _id: unknown; count: number }>([
    { $match: { status: "published", category: { $ne: null } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const nameTaken = async (name: string, excludeId?: string) => {
  const filter: Record<string, unknown> = { name };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await Category.findOne(filter).collation(NAME_COLLATION).select("_id"));
};

const validate = (name: string | undefined, description: string | undefined) => {
  if (name !== undefined && !name) return "Category name is required";
  if ((name?.length ?? 0) > 40) return "Category name must be 40 characters or fewer";
  if ((description?.length ?? 0) > 200) return "Description must be 200 characters or fewer";
  return "";
};

export const listCategories = async (_req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const [categories, counts] = await Promise.all([
      Category.find().sort({ name: 1 }).collation(NAME_COLLATION),
      publishedCounts(),
    ]);
    return res.status(200).json(
      successResponse({
        categories: categories.map((category) =>
          publicCategory(category, counts.get(String(category._id)) ?? 0),
        ),
      }),
    );
  } catch (error) {
    console.error("List categories failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the categories"));
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const category = await Category.findOne({ slug: String(req.params.slug).toLowerCase() });
    if (!category) {
      return res.status(404).json(errorResponse("Category not found"));
    }

    const postCount = await Post.countDocuments({ category: category._id, status: "published" });
    return res.status(200).json(successResponse({ category: publicCategory(category, postCount) }));
  } catch (error) {
    console.error("Load category failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the category"));
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const name = readText(req.body?.name);
    const description = readText(req.body?.description);

    const problem = validate(name, description);
    if (problem) {
      return res.status(400).json(errorResponse(problem));
    }
    if (await nameTaken(name)) {
      return res.status(409).json(errorResponse("A category with this name already exists"));
    }

    const slug = await uniqueSlug(Category, name);
    const category = await Category.create({ name, slug, description });

    return res.status(201).json(successResponse({ category: publicCategory(category) }, "Category created"));
  } catch (error) {
    if (isDuplicateKey(error)) {
      return res.status(409).json(errorResponse("A category with this name already exists"));
    }
    console.error("Create category failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not create the category"));
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json(errorResponse("Category not found"));
    }

    const name = readOptional(req.body?.name);
    const description = readOptional(req.body?.description);

    if (name === undefined && description === undefined) {
      return res.status(400).json(errorResponse("Send name or description to update"));
    }
    const problem = validate(name, description);
    if (problem) {
      return res.status(400).json(errorResponse(problem));
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json(errorResponse("Category not found"));
    }

    if (name !== undefined && name !== category.name) {
      if (await nameTaken(name, id)) {
        return res.status(409).json(errorResponse("A category with this name already exists"));
      }
      category.name = name;
      // Renaming changes the URL too, so /categories/food becomes /categories/<new-name>.
      category.slug = await uniqueSlug(Category, name, category._id);
    }
    if (description !== undefined) category.description = description;

    await category.save();

    return res.status(200).json(successResponse({ category: publicCategory(category) }, "Category updated"));
  } catch (error) {
    if (isDuplicateKey(error)) {
      return res.status(409).json(errorResponse("A category with this name already exists"));
    }
    console.error("Update category failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not update the category"));
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json(errorResponse("Category not found"));
    }

    // Drafts count too, so no post is left pointing at a missing category.
    const inUse = await Post.countDocuments({ category: id });
    if (inUse > 0) {
      return res
        .status(409)
        .json(errorResponse(`${inUse} post(s) still use this category. Move them to another category first.`));
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json(errorResponse("Category not found"));
    }

    return res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Delete category failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not delete the category"));
  }
};
