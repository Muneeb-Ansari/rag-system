import { llm } from "../../services/llm.js";
import type { GraphState } from "../state.js";

export async function answerNode(
  state: GraphState,
): Promise<Pick<GraphState, "answer">> {
  const contextBlock = state.context
    ? state.context
    : "No document context was retrieved.";

  const response = await llm.invoke([
    {
      role: "system",
      content:
        "Answer the user question clearly and concisely. Use the provided context when it is relevant. If context is missing or not relevant, answer from general knowledge and say when document context was not used.",
    },
    {
      role: "user",
      content: `Question:\n${state.question}\n\nContext:\n${contextBlock}`,
    },
  ]);

  return {
    answer:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content),
  };
}
