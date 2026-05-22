import { llm } from "../../services/llm.js";
import type { GraphState } from "../state.js";

function documentSystemPrompt(documentName?: string): string {
  const label = documentName ?? "the uploaded document";
  return `You are the dedicated assistant for "${label}".
Answer ONLY using the Context below from the uploaded document.
Rules:
- Do not invent facts, numbers, or clauses not in the Context.
- If Context does not contain the answer, say you could not find it in "${label}".
- Be clear and concise. Use bullet points when listing multiple items.
- Tone: friendly and professional. Match the user's language (English or Roman Urdu).`;
}

function productSystemPrompt(): string {
  return `You are the shop assistant for this store's product catalog.
Answer ONLY using the product information in Context (names, prices, descriptions).
Rules:
- Do not invent products, prices, or stock levels not in the Context.
- If no matching products are in Context, say so honestly and offer to help with another question.
- Compare products when the user asks; suggest based on their need when appropriate.
- Tone: friendly shopkeeper. English or Roman Urdu as the user uses.`;
}

export async function answerNode(
  state: GraphState,
): Promise<Pick<GraphState, "answer">> {
  const emptyDocument =
    !state.context ||
    state.context === "No relevant context found in uploaded documents.";
  const emptyProduct =
    !state.context ||
    state.context === "No matching products found in the catalog.";

  if (state.route === "document" && emptyDocument) {
    return {
      answer: state.hasDocuments
        ? "I could not find the answer in the uploaded document."
        : "No document has been uploaded yet. Please upload a PDF first.",
    };
  }

  if (state.route === "product" && emptyProduct) {
    return {
      answer: state.hasProducts
        ? "I could not find any matching products in the catalog."
        : "No products have been added yet. Please add products to the catalog first.",
    };
  }

  const systemPrompt =
    state.route === "product"
      ? productSystemPrompt()
      : documentSystemPrompt(state.documentName);

  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
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
