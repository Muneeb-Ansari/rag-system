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

export function isFollowUpQuestion(question: string): boolean {
  const trimmed = question.trim();
  if (trimmed.length < 80) return true;
  return /\b(it|they|them|that|those|this|cheapest|cheap|expensive|one|ones|book|how|what about|which|also)\b/i.test(
    trimmed,
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
