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
  /\b(owner|proprietor|founder|manager|location|address|where\s+(is|are)|shop\s+(location|address|info|details)|store\s+(location|address)|contact|phone|email|hours|open(ing)?\s+hours|about\s+(the\s+)?(shop|store|business)|situated|located|directions|map)\b/i;

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

  if (hasDocuments && shouldRouteToDocument(state.question)) {
    return { route: "document" };
  }

  const { route } = await classifier.invoke([
    {
      role: "system",
      content: `You route user questions for a shop + document assistant system.

Available knowledge:
- Uploaded document: "${docLabel}" (PDF content is searchable)
- Product catalog: stored products with name, price, description

Pick exactly one route:
- "document": Question is about the uploaded PDF — its content, policies, summaries, clauses, facts inside the file, or "${docLabel}" itself. Also use "document" for shop/business facts that are NOT product listings: owner name, proprietor, store address, location, contact info, opening hours, about the shop, directions.
- "product": Question is about shop inventory — product names, prices, comparisons, recommendations, stock-style questions, or what to buy.
- "general": Greetings, identity of this chat assistant ("who are you"), small talk, or questions that do not need document or product lookup.

Important: "who is the shop owner" or "where is the shop" are "document", NOT "product" or "general".
When both sources exist, choose the source that best answers the question. Do not guess.`,
    },
    { role: "user", content: state.question },
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
