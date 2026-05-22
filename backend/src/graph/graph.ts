import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ragNode } from "./nodes/rag.js";
import { answerNode } from "./nodes/answer.js";
import { classifyNode, selectGraphNode } from "./nodes/classify.js";
import { contextualizeNode } from "./nodes/contextualize.js";
import {
  isCheapestProductQuery,
  isExtraProductsComplaint,
  isProductNamesOnlyQuery,
  isSpecificProductQuery,
} from "./intent.js";
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
  isPopularProductQuery: Annotation<boolean | undefined>(),
  popularProductOffset: Annotation<number | undefined>(),
  suppressProductCards: Annotation<boolean | undefined>(),
  isAssistantIdentityQuery: Annotation<boolean | undefined>(),
  isBroadDocumentQuery: Annotation<boolean | undefined>(),
  isSingleProductQuery: Annotation<boolean | undefined>(),
  useDocumentForProduct: Annotation<boolean | undefined>(),
  isCategoryAnalysisQuery: Annotation<boolean | undefined>(),
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

  if (state.isPopularProductQuery) {
    const offset = state.popularProductOffset ?? 0;
    const { product, total, hasMore } =
      await productService.getPopularProductAtOffset(offset);

    if (!product) {
      return {
        context:
          offset === 0
            ? "No popular products found in the catalog."
            : `No more popular products to show (${total} in rotation).`,
        matchedProducts: [],
      };
    }

    const matchedProducts = [toMatchedProduct(product)];
    const context = `Showing popular pick ${offset + 1} of ${total}${hasMore ? " (more available)" : " (last in list)"}.
Name: ${product.name}
Price: ${product.price}
Image: ${product.image}
Description: ${product.description}`;

    return {
      context,
      matchedProducts: state.suppressProductCards ? [] : matchedProducts,
    };
  }

  const singleProduct =
    state.isSingleProductQuery ||
    isSpecificProductQuery(question) ||
    isExtraProductsComplaint(question);

  if (singleProduct) {
    const named =
      (await productService.findProductByQuestion(question)) ??
      (isExtraProductsComplaint(question)
        ? await productService.findProductFromHistory(state.history ?? [])
        : null);
    if (named) {
      const matchedProducts = [toMatchedProduct(named)];
      const context = `Name: ${named.name}
Price: ${named.price}
Image: ${named.image}
Description: ${named.description}`;
      return { context, matchedProducts };
    }
  }

  const namesOnly =
    state.suppressProductCards ||
    isProductNamesOnlyQuery(question);
  const searchLimit = singleProduct ? 1 : namesOnly ? 3 : 8;
  const products = await vectorService.searchProducts(question, searchLimit);

  if (!products.length) {
    return {
      context: "No matching products found in the catalog.",
      matchedProducts: [],
    };
  }

  const picked = singleProduct ? products.slice(0, 1) : products;
  const matchedProducts: MatchedProduct[] = picked.map((p) => ({
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

  return {
    context,
    matchedProducts: namesOnly ? [] : matchedProducts,
  };
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
  if (state.isAssistantIdentityQuery) {
    return {
      answer: `I'm the virtual AI assistant for this shop system — I don't have a personal hometown or address. I help you browse products and answer questions from uploaded shop documents. If you meant the store itself, TechZone Electronics is in Karachi, Pakistan. What would you like to know?`,
    };
  }

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
      content: `You are the dedicated AI assistant for this shop and document intelligence system.

Your job is to help users with:
- Shop products stored in the database
- Products extracted from uploaded documents
- General queries about product availability, details, and usage

Context:
${capabilityText}

Core Rules:
1. Identity:
   - Always introduce yourself as the official assistant of this shop system.
   - Never say you are a generic AI or ChatGPT.

2. Response Style:
   - Keep answers short, clear, and practical.
   - Match the user's language exactly:
     - If the user writes in English → reply in English
     - If the language is unclear (example: "hi", "hello") → default to English
   - Be conversational but professional.

3. Data Accuracy (VERY IMPORTANT):
   - Only use information that exists in:
     a) product database
     b) uploaded documents
     c) current conversation context
   - Do NOT guess, assume, or invent:
     - prices
     - stock
     - product specs
     - document content

4. Missing Information Handling:
   - If data is not available, respond like:
     "Mujhe is product ka data is waqt available nahi hai. Aap specific query karein ya product name confirm karein."

5. Product Queries:
   - If user asks about a product, try to:
     - match it with stored products
     - or ask clarifying questions if multiple matches exist

6. Document Queries:
   - If user asks something from documents:
     - Only answer if document content is available in context
     - Otherwise ask user to refine or specify document/source

7. Behavior Constraints:
   - Never fabricate inventory, pricing, or document content
   - Never assume missing database values
   - Always prefer asking clarifying questions over guessing

8. Fallback Behavior:
   - If query is unclear, respond:
     "Aap thora specific bata dein, main aapki help karta hoon."

9. Tone:
   - Friendly, helpful, and system-focused (not generic assistant tone)`,
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
