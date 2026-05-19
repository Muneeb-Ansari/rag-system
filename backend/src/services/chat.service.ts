import { ragGraph } from "../graph/graph.js";

export interface ChatResponse {
  answer?: string;
  route?: string;
  context?: string;
}

export const chatService = {
  async ask(question: string): Promise<ChatResponse> {
    const result = await ragGraph.invoke({ question });

    return {
      ...(result.answer !== undefined && { answer: result.answer }),
      ...(result.route !== undefined && { route: result.route }),
      ...(result.context !== undefined && { context: result.context }),
    };
  },
};
