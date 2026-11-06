import { Schema, model } from "mongoose";
import { slugify } from "../utils/slug.helper";

export interface TagRecord {
  name: string;
  slug: string;
}

const tagSchema = new Schema<TagRecord>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // sparse so tags saved before slug existed don't break the index.
    slug: { type: String, required: true, unique: true, sparse: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

tagSchema.pre("validate", function () {
  if (!this.slug && this.name) this.slug = slugify(this.name);
});

export const Tag = model<TagRecord>("Tag", tagSchema);
