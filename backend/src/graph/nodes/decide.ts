import { documentService } from "../../services/document.service.js";
import { llm } from "../../services/llm.js";
import type { GraphState } from "../state.js";

export async function decideNode(
  state: GraphState,
): Promise<Pick<GraphState, "route">> {
  const hasDocuments = await documentService.hasChunks();
  console.log("Decide node - has documents:", hasDocuments);

  if (!hasDocuments) {
    return { route: "llm" };
  }

  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are a routing assistant. Reply with exactly one word: rag or llm. Use rag when the user question should be answered using uploaded documents. Use llm for general knowledge or chit-chat.",
    },
    { role: "user", content: state.question },
  ]);

  const decision = response.content.toString().toLowerCase();
  const route = decision.includes("rag") ? "rag" : "llm";

  return { route };
}
