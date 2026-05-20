import fs from "fs/promises";
import type { NextFunction, Request, Response } from "express";
import { documentService } from "../services/document.service.js";

export async function upload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;

  console.log("reaching", { file });

  try {
    if (!file) {
      res.status(400).json({ error: "A PDF file is required (field name: file)" });
      return;
    }

    const result = await documentService.ingestPdf(file.path, file.originalname);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  } finally {
    if (file?.path) {
      await fs.unlink(file.path).catch(() => undefined);
    }
  }
}
