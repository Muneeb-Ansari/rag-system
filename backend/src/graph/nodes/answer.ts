import { llm } from "../../services/llm.js";
import { documentService } from "../../services/document.service.js";
import { productService } from "../../services/product.service.js";
import {
  formatHistoryForPrompt,
  isProductNamesOnlyQuery,
} from "../intent.js";
import type { GraphState } from "../state.js";

function documentSystemPrompt(
  documentName?: string,
  broad?: boolean,
): string {
  const label = documentName ?? "the uploaded document";
  const listRule = broad
    ? `- When Context includes a product catalog or product index, list ALL products from Context with name, price (PKR), and category when available. Do not omit products that appear in Context.
- Include shop details from Context too: location, owner, contact, hours, delivery, payment, return policy when the user asks for shop summary or full information.`
    : "";
  return `You are the dedicated assistant for "${label}".
Answer ONLY using the Context below from the uploaded document.
Rules:
- Do not invent facts, numbers, or clauses not in the Context.
- If Context does not contain the answer, say you could not find it in "${label}".
- Be clear and concise. Use bullet points when listing multiple items.
- Use conversation history when the question refers to earlier messages.
${listRule}
- Tone: friendly and professional. Match the user's language (English).`;
}

function productSystemPrompt(): string {
  return `You are the shop assistant for this store's product catalog.
Answer ONLY using the product information in Context (names, prices, descriptions).
Rules:
- Do not invent products, prices, or stock levels not in the Context.
- If no matching products are in Context, say so honestly and offer to help with another question.
- Compare products when the user asks; suggest based on their need when appropriate.
- If the user only asks how many products exist, reply with ONLY the count (one short sentence). Do not list product names or prices.
- If the user asks for popular/bestselling products, mention ONLY products described as popular or most sold in Context — never list unrelated catalog items.
- If the user asks for product names only, reply with a short list of names (no prices or long descriptions unless asked).
- If the user asks about ONE specific product, describe ONLY that product from Context — do not mention other products.
- Use the conversation history when the user refers to something said earlier (e.g. "cheap price" after discussing products).
- Tone: friendly shopkeeper. English as the user uses.`;
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

  if (state.route === "product" && state.isProductCountQuery) {
    const dbTotal = await productService.getProductCount();
    if (state.hasDocuments) {
      const pdfTotal = await documentService.getPdfProductCount();
      return {
        answer: `The shop catalog has ${dbTotal} products. The uploaded document lists ${pdfTotal} products.`,
      };
    }
    return {
      answer: `There are ${dbTotal} products in the catalog.`,
    };
  }

  if (state.route === "document" && state.isCategoryAnalysisQuery && state.context) {
    return {
      answer: `Based on the uploaded document: ${state.context.replace(/^Category counts from uploaded document:\n/, "").split("\n").pop() ?? state.context}`,
    };
  }

  if (state.route === "document" && state.useDocumentForProduct && state.context) {
    const response = await llm.invoke([
      {
        role: "system",
        content: documentSystemPrompt(state.documentName, false),
      },
      {
        role: "user",
        content: `Context:\n${state.context}\n\nQuestion:\n${state.standaloneQuestion ?? state.question}`,
      },
    ]);
    return {
      answer:
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content),
    };
  }

  const question = state.standaloneQuestion ?? state.question;

  if (state.route === "product" && state.isPopularProductQuery) {
    const offset = state.popularProductOffset ?? 0;
    const { product, total, hasMore } =
      await productService.getPopularProductAtOffset(offset);

    if (!product) {
      return {
        answer:
          offset === 0
            ? "No popular products found in the catalog."
            : "You've seen all the popular picks I can suggest. Say a product name if you want details on something specific.",
      };
    }

    if (state.suppressProductCards || isProductNamesOnlyQuery(question)) {
      return {
        answer: `Popular product (${offset + 1} of ${total}): ${product.name}`,
      };
    }

    const intro =
      offset === 0
        ? "Our top popular product is"
        : hasMore
          ? "Another popular pick is"
          : "Next popular product is";

    return {
      answer: `${intro} ${product.name}.`,
    };
  }

  const historyText =
    state.history && state.history.length > 0
      ? `\n\nConversation history:\n${formatHistoryForPrompt(state.history)}`
      : "";

  const systemPrompt =
    state.route === "product"
      ? productSystemPrompt()
      : documentSystemPrompt(
          state.documentName,
          state.isBroadDocumentQuery,
        );

  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Context:\n${state.context}\n\nQuestion:\n${state.standaloneQuestion ?? state.question}${historyText}`,
    },
  ]);

  return {
    answer:
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content),
  };
}
