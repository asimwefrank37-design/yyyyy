import { Schema, model } from "mongoose";

export interface AiUsageRecord {
  userId: string;
  date: string;
  count: number;
}

const aiUsageSchema = new Schema<AiUsageRecord>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

aiUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const AiUsage = model<AiUsageRecord>("AiUsage", aiUsageSchema);
