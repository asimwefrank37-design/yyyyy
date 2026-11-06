import { Router } from "express";
import { blockUser, listReports, listUsers, resolveReport, unblockUser } from "../controller/admin.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const adminRouter = Router();

// Every route here needs an admin token.
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/reports", listReports);
adminRouter.patch("/reports/:id/resolve", resolveReport);

adminRouter.get("/users", listUsers);
adminRouter.patch("/users/:id/block", blockUser);
adminRouter.patch("/users/:id/unblock", unblockUser);

export default adminRouter;
