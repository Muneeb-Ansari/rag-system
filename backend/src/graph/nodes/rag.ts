import { vectorService } from "../../services/vector.service.js";
import type { GraphState } from "../state.js";

const MAX_DISTANCE = 0.45;

export async function ragNode(
  state: GraphState,
): Promise<Pick<GraphState, "context">> {
  const matches = await vectorService.searchSimilar(state.question);

  const relevant = matches.filter((row) => Number(row.distance) <= MAX_DISTANCE);

  const context =
    relevant.length > 0
      ? relevant.map((row) => row.content).join("\n\n---\n\n")
      : "No relevant context found in uploaded documents.";

  return { context };
}
