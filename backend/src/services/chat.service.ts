import { ragGraph } from "../graph/graph.js";
import type { ChatHistoryMessage, MatchedProduct } from "../graph/state.js";

export interface ChatResponse {
  answer?: string;
  context?: string;
  products?: MatchedProduct[];
}

export const chatService = {
  async ask(
    question: string,
    history: ChatHistoryMessage[] = [],
  ): Promise<ChatResponse> {
    const result = await ragGraph.invoke({ question, history });

    const response: ChatResponse = {};
    if (result.answer !== undefined) response.answer = result.answer;
    if (result.context !== undefined) response.context = result.context;
    if (
      result.matchedProducts?.length &&
      !result.isProductCountQuery &&
      !result.suppressProductCards
    ) {
      response.products = result.isSingleProductQuery
        ? result.matchedProducts.slice(0, 1)
        : result.matchedProducts;
    }
    return response;
  },
};
