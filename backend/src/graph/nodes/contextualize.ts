import { ChatOpenAI } from "@langchain/openai";
import {
  computePopularProductOffset,
  formatHistoryForPrompt,
  isAssistantIdentityQuery,
  isBroadDocumentQuery,
  isCategoryAnalysisQuery,
  isDocumentProductQuery,
  shouldPreferDocumentForProduct,
  isExtraProductsComplaint,
  isFollowUpQuestion,
  isSpecificProductQuery,
  isNextPopularProductQuery,
  isPopularProductQuery,
  isProductCountQuery,
  isProductNamesOnlyQuery,
  isSinglePopularProductRequest,
} from "../intent.js";
import { documentService } from "../../services/document.service.js";
import { productService } from "../../services/product.service.js";
import type { GraphState } from "../state.js";

const contextualizer = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

export async function contextualizeNode(
  state: GraphState,
): Promise<
  Pick<
    GraphState,
    | "standaloneQuestion"
    | "isProductCountQuery"
    | "isPopularProductQuery"
    | "popularProductOffset"
    | "suppressProductCards"
    | "isAssistantIdentityQuery"
    | "isBroadDocumentQuery"
    | "isSingleProductQuery"
    | "useDocumentForProduct"
    | "isCategoryAnalysisQuery"
  >
> {
  let standaloneQuestion = state.question;
  const history = state.history ?? [];

  if (history.length > 0 && isFollowUpQuestion(state.question)) {
    const historyText = formatHistoryForPrompt(history);
    const response = await contextualizer.invoke([
      {
        role: "system",
        content: `Rewrite the user’s latest input into a self-contained question that can be understood without any prior conversation context.
Rules:
Output ONLY the rewritten question.
Do NOT include quotes, labels, or explanations.
Preserve the original intent exactly (e.g., price, quantity, booking, comparison, etc.).
Use conversation context only when necessary to make the question complete.
If the latest message is already clear and standalone, return it unchanged.
Ensure the rewritten question is natural, concise, and unambiguous.
 Style Guidelines:
Make it sound like a clean search query or assistant-ready question.
Avoid unnecessary words or repetition.
Keep meaning fully intact while improving clarity.`,
      },
      {
        role: "user",
        content: `Conversation:\n${historyText}\n\nLatest message: ${state.question}`,
      },
    ]);
    const rewritten =
      typeof response.content === "string"
        ? response.content.trim()
        : state.question;
    if (rewritten) standaloneQuestion = rewritten;
  }

  const broadDocument =
    isBroadDocumentQuery(state.question) ||
    isBroadDocumentQuery(standaloneQuestion) ||
    isDocumentProductQuery(state.question) ||
    isDocumentProductQuery(standaloneQuestion);

  const isCount =
    !broadDocument &&
    (isProductCountQuery(state.question) ||
      isProductCountQuery(standaloneQuestion));

  const assistantIdentity =
    isAssistantIdentityQuery(state.question) ||
    isAssistantIdentityQuery(standaloneQuestion);

  const isPopular =
    !assistantIdentity &&
    (isPopularProductQuery(state.question) ||
      isPopularProductQuery(standaloneQuestion) ||
      isNextPopularProductQuery(state.question) ||
      isNextPopularProductQuery(standaloneQuestion) ||
      isSinglePopularProductRequest(state.question) ||
      isSinglePopularProductRequest(standaloneQuestion));

  const popularProductOffset = isPopular
    ? computePopularProductOffset(history, state.question)
    : 0;

  const namesOnly =
    isProductNamesOnlyQuery(state.question) ||
    isProductNamesOnlyQuery(standaloneQuestion);

  const singlePopular =
    isSinglePopularProductRequest(state.question) ||
    isSinglePopularProductRequest(standaloneQuestion);

  let suppressCards =
    namesOnly || (isPopular && /\b(names?|name\s+only)\b/i.test(standaloneQuestion));

  const categoryQuery =
    isCategoryAnalysisQuery(standaloneQuestion) ||
    isCategoryAnalysisQuery(state.question);

  const hasDocuments = state.hasDocuments ?? false;
  let useDocumentForProduct = false;

  if (
    hasDocuments &&
    (categoryQuery ||
      isSpecificProductQuery(standaloneQuestion) ||
      isSpecificProductQuery(state.question))
  ) {
    const db = await productService.findProductByQuestion(standaloneQuestion);
    const doc = await documentService.findProductInDocument(standaloneQuestion);
    useDocumentForProduct =
      categoryQuery ||
      shouldPreferDocumentForProduct(
        standaloneQuestion,
        db?.name ?? null,
        doc?.productName ?? null,
      ) ||
      (!!doc && !db);
  }

  if (useDocumentForProduct) suppressCards = true;

  const singleProduct =
    !broadDocument &&
    !useDocumentForProduct &&
    (isSpecificProductQuery(standaloneQuestion) ||
      isSpecificProductQuery(state.question) ||
      isExtraProductsComplaint(state.question) ||
      (await productService.findProductByQuestion(standaloneQuestion)) !== null);

  return {
    standaloneQuestion,
    isProductCountQuery: isCount,
    isPopularProductQuery: isPopular || singlePopular,
    popularProductOffset,
    suppressProductCards: suppressCards,
    isAssistantIdentityQuery: assistantIdentity,
    isBroadDocumentQuery: broadDocument,
    isSingleProductQuery: singleProduct,
    useDocumentForProduct,
    isCategoryAnalysisQuery: categoryQuery,
  };
}
