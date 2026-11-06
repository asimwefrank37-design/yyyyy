import { Router } from "express";
import { addComment, listComments } from "../controller/comment.controller";
import { getLike, toggleLike } from "../controller/like.controller";
import {
  createPost,
  deletePost,
  getMyPost,
  getPublishedPost,
  listMyPosts,
  listPublishedPosts,
  publishPost,
  setPostCover,
  unpublishPost,
  updatePost,
} from "../controller/post.controller";
import { authenticate, requireAccount } from "../middleware/auth.middleware";
import { uploadCover } from "../middleware/upload.middleware";

const postRouter = Router();

// /mine routes come before /:slug so "mine" is not read as a slug.
postRouter.get("/mine", authenticate, requireAccount, listMyPosts);
postRouter.get("/mine/:id", authenticate, getMyPost);

postRouter.get("/", listPublishedPosts);
postRouter.get("/:slug", getPublishedPost);

postRouter.post("/", authenticate, requireAccount, createPost);
postRouter.patch("/:id", authenticate, updatePost);
postRouter.delete("/:id", authenticate, deletePost);
postRouter.post("/:id/publish", authenticate, publishPost);
postRouter.post("/:id/unpublish", authenticate, unpublishPost);
postRouter.post("/:id/cover", authenticate, uploadCover, setPostCover);

postRouter.get("/:id/like", authenticate, requireAccount, getLike);
postRouter.post("/:id/like", authenticate, requireAccount, toggleLike);

postRouter.get("/:id/comments", listComments);
postRouter.post("/:id/comments", authenticate, requireAccount, addComment);

export default postRouter;
