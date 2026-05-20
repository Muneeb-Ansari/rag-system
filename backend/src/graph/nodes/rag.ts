import { documentService } from "../../services/document.service.js";
import { vectorService } from "../../services/vector.service.js";
import type { GraphState } from "../state.js";

const MAX_DISTANCE = 0.75;

export async function ragNode(
  state: GraphState,
): Promise<Pick<GraphState, "context">> {

  const hasDocuments = await documentService.hasChunks();

  if (!hasDocuments) {
    return { context: "No relevant context found in uploaded documents." };
  }

  const matches = await vectorService.searchSimilar(state.question);
  // const relevant = matches.filter(
  //   (row) => row.distanceExpr <= MAX_DISTANCE
  // );
  const relevant = matches
    .sort((a, b) => a.distanceExpr - b.distanceExpr)
    .slice(0, 5);

  const context =
    relevant.length > 0
      ? relevant.map((row) => row.content).join("\n\n---\n\n")
      : "No relevant context found in uploaded documents.";

  return { context };
}