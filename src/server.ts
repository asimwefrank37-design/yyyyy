import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { connectDB } from "./config/db";
import adminRouter from "./router/admin.router";
import aiRouter from "./router/ai.router";
import authRouter from "./router/auth.router";
import categoryRouter from "./router/category.router";
import commentRouter from "./router/comment.router";
import postRouter from "./router/post.router";
import reportRouter from "./router/report.router";
import tagRouter from "./router/tag.router";
import userRouter from "./router/user.router";
import { errorResponse } from "./utils/response.helper";

dotenv.config();

const app = express();
const port = process.env.PORT || 1000;

app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/ai", aiRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/tags", tagRouter);
app.use("/api/posts", postRouter);
app.use("/api/comments", commentRouter);
app.use("/api/reports", reportRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_req, res) => {
  res.status(404).json(errorResponse("Route not found"));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    res.status(400).json(errorResponse("Request body must be valid JSON"));
    return;
  }
  console.error("Unhandled error:", error instanceof Error ? error.message : error);
  res.status(500).json(errorResponse("Something went wrong on the server"));
});

const clientPath = path.resolve(__dirname, "../../reactapp/dist");
const clientIndex = path.join(clientPath, "index.html");

if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(clientIndex);
  });
}

connectDB();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
