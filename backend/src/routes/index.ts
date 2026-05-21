import { Router } from "express";
import { chat } from "../controllers/chatController.js";
import { getDocuments, upload, deleteDocument } from "../controllers/uploadController.js";
import { pdfUpload } from "../middleware/uploadMiddleware.js";

export const apiRouter = Router();

apiRouter.post("/chat", chat);
apiRouter.post("/upload", pdfUpload.single("file"), upload);

apiRouter.get("/get-documents", getDocuments);

apiRouter.delete("/delete-document/:id", deleteDocument);