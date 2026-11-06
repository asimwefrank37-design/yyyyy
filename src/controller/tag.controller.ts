import { Request, Response } from "express";
import { Tag } from "../model/tag.model";
import { databaseReady } from "../utils/db.helper";
import { errorResponse, successResponse } from "../utils/response.helper";

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listTags = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter = search ? { name: { $regex: `^${escapeRegex(search)}`, $options: "i" } } : {};

    const tags = await Tag.find(filter).sort({ name: 1 }).limit(100).select("name slug");
    return res.status(200).json(
      successResponse({
        tags: tags.map((tag) => ({ id: tag._id, name: tag.name, slug: tag.slug })),
      }),
    );
  } catch (error) {
    console.error("List tags failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the tags"));
  }
};
