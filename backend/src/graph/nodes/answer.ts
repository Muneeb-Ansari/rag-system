import { llm } from "../../services/llm.js";
import type { GraphState } from "../state.js";

export async function answerNode(
  state: GraphState,
): Promise<Pick<GraphState, "answer">> {

  if (!state.context || state.context === "No relevant context found in uploaded documents.") {
    return {
      answer: "I could not find the answer to this question in the uploaded documents. Please upload a relevant document.",
    };
  }

  const response = await llm.invoke([
    {
      role: "system",
      content: `You are a document assistant.
Answer only and strictly from the provided context.
If the answer is not available in the context, say:
"I could not find the answer to this question in the uploaded documents."
Do not add anything from your own knowledge.
Do not use external knowledge.`
    },
    {
      role: "user",
      content: `Context:\n${state.context}\n\nQuestion:\n${state.question}`,
    },
  ]);

  return {
    answer:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content),
  };
}