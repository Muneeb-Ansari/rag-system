export type IntentRoute = "document" | "product" | "general";

export interface MatchedProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string;
}

export interface GraphState {
  question: string;
  context?: string;
  answer?: string;
  documentName?: string;
  route?: IntentRoute;
  hasDocuments?: boolean;
  hasProducts?: boolean;
  matchedProducts?: MatchedProduct[];
}