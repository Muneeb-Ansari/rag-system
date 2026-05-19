import { cosineDistance } from "drizzle-orm";
import { db } from "../db/index.js";
import { documentChunks } from "../db/schema.js";
import { embeddings } from "./embedding.js";

const SIMILARITY_LIMIT = 4;

export const vectorService = {
  async createEmbedding(text: string): Promise<number[]> {
    return embeddings.embedQuery(text);
  },

  async searchSimilar(query: string, limit = SIMILARITY_LIMIT) {
    const queryEmbedding = await this.createEmbedding(query);
    const distanceExpr = cosineDistance(documentChunks.embedding, queryEmbedding);

    return db
      .select({
        content: documentChunks.content,
        distance: distanceExpr,
      })
      .from(documentChunks)
      .orderBy(distanceExpr)
      .limit(limit);
  },
};
