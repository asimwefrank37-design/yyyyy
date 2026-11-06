import { Router } from "express";
import { createReport } from "../controller/report.controller";
import { authenticate, requireAccount } from "../middleware/auth.middleware";

const reportRouter = Router();

reportRouter.post("/", authenticate, requireAccount, createReport);

export default reportRouter;
