import { Types } from "mongoose";
import { Tag } from "../model/tag.model";
import { isDuplicateKey } from "../utils/db.helper";
import { slugify } from "../utils/slug.helper";

export const TAG_NAME_MAX = 30;

export class TagInputError extends Error {}

// Turns tag names into Tag ids, reusing an existing tag when the slug matches
// ("Daily life" and "daily-life" are the same tag) and creating the rest.
export const resolveTags = async (names: string[], max: number): Promise<Types.ObjectId[]> => {
  const wanted = new Map<string, string>();

  for (const raw of names) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) continue;
    if (name.length > TAG_NAME_MAX) {
      throw new TagInputError(`Tags must be ${TAG_NAME_MAX} characters or fewer`);
    }
    const slug = slugify(name);
    if (!slug) {
      throw new TagInputError(`"${name}" is not a usable tag`);
    }
    if (!wanted.has(slug)) wanted.set(slug, name);
  }

  if (wanted.size > max) {
    throw new TagInputError(`A post can have at most ${max} tags`);
  }

  const ids: Types.ObjectId[] = [];
  for (const [slug, name] of wanted) {
    let tag = await Tag.findOne({ slug });
    if (!tag) {
      try {
        tag = await Tag.create({ name, slug });
      } catch (error) {
        // Someone else created it at the same moment, or the name exists with another slug.
        if (!isDuplicateKey(error)) throw error;
        tag = await Tag.findOne({ $or: [{ slug }, { name }] });
        if (!tag) throw error;
      }
    }
    ids.push(tag._id);
  }

  return ids;
};
