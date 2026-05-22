import { ragGraph } from "../graph/graph.js";
import type { MatchedProduct } from "../graph/state.js";

export interface ChatResponse {
  answer?: string;
  context?: string;
  products?: MatchedProduct[];
}

export const chatService = {
  async ask(question: string): Promise<ChatResponse> {
    const result = await ragGraph.invoke({ question });

    return {
      ...(result.answer !== undefined && { answer: result.answer }),
      ...(result.context !== undefined && { context: result.context }),
      ...(result.matchedProducts?.length
        ? { products: result.matchedProducts }
        : {}),
    };
  },
};
