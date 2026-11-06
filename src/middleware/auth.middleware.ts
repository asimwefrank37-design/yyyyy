import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { DEV_USER_ID, devSessionEnabled } from "../config/devFlags";
import { User } from "../model/user.model";

export type AppRole = "admin" | "author";

export interface AuthUser {
  userId: string;
  role: AppRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const asRole = (value: unknown): AppRole => {
  if (value === "admin") return "admin";
  return "author";
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication format",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "The server is missing JWT_SECRET",
      });
    }

    const decoded = jwt.verify(token, secret) as {
      userId?: string;
      role?: unknown;
    };

    req.user = {
      userId: decoded.userId ?? "",
      role: asRole(decoded.role),
    };

    if (!req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // The dev session has no account, so there is nothing to look up.
    if (req.user.userId === DEV_USER_ID && devSessionEnabled()) {
      next();
      return;
    }

    // Without a database the AI routes still work, so skip the account check.
    if (mongoose.connection.readyState !== 1) {
      next();
      return;
    }

    if (!mongoose.isValidObjectId(req.user.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await User.findById(req.user.userId).select("role isBlocked");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "This account no longer exists",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "This account is blocked",
      });
    }

    // Use the stored role so a role change applies without logging in again.
    req.user.role = user.role;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only an admin can do this",
    });
  }

  next();
};

// For routes that save something under the user's id (posts, comments, likes).
// The dev session has no account, so it is turned away here.
export const requireAccount = (req: Request, res: Response, next: NextFunction) => {
  if (!mongoose.isValidObjectId(req.user?.userId ?? "")) {
    return res.status(403).json({
      success: false,
      message: "Log in with a real account to do this.",
    });
  }

  next();
};
