import crypto from "crypto";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import mongoose from "mongoose";
import { cloudinaryReady } from "../config/cloudinary";
import { devResetCodeEnabled } from "../config/devFlags";
import { User } from "../model/user.model";
import { deleteAvatar, uploadAvatar } from "../services/avatar.service";
import { emailReady, sendResetCodeEmail } from "../services/email.service";
import { errorResponse, successResponse } from "../utils/response.helper";
import { publicUser } from "../utils/user.helper";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_MESSAGE = "If that email is registered, a reset code has been sent.";
const MAX_RESET_ATTEMPTS = 5;

const hashCode = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

const sameHash = (a: string, b: string) => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const readText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const databaseReady = (res: Response) => {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json(errorResponse("Database is not connected. Set MONGO_URI and restart the API."));
  return false;
};

export const signup = async (req: Request, res: Response) => {
  let uploadedId = "";

  try {
    if (!databaseReady(res)) return;

    const firstName = readText(req.body?.firstName);
    const lastName = readText(req.body?.lastName);
    const email = readText(req.body?.email).toLowerCase();
    const password = readText(req.body?.password);
    const file = req.file;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json(errorResponse("First name, last name, email, and password are required"));
    }
    if (firstName.length > 40 || lastName.length > 40) {
      return res.status(400).json(errorResponse("First name and last name must be 40 characters or fewer"));
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json(errorResponse("Enter a valid email address"));
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json(errorResponse("Password must be 8 to 72 characters"));
    }
    if (!file) {
      return res.status(400).json(errorResponse("A profile image is required"));
    }
    if (!cloudinaryReady()) {
      return res.status(503).json(errorResponse("Image upload is not configured. Set the Cloudinary environment variables."));
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json(errorResponse("An account with this email already exists"));
    }

    const avatar = await uploadAvatar(file.buffer);
    uploadedId = avatar.publicId;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "author",
      avatar,
    });

    return res.status(201).json(successResponse({ user: publicUser(user) }, "Account created"));
  } catch (error) {
    if (uploadedId) {
      await deleteAvatar(uploadedId);
    }
    const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === 11000;
    if (duplicate) {
      return res.status(409).json(errorResponse("An account with this email already exists"));
    }
    console.error("Signup failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not create the account"));
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const email = readText(req.body?.email).toLowerCase();
    const password = readText(req.body?.password);

    if (!email || !password) {
      return res.status(400).json(errorResponse("Email and password are required"));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json(errorResponse("The server is missing JWT_SECRET"));
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json(errorResponse("Invalid email or password"));
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json(errorResponse("Invalid email or password"));
    }
    if (user.isBlocked) {
      return res.status(403).json(errorResponse("This account is blocked"));
    }

    const options: SignOptions = { expiresIn: "1d" };
    const token = jwt.sign({ userId: String(user._id), role: user.role }, secret, options);

    return res.status(200).json(successResponse({ token, user: publicUser(user) }, "Login successful"));
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not log in"));
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const userId = req.user?.userId ?? "";
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(404).json(errorResponse("This session has no account. Log in with a real user."));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse("User not found"));
    }

    return res.status(200).json(successResponse({ user: publicUser(user) }));
  } catch (error) {
    console.error("Load profile failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not load the profile"));
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const email = readText(req.body?.email).toLowerCase();
    if (!email) {
      return res.status(400).json(errorResponse("Email is required"));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ success: true, message: RESET_MESSAGE });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    user.resetCode = hashCode(code);
    user.resetCodeExpiration = new Date(Date.now() + 10 * 60 * 1000);
    user.resetAttempts = 0;
    await user.save();

    let emailed = false;
    if (emailReady()) {
      try {
        await sendResetCodeEmail(email, code);
        emailed = true;
      } catch (error) {
        console.error("Reset email failed:", error instanceof Error ? error.message : error);
      }
    } else {
      console.error("Reset email not sent: set SENDGRID_API_KEY and EMAIL_FROM.");
    }

    const showCode = devResetCodeEnabled();
    if (!emailed) {
      // The code was never delivered, so nobody can use it. The reply stays the same
      // as for an unknown email, so it never tells anyone which emails are registered.
      if (!showCode) {
        user.resetCode = undefined;
        user.resetCodeExpiration = undefined;
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: RESET_MESSAGE,
      ...(showCode ? { data: { resetCode: code } } : {}),
    });
  } catch (error) {
    console.error("Forgot password failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not start the password reset"));
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    if (!databaseReady(res)) return;

    const email = readText(req.body?.email).toLowerCase();
    const code = readText(req.body?.code);
    const newPassword = readText(req.body?.newPassword);

    if (!email || !code || !newPassword) {
      return res.status(400).json(errorResponse("Email, code, and new password are required"));
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json(errorResponse("Password must be 8 to 72 characters"));
    }

    const user = await User.findOne({ email }).select(
      "+password +resetCode +resetCodeExpiration +resetAttempts",
    );

    const expired = !user?.resetCodeExpiration || user.resetCodeExpiration.getTime() <= Date.now();
    if (!user || !user.resetCode || expired) {
      return res.status(400).json(errorResponse("Invalid or expired reset code"));
    }

    if (!sameHash(hashCode(code), user.resetCode)) {
      user.resetAttempts = (user.resetAttempts ?? 0) + 1;
      const usedUp = user.resetAttempts >= MAX_RESET_ATTEMPTS;
      if (usedUp) {
        user.resetCode = undefined;
        user.resetCodeExpiration = undefined;
        user.resetAttempts = 0;
      }
      await user.save();
      return res
        .status(400)
        .json(
          errorResponse(
            usedUp
              ? "Too many wrong codes. Request a new reset code."
              : "Invalid or expired reset code",
          ),
        );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetCodeExpiration = undefined;
    user.resetAttempts = 0;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password failed:", error instanceof Error ? error.message : error);
    return res.status(500).json(errorResponse("Could not reset the password"));
  }
};
