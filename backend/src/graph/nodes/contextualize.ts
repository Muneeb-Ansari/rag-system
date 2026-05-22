import { ChatOpenAI } from "@langchain/openai";
import {
  formatHistoryForPrompt,
  isFollowUpQuestion,
  isProductCountQuery,
} from "../intent.js";
import type { GraphState } from "../state.js";

const contextualizer = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

export async function contextualizeNode(
  state: GraphState,
): Promise<
  Pick<GraphState, "standaloneQuestion" | "isProductCountQuery">
> {
  let standaloneQuestion = state.question;
  const history = state.history ?? [];

  if (history.length > 0 && isFollowUpQuestion(state.question)) {
    const historyText = formatHistoryForPrompt(history);
    const response = await contextualizer.invoke([
      {
        role: "system",
        content: `You rewrite the user's latest message into one clear standalone question using the conversation when needed.
Rules:
- Output ONLY the rewritten question (no quotes, no preamble).
- Preserve the user's intent (e.g. cheapest price, how to book, product count).
- If the latest message is already clear on its own, return it unchanged.`,
      },
      {
        role: "user",
        content: `Conversation:\n${historyText}\n\nLatest message: ${state.question}`,
      },
    ]);
    const rewritten =
      typeof response.content === "string"
        ? response.content.trim()
        : state.question;
    if (rewritten) standaloneQuestion = rewritten;
  }

  const isCount =
    isProductCountQuery(state.question) ||
    isProductCountQuery(standaloneQuestion);

  return { standaloneQuestion, isProductCountQuery: isCount };
}
