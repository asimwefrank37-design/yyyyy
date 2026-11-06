import { Model, Types } from "mongoose";

export const slugify = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

// Adds -2, -3, ... when another document already uses the slug.
export const uniqueSlug = async <T>(
  model: Model<T>,
  text: string,
  excludeId?: Types.ObjectId | string,
) => {
  const base = slugify(text) || "item";
  let candidate = base;

  for (let n = 2; ; n++) {
    const filter: Record<string, unknown> = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const taken = await model.exists(filter);
    if (!taken) return candidate;
    candidate = `${base}-${n}`;
  }
};
