import { Router } from "express";
import { chat } from "../controllers/chatController.js";
import { getDocuments, upload, deleteDocument } from "../controllers/uploadController.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { pdfUpload } from "../middleware/uploadMiddleware.js";

export const apiRouter = Router();

apiRouter.post("/chat", chat);
apiRouter.post("/upload", pdfUpload.single("file"), upload);

apiRouter.get("/get-documents", getDocuments);

apiRouter.delete("/delete-document/:id", deleteDocument);

// Product routes
apiRouter.post("/products", createProduct);
apiRouter.get("/products", getProducts);
apiRouter.get("/products/:id", getProductById);
apiRouter.put("/products/:id", updateProduct);
apiRouter.delete("/products/:id", deleteProduct);