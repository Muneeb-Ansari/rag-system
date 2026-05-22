import { documentService } from "../../services/document.service.js";
import { vectorService } from "../../services/vector.service.js";
import type { GraphState } from "../state.js";
import { shouldRouteToDocument } from "./classify.js";

function buildDocumentSearchQuery(question: string): string {
  if (!shouldRouteToDocument(question)) return question;
  return `${question}\nshop store owner proprietor location address contact details`;
}

export async function ragNode(
  state: GraphState,
): Promise<Pick<GraphState, "context">> {

  const hasDocuments = await documentService.hasChunks();
  if (!hasDocuments) {
    return { context: "No relevant context found in uploaded documents." };
  }

  const question = state.standaloneQuestion ?? state.question;
  const matches = await vectorService.searchSimilar(
    buildDocumentSearchQuery(question),
  );
  const relevant = matches.sort(
    (a, b) => Number(a.distanceExpr) - Number(b.distanceExpr),
  );

  const context =
    relevant.length > 0
      ? relevant.map((row) => row.content).join("\n\n---\n\n")
      : "No relevant context found in uploaded documents.";

  return { context };
}