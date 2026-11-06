import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { devSession, improve, summary, tags, titles, usage } from "../controller/ai.controller";

const router = Router();

router.post("/dev-session", devSession);
router.get("/usage", authenticate, usage);
router.post("/titles", authenticate, titles);
router.post("/summary", authenticate, summary);
router.post("/tags", authenticate, tags);
router.post("/improve", authenticate, improve);

export default router;
