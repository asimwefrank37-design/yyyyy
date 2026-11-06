import { Request } from "express";

export const queryText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// ?page=2&limit=12, clamped to sensible values.
export const paging = (req: Request, { defaultLimit = 12, maxLimit = 50 } = {}) => {
  const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(req.query.limit)) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

export const pageInfo = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});
