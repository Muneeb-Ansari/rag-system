export type IntentRoute = "document" | "product" | "general";

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MatchedProduct {
  id: string;
  name: string;
  description: string;
  image: string;
  price: string;
}

export interface GraphState {
  question: string;
  history?: ChatHistoryMessage[];
  standaloneQuestion?: string;
  isProductCountQuery?: boolean;
  isPopularProductQuery?: boolean;
  popularProductOffset?: number;
  suppressProductCards?: boolean;
  isAssistantIdentityQuery?: boolean;
  isBroadDocumentQuery?: boolean;
  isSingleProductQuery?: boolean;
  useDocumentForProduct?: boolean;
  isCategoryAnalysisQuery?: boolean;
  context?: string;
  answer?: string;
  documentName?: string;
  route?: IntentRoute;
  hasDocuments?: boolean;
  hasProducts?: boolean;
  matchedProducts?: MatchedProduct[];
}