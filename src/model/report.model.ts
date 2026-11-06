import { Schema, Types, model } from "mongoose";

export const REPORT_REASONS = ["spam", "harassment", "misleading", "sexual_violent", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  misleading: "False or misleading",
  sexual_violent: "Sexual or violent content",
  other: "Other",
};

export type ReportTarget = "post" | "comment";
export type ReportAction = "content_removed" | "user_blocked";

export const REPORT_DETAILS_MAX = 500;

export interface ReportRecord {
  reporter: Types.ObjectId;
  targetType: ReportTarget;
  targetId: Types.ObjectId;
  // Copied when the report is made, so the admin still sees what was reported after it is removed.
  targetAuthor: Types.ObjectId;
  preview: string;
  postTitle: string;
  reason: ReportReason;
  details: string;
  status: "open" | "resolved";
  actions: ReportAction[];
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
}

const reportSchema = new Schema<ReportRecord>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["post", "comment"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetAuthor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    preview: { type: String, default: "" },
    postTitle: { type: String, default: "" },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: "", trim: true, maxlength: REPORT_DETAILS_MAX },
    status: { type: String, enum: ["open", "resolved"], default: "open", required: true },
    // Empty when an admin resolved it with no action.
    actions: { type: [{ type: String, enum: ["content_removed", "user_blocked"] }], default: [] },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, status: 1 });

export const Report = model<ReportRecord>("Report", reportSchema);
