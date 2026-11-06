import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from "../controller/category.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const categoryRouter = Router();

categoryRouter.get("/", listCategories);
categoryRouter.get("/:slug", getCategory);
categoryRouter.post("/", authenticate, requireAdmin, createCategory);
categoryRouter.patch("/:id", authenticate, requireAdmin, updateCategory);
categoryRouter.delete("/:id", authenticate, requireAdmin, deleteCategory);

export default categoryRouter;
