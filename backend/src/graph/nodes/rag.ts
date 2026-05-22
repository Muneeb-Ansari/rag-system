import { documentService } from "../../services/document.service.js";
import { vectorService } from "../../services/vector.service.js";
import type { GraphState } from "../state.js";
import { shouldRouteToDocument } from "./classify.js";
import { isBroadDocumentQuery } from "../intent.js";

const MAX_CHUNKS_FOR_FULL_DOC = 45;

function buildDocumentSearchQuery(question: string): string {
  if (isBroadDocumentQuery(question)) {
    return `${question}\nTechZone electronics shop products catalog prices PKR smartphones laptops owner delivery payment hours`;
  }
  if (
    /\b(products?|price|stock|iphone|samsung|laptop|headphone|console|camera)\b/i.test(
      question,
    )
  ) {
    return `${question}\nproduct catalog brand category price PKR stock description`;
  }
  if (shouldRouteToDocument(question)) {
    return `${question}\nshop business owner contact hours delivery payment return policy location Karachi`;
  }
  return question;
}

export async function ragNode(
  state: GraphState,
): Promise<Pick<GraphState, "context">> {

  const hasDocuments = await documentService.hasChunks();
  if (!hasDocuments) {
    return { context: "No relevant context found in uploaded documents." };
  }

  const question = state.standaloneQuestion ?? state.question;
  const broad = state.isBroadDocumentQuery ?? isBroadDocumentQuery(question);

  if (state.useDocumentForProduct) {
    if (state.isCategoryAnalysisQuery) {
      const summary = await documentService.getCategorySummaryFromDocument();
      if (summary) return { context: summary };
    }

    const docProduct = await documentService.findProductInDocument(question);
    if (docProduct) {
      return { context: docProduct.content };
    }
  }

  const chunkCount = await documentService.getChunkCount();
  if (broad && chunkCount > 0 && chunkCount <= MAX_CHUNKS_FOR_FULL_DOC) {
    const allChunks = await documentService.getAllChunkContents();
    return {
      context: allChunks.join("\n\n---\n\n"),
    };
  }

  const limit = broad ? 24 : 12;
  const searchQuery = buildDocumentSearchQuery(question);
  const matches = await vectorService.searchSimilar(searchQuery, limit);
  const relevant = matches.sort(
    (a, b) => Number(a.distanceExpr) - Number(b.distanceExpr),
  );

  const seen = new Set<string>();
  const unique = relevant.filter((row) => {
    if (seen.has(row.content)) return false;
    seen.add(row.content);
    return true;
  });

  const context =
    unique.length > 0
      ? unique.map((row) => row.content).join("\n\n---\n\n")
      : "No relevant context found in uploaded documents.";

  return { context };
}