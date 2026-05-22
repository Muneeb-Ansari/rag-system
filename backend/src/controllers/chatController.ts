import type { NextFunction, Request, Response } from "express";
import { chatService } from "../services/chat.service.js";
import type { ChatHistoryMessage } from "../graph/state.js";

function parseHistory(raw: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is ChatHistoryMessage =>
        typeof item === "object" &&
        item !== null &&
        (item as ChatHistoryMessage).role !== undefined &&
        typeof (item as ChatHistoryMessage).content === "string" &&
        ((item as ChatHistoryMessage).role === "user" ||
          (item as ChatHistoryMessage).role === "assistant"),
    )
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-20);
}

export async function chat(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question, history } = req.body as {
      question?: unknown;
      history?: unknown;
    };

    if (!question || typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "A non-empty question string is required" });
      return;
    }

    const parsedHistory = parseHistory(history);

    const result = await chatService.ask(question.trim(), parsedHistory);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
