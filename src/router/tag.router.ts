import { Router } from "express";
import { listTags } from "../controller/tag.controller";

const tagRouter = Router();

tagRouter.get("/", listTags);

export default tagRouter;
