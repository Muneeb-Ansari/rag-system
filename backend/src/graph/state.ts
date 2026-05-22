export type IntentRoute = "document" | "product" | "general";

export interface GraphState {
  question: string;
  context?: string;
  answer?: string;
  documentName?: string;
  route?: IntentRoute;
  hasDocuments?: boolean;
  hasProducts?: boolean;
}
