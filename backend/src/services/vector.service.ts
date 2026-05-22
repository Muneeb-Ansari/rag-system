import { cosineDistance, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { documentChunks, products } from "../db/schema.js";
import { embeddings } from "./embedding.js";

const SIMILARITY_LIMIT = 4;

export const vectorService = {
  async createEmbedding(text: string): Promise<number[]> {
    return embeddings.embedQuery(text);
  },

  async searchSimilar(query: string, limit = SIMILARITY_LIMIT) {
    const queryEmbedding = await this.createEmbedding(query);
    const distanceExpr = cosineDistance(documentChunks.embedding, queryEmbedding);

    const results = await db
      .select({
        content: documentChunks.content,
        distanceExpr: distanceExpr,
      })
      .from(documentChunks)
      .orderBy(distanceExpr)
      .limit(limit);


    return results;
  },

  async searchProducts(query: string, limit = SIMILARITY_LIMIT) {
    const queryEmbedding = await this.createEmbedding(query);
    const distanceExpr = cosineDistance(products.embedding, queryEmbedding);
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        image: products.image,
        price: products.price,
        distanceExpr: distanceExpr,
      })
      .from(products)
      .orderBy(distanceExpr)
      .limit(limit);

    return results;
  },
};
