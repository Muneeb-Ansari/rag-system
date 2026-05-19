import { ChatOpenAI } from "@langchain/openai";

export const llm = new ChatOpenAI({
  model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});
