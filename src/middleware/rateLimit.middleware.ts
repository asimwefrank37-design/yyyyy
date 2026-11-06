import { NextFunction, Request, Response } from "express";
import { errorResponse } from "../utils/response.helper";

interface Window {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
  message: string;
}

const windows = new Map<string, Window>();

setInterval(() => {
  const now = Date.now();
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}, 60 * 1000).unref();

export const rateLimit = ({ name, windowMs, max, message }: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${req.ip ?? "unknown"}`;
    const now = Date.now();
    const current = windows.get(key);

    if (!current || current.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json(errorResponse(message));
      return;
    }

    current.count += 1;
    next();
  };
};
