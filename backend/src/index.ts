import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiRouter } from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({
  origin: "http://localhost:3001",
  credentials: true,
}));
app.use(express.json());
app.use("/api", apiRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  },
);

app.listen(PORT, () => {
  console.log(`RAG server running on port ${PORT}`);
});
