import { Router } from "express";
import { getProfile, updateMe } from "../controller/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { uploadAvatar } from "../middleware/upload.middleware";

const userRouter = Router();

userRouter.patch("/me", authenticate, uploadAvatar, updateMe);
userRouter.get("/:id", getProfile);

export default userRouter;
