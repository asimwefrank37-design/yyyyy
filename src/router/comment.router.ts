import { Router } from "express";
import { deleteComment } from "../controller/comment.controller";
import { authenticate } from "../middleware/auth.middleware";

const commentRouter = Router();

commentRouter.delete("/:id", authenticate, deleteComment);

export default commentRouter;
