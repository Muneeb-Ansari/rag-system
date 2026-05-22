import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { GraphState, IntentRoute } from "../state.js";

const classifier = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
}).withStructuredOutput(
  z.object({
    route: z.enum(["document", "product", "general"]),
  }),
);

function formatDocLabel(name?: string): string {
  if (!name) return "uploaded document";
  return name.replace(/\.pdf$/i, "").trim();
}

/** Shop/business facts live in the PDF, not the product catalog. */
const DOCUMENT_ROUTE_PATTERN =
  /\b(owner|proprietor|founder|manager|shop\s+(location|address|info|details|summary)|store\s+(location|address)|where\s+(is|are)\s+(the\s+)?(shop|store|business|techzone)|business\s+(location|address)|contact|phone|email|hours|open(ing)?\s+hours|about\s+(the\s+)?(shop|store|business)|situated|located|directions|map|book(ing)?|how\s+to\s+(book|order)|order\s+process|reserve|purchase\s+process|delivery|return\s+policy|payment)\b/i;

function effectiveQuestion(state: GraphState): string {
  return state.standaloneQuestion ?? state.question;
}

export function shouldRouteToDocument(question: string): boolean {
  return DOCUMENT_ROUTE_PATTERN.test(question);
}

export async function classifyNode(
  state: GraphState,
): Promise<Pick<GraphState, "route">> {
  const docLabel = formatDocLabel(state.documentName);
  const hasDocuments = state.hasDocuments ?? false;
  const hasProducts = state.hasProducts ?? false;

  if (!hasDocuments && !hasProducts) {
    return { route: "general" };
  }

  if (hasDocuments && !hasProducts) {
    return { route: "document" };
  }

  if (!hasDocuments && hasProducts) {
    return { route: "product" };
  }

  const question = effectiveQuestion(state);

  if (state.isAssistantIdentityQuery) {
    return { route: "general" };
  }

  if (state.isBroadDocumentQuery || state.useDocumentForProduct) {
    return { route: "document" };
  }

  if (state.isCategoryAnalysisQuery && hasDocuments) {
    return { route: "document" };
  }

  if (state.isProductCountQuery || state.isPopularProductQuery) {
    return { route: "product" };
  }

  if (hasDocuments && shouldRouteToDocument(question)) {
    return { route: "document" };
  }

  const historyBlock =
    state.history && state.history.length > 0
      ? `\n\nRecent conversation:\n${state.history
          .slice(-6)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}`
      : "";

  const { route } = await classifier.invoke([
    {
      role: "system",
      content: `You are the intelligent routing engine for a Shop + Document Assistant System.

Your task is to analyze the user’s question and select the SINGLE best knowledge source needed to answer it.

━━━━━━━━━━━━━━━━━━
Available Knowledge Sources
━━━━━━━━━━━━━━━━━━

Uploaded Document
- File: "${docLabel}"
- PDF content is searchable
- Contains business/shop-related information, policies, clauses, details, and other document facts

Product Catalog
- Stored shop products
- Includes:
  - product names
  - prices
  - descriptions
  - inventory-style product data

━━━━━━━━━━━━━━━━━━
Available Routes
━━━━━━━━━━━━━━━━━━

Return EXACTLY ONE of these values:

- "document"
- "product"
- "general"

Do NOT return explanations, JSON, or extra text.

━━━━━━━━━━━━━━━━━━
Routing Logic
━━━━━━━━━━━━━━━━━━

Route: "document"
Use when the question is about:
- PDF content
- summaries
- clauses
- policies
- agreements
- rules
- facts inside the uploaded file
- "${docLabel}" itself

ALSO use "document" for NON-product shop/business information such as:
- shop owner name
- proprietor
- store address
- business location
- contact information
- opening hours
- about the business
- directions
- company/shop details

Examples:
- "Who is the shop owner?"
- "Where is the store located?"
- "Summarize the PDF"
- "What are the return policies?"
- "What is written in clause 4?"

━━━━━━━━━━━━━━━━━━

Route: "product"
Use when the question is about:
- products
- pricing
- product comparisons
- recommendations
- buying decisions
- available inventory
- product descriptions
- stock-style questions

Examples:
- "Do you have iPhone 15?"
- "Which laptop is best for gaming?"
- "Price of Nike shoes?"
- "Show me budget headphones"

━━━━━━━━━━━━━━━━━━

Route: "general"
Use when the message is:
- greetings
- small talk
- casual conversation
- assistant identity questions
- unrelated/general queries
- anything that does NOT require product or document lookup

Examples:
- "Hi"
- "How are you?"
- "Who are you?"
- "What can you do?"
- "Where are you from?" (about the AI assistant, not the shop)
- "I'm asking about you, not the shop"

━━━━━━━━━━━━━━━━━━
Important Rules
━━━━━━━━━━━━━━━━━━

- Always choose ONLY ONE best route.
- Do NOT guess missing information.
- If both sources could apply, choose the source MOST likely to contain the answer.
- "Who owns the shop?" and "Where is the shop?" MUST be routed to "document".
- Output ONLY:
  - document
  - product
  - general`,
    },
    { role: "user", content: `${question}${historyBlock}` },
  ]);

  const resolved = resolveRoute(route, hasDocuments, hasProducts);
  return { route: resolved };
}

function resolveRoute(
  route: IntentRoute,
  hasDocuments: boolean,
  hasProducts: boolean,
): IntentRoute {
  if (route === "document" && !hasDocuments) return "general";
  if (route === "product" && !hasProducts) return "general";
  return route;
}

export function selectGraphNode(state: {
  route?: GraphState["route"];
}): "rag" | "product" | "chatNode" {
  switch (state.route) {
    case "document":
      return "rag";
    case "product":
      return "product";
    default:
      return "chatNode";
  }
}
