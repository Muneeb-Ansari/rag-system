import type { NextFunction, Request, Response } from "express";
import { chatService } from "../services/chat.service.js";

export async function chat(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question } = req.body as { question?: unknown };

    if (!question || typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "A non-empty question string is required" });
      return;
    }

    const result = await chatService.ask(question.trim());
    res.json(result);
  } catch (error) {
    next(error);
  }
}
