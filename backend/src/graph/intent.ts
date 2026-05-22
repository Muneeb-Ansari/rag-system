export function isProductCountQuery(question: string): boolean {
  return (
    /\b(how many|number of|count of|total)\s+(products?|items?)\b/i.test(
      question,
    ) ||
    /\b(products?|items?|catalog)\b.*\b(count|total|how many)\b/i.test(
      question,
    ) ||
    /\bhow many products?\b/i.test(question)
  );
}

export function isCheapestProductQuery(question: string): boolean {
  return /\b(cheapest|lowest\s+price|cheap(est)?\s+price|most\s+affordable|budget|less\s+expensive)\b/i.test(
    question,
  );
}

const POPULAR_MARKETING_PATTERN =
  /\b(popular|most\s+sale|best\s*sell|top\s*sell|bestseller|best\s+selling|top\s+product)\b/i;

export function isPopularProductQuery(question: string): boolean {
  return (
    POPULAR_MARKETING_PATTERN.test(question) ||
    /\b(popular|best|top)\s+products?\b/i.test(question) ||
    isNextPopularProductQuery(question)
  );
}

/** User wants the next/other popular product after one was already shown. */
export function isNextPopularProductQuery(question: string): boolean {
  return (
    /\b(next|other|another|more|different)\b.*\b(popular|bestseller|one)\b/i.test(
      question,
    ) ||
    /\b(popular|one)\b.*\b(next|other|another|more)\b/i.test(question) ||
    /\bthe\s+other\s+popular\b/i.test(question)
  );
}

/** User is asking about the AI assistant, not the shop. */
export function isAssistantIdentityQuery(question: string): boolean {
  if (/\b(not|isn't)\s+(the\s+)?(shop|store|business)\b/i.test(question)) {
    return true;
  }
  if (
    /\b(who are you|what are you|about you|tell me about yourself|you are who)\b/i.test(
      question,
    )
  ) {
    return true;
  }
  if (
    /\bwhere\b.*\b(you|u)\b.*\b(from|located)\b/i.test(question) &&
    !/\b(shop|store|business|techzone)\b/i.test(question)
  ) {
    return true;
  }
  if (/\b(where you from|where are you from|asking about you)\b/i.test(question)) {
    return true;
  }
  return false;
}

/** 0-based index for which popular product to show (from prior user turns). */
export function computePopularProductOffset(
  history: { role: string; content: string }[],
  question: string,
): number {
  const triggers =
    /\b(popular|bestseller|next\s+popular|other\s+popular|another\s+popular|show\s+popular|the\s+other\s+popular)\b/i;
  let prior = 0;
  for (const msg of history) {
    if (msg.role === "user" && triggers.test(msg.content)) prior++;
  }
  if (triggers.test(question)) return prior;
  return 0;
}

/** User wants names/text only — no product cards in the chat UI. */
export function isProductNamesOnlyQuery(question: string): boolean {
  return (
    /\b(list|show|give|tell)\b.*\b(names?|name\s+only)\b/i.test(question) ||
    /\b(names?|name\s+only)\b.*\b(products?|popular)\b/i.test(question) ||
    /\bonly\s+(the\s+)?names?\b/i.test(question)
  );
}

/** User wants a single product (follow-up: "only popular", "just one", "why other products"). */
export function isSinglePopularProductRequest(question: string): boolean {
  return (
    /\b(only|just|single|one)\b.*\b(popular|product)/i.test(question) ||
    /\bwhy\b.*\b(other|more|rest)\b.*\bproduct/i.test(question) ||
    /\b(show|give|list)\b.*\bonly\b.*\bpopular/i.test(question) ||
    isExtraProductsComplaint(question)
  );
}

/** User asked about one named product (not a list/compare). */
export function isSpecificProductQuery(question: string): boolean {
  if (
    isBroadDocumentQuery(question) ||
    isProductCountQuery(question) ||
    isProductNamesOnlyQuery(question)
  ) {
    return false;
  }
  if (isPopularProductQuery(question) && !isNextPopularProductQuery(question)) {
    return false;
  }
  return (
    /\b(tell me about|about the|about|info on|information on|details on|what is|know about|price of|how much is|describe)\b/i.test(
      question,
    ) || /\b(iphone|ipad|samsung|galaxy|macbook|laptop|watch|headphone|cooler)\b/i.test(
      question,
    )
  );
}

export function isExtraProductsComplaint(question: string): boolean {
  return (
    /\bwhy\b.*\b(show|showing|other|extra|more)\b.*\bproduct/i.test(question) ||
    /\b(only|just)\s+ask(ed)?\b.*\b(one|about)\b/i.test(question) ||
    /\bone product\b.*\bwhy/i.test(question)
  );
}

export function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function extractSignificantNumbers(text: string): string[] {
  return text.match(/\b\d+[a-z]?\b/gi)?.map((n) => n.toLowerCase()) ?? [];
}

export function isCategoryAnalysisQuery(question: string): boolean {
  return (
    /\b(categor(y|ies))\b.*\b(most|many|largest|common|have)\b/i.test(question) ||
    /\bwhat\s+categor(y|ies)\b/i.test(question) ||
    /\bwhich\s+categor(y|ies)\b/i.test(question)
  );
}

/** Prefer PDF when the named model exists in the document but not the DB catalog. */
export function shouldPreferDocumentForProduct(
  question: string,
  dbName: string | null,
  docName: string | null,
): boolean {
  if (!docName) return false;
  if (!dbName) return true;

  const qNums = extractSignificantNumbers(question);
  if (qNums.length === 0) return false;

  const dbNums = extractSignificantNumbers(dbName);
  const docNums = extractSignificantNumbers(docName);
  const docMatches = qNums.every((n) => docNums.includes(n));
  const dbMatches = qNums.every((n) => dbNums.includes(n));
  return docMatches && !dbMatches;
}

export function productDescriptionMarksPopular(description: string): boolean {
  return POPULAR_MARKETING_PATTERN.test(description);
}

export function isFollowUpQuestion(question: string): boolean {
  const trimmed = question.trim();
  if (trimmed.length < 80) return true;
  return /\b(it|they|them|that|those|this|cheapest|cheap|expensive|one|ones|book|how|what about|which|also|only|just|other|why)\b/i.test(
    trimmed,
  );
}

/** Needs wide PDF context: product list, full shop summary, everything in document. */
export function isBroadDocumentQuery(question: string): boolean {
  return (
    /\b(all|full|complete|entire|whole|list)\b.*\b(products?|info|information|details|summary|data|content)\b/i.test(
      question,
    ) ||
    /\b(products?|catalog|items?)\b.*\b(pdf|document|file|uploaded)\b/i.test(
      question,
    ) ||
    /\b(pdf|document|file|uploaded)\b.*\b(products?|catalog|data|content)\b/i.test(
      question,
    ) ||
    /\b(shop|store|business)\b.*\b(summary|information|details|info|overview)\b/i.test(
      question,
    ) ||
    /\bwhat\b.*\b(in|from)\b.*\b(document|pdf|file)\b/i.test(question) ||
    /\binformation\s+summary\b/i.test(question)
  );
}

/** Product question should use PDF when user references the document. */
export function isDocumentProductQuery(question: string): boolean {
  return (
    isBroadDocumentQuery(question) ||
    /\b(products?|catalog)\b.*\b(pdf|document|uploaded|file)\b/i.test(question)
  );
}

export function formatHistoryForPrompt(
  history: { role: string; content: string }[],
  maxMessages = 10,
): string {
  return history
    .slice(-maxMessages)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");
}
