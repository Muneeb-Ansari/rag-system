export type Route = "rag" | "llm";

export interface GraphState {
  question: string;
  context?: string;
  answer?: string;
}
