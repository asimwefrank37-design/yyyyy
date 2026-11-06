import { Schema, model } from "mongoose";

export interface CategoryRecord {
  name: string;
  slug: string;
  description: string;
}

const categorySchema = new Schema<CategoryRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

// "Food" and "food" count as the same name.
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export const Category = model<CategoryRecord>("Category", categorySchema);
