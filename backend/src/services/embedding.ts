import { OpenAIEmbeddings } from "@langchain/openai";

export const embeddings = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});
