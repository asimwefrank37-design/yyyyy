import { Router } from "express";
import { forgotPassword, login, me, resetPassword, signup } from "../controller/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { rateLimit } from "../middleware/rateLimit.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const signupLimit = rateLimit({
  name: "signup",
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many sign-up attempts. Try again in an hour.",
});
const loginLimit = rateLimit({
  name: "login",
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  message: "Too many login attempts. Try again in 15 minutes.",
});
const forgotLimit = rateLimit({
  name: "forgot-password",
  windowMs: FIFTEEN_MINUTES,
  max: 5,
  message: "Too many reset requests. Try again in 15 minutes.",
});
const resetLimit = rateLimit({
  name: "reset-password",
  windowMs: FIFTEEN_MINUTES,
  max: 10,
  message: "Too many reset attempts. Try again in 15 minutes.",
});

const authRouter = Router();

authRouter.post("/signup", signupLimit, uploadAvatar, signup);
authRouter.post("/login", loginLimit, login);
authRouter.post("/forgot-password", forgotLimit, forgotPassword);
authRouter.post("/reset-password", resetLimit, resetPassword);
authRouter.get("/me", authenticate, me);

export default authRouter;
