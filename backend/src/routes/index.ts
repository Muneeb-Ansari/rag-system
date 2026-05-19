import { Router } from "express";
import { chat } from "../controllers/chatController.js";
import { upload } from "../controllers/uploadController.js";
import { pdfUpload } from "../middleware/uploadMiddleware.js";

export const apiRouter = Router();

apiRouter.post("/chat", chat);
apiRouter.post("/upload", pdfUpload.single("file"), upload);
