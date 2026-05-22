import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ragNode } from "./nodes/rag.js";
import { answerNode } from "./nodes/answer.js";
import { classifyNode, selectGraphNode } from "./nodes/classify.js";
import { contextualizeNode } from "./nodes/contextualize.js";
import { isCheapestProductQuery } from "./intent.js";
import { documentService } from "../services/document.service.js";
import { productService } from "../services/product.service.js";
import type { GraphState, MatchedProduct } from "./state.js";
import { ChatOpenAI } from "@langchain/openai";
import { vectorService } from "../services/vector.service.js";

const GraphStatePage = Annotation.Root({
  question: Annotation<string>(),
  history: Annotation<GraphState["history"]>(),
  standaloneQuestion: Annotation<string | undefined>(),
  isProductCountQuery: Annotation<boolean | undefined>(),
  context: Annotation<string | undefined>(),
  answer: Annotation<string | undefined>(),
  documentName: Annotation<string | undefined>(),
  route: Annotation<GraphState["route"]>(),
  hasDocuments: Annotation<boolean | undefined>(),
  hasProducts: Annotation<boolean | undefined>(),
  matchedProducts: Annotation<MatchedProduct[] | undefined>(),
});

function toMatchedProduct(p: {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string | number;
}): MatchedProduct {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    image: p.image,
    price: String(p.price),
  };
}

async function productNode(
  state: GraphState,
): Promise<Pick<GraphState, "context" | "matchedProducts">> {
  const question = state.standaloneQuestion ?? state.question;

  if (state.isProductCountQuery) {
    const total = await productService.getProductCount();
    return {
      context: `Total products in catalog: ${total}`,
      matchedProducts: [],
    };
  }

  if (isCheapestProductQuery(question)) {
    const cheapest = await productService.getCheapestProduct();
    if (!cheapest) {
      return {
        context: "No matching products found in the catalog.",
        matchedProducts: [],
      };
    }
    const matchedProducts = [toMatchedProduct(cheapest)];
    const context = matchedProducts
      .map(
        (p) =>
          `Name: ${p.name}\nPrice: ${p.price}\nImage: ${p.image}\nDescription: ${p.description}`,
      )
      .join("\n\n---\n\n");
    return { context, matchedProducts };
  }

  const products = await vectorService.searchProducts(question);

  if (!products.length) {
    return {
      context: "No matching products found in the catalog.",
      matchedProducts: [],
    };
  }

  const matchedProducts: MatchedProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    image: p.image,
    price: String(p.price),
  }));

  const context = matchedProducts
    .map(
      (p) =>
        `Name: ${p.name}
Price: ${p.price}
Image: ${p.image}
Description: ${p.description}`,
    )
    .join("\n\n---\n\n");

  return { context, matchedProducts };
}

const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

function formatDocLabel(name?: string): string {
  if (!name) return "your uploaded document";
  return name.replace(/\.pdf$/i, "").trim();
}

const initNode = async (state: GraphState) => {
  const [docName, hasDocuments, hasProducts] = await Promise.all([
    documentService.getDocumentName(),
    documentService.hasChunks(),
    productService.hasProducts(),
  ]);

  return {
    documentName: docName ? formatDocLabel(docName) : undefined,
    hasDocuments,
    hasProducts,
  };
};

const chatNode = async (state: GraphState) => {
  const docLabel = state.documentName ?? "your uploaded document";
  const capabilities: string[] = [];
  if (state.hasDocuments) {
    capabilities.push(`answer questions about "${docLabel}" from the uploaded document`);
  }
  if (state.hasProducts) {
    capabilities.push("help with products in the shop catalog (prices, details, comparisons)");
  }
  const capabilityText =
    capabilities.length > 0
      ? `You can ${capabilities.join(" and ")}.`
      : "No documents or products are loaded yet — ask the user to upload a PDF or add products first.";

  const historyText =
    state.history && state.history.length > 0
      ? `\n\nConversation so far:\n${state.history
          .slice(-8)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}\n`
      : "";

  const response = await model.invoke([
    {
      role: "system",
      content: `You are the dedicated assistant for this shop + document system.
${capabilityText}

Rules:
- Introduce yourself as this system's assistant (not a generic ChatGPT).
- Keep replies short, friendly, and practical. Roman Urdu or English as the user uses.
- Use the conversation history when the user refers to earlier messages.
- For document or product facts you do not have in this turn, tell the user to ask a specific question so you can look them up.
- Do not invent inventory, prices, or document content.`,
    },
    {
      role: "user",
      content: `${historyText}Current question: ${state.question}`,
    },
  ]);

  const content = response.content;
  return {
    answer: typeof content === "string" ? content : JSON.stringify(content),
  };
};

export const ragGraph = new StateGraph(GraphStatePage)
  .addNode("init", initNode)
  .addNode("contextualize", contextualizeNode)
  .addNode("classify", classifyNode)
  .addNode("rag", ragNode)
  .addNode("generateAnswer", answerNode)
  .addNode("chatNode", chatNode)
  .addNode("product", productNode)
  .addEdge(START, "init")
  .addEdge("init", "contextualize")
  .addEdge("contextualize", "classify")
  .addConditionalEdges("classify", selectGraphNode, {
    chatNode: "chatNode",
    rag: "rag",
    product: "product",
  })
  .addEdge("rag", "generateAnswer")
  .addEdge("product", "generateAnswer")
  .addEdge("generateAnswer", END)
  .addEdge("chatNode", END)
  .compile();
