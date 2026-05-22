import { asc, count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { embeddings } from "./embedding.js";
import { vectorService } from "./vector.service.js";

export const productService = {
  async hasProducts(): Promise<boolean> {
    const [row] = await db.select({ total: count() }).from(products);
    return (row?.total ?? 0) > 0;
  },

  async getProductCount(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(products);
    return Number(row?.total ?? 0);
  },

  async getCheapestProduct() {
    const [product] = await db
      .select()
      .from(products)
      .orderBy(asc(products.price))
      .limit(1);
    return product;
  },

  async getPopularProducts() {
    const rows = await db.select().from(products);
    const popularPattern =
      /\b(popular|most\s+sale|best\s*sell|top\s*sell|bestseller|best\s+selling)\b/i;
    const matched = rows.filter(
      (p) =>
        popularPattern.test(p.description) || popularPattern.test(p.name),
    );
    if (matched.length > 0) return matched;

    const [top] = await vectorService.searchProducts(
      "most popular bestselling top selling product",
      1,
    );
    return top ? [top] : [];
  },

  async getPopularProductsOrdered() {
    const rows = await db.select().from(products);
    type ProductRow = (typeof rows)[number];
    const popularPattern =
      /\b(popular|most\s+sale|best\s*sell|top\s*sell|bestseller|best\s+selling)\b/i;
    const tagged = rows.filter(
      (p) =>
        popularPattern.test(p.description) || popularPattern.test(p.name),
    );
    const taggedIds = new Set(tagged.map((p) => p.id));

    const ranked = await vectorService.searchProducts(
      "popular bestselling top rated recommended best selling product",
      rows.length || 8,
    );

    const ordered: ProductRow[] = [...tagged];
    for (const p of ranked) {
      if (!taggedIds.has(p.id)) {
        const full = rows.find((r) => r.id === p.id);
        if (full) ordered.push(full);
      }
    }
    return ordered.length > 0 ? ordered : rows;
  },

  async findProductByQuestion(question: string) {
    const rows = await db.select().from(products);
    const qNorm = question.toLowerCase().replace(/[^a-z0-9]/g, "");
    const qNums =
      question.match(/\b\d+[a-z]?\b/gi)?.map((n) => n.toLowerCase()) ?? [];

    let best: (typeof rows)[number] | null = null;
    let bestScore = 0;

    for (const p of rows) {
      const nameNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!nameNorm) continue;

      const nameNums =
        p.name.match(/\b\d+[a-z]?\b/gi)?.map((n) => n.toLowerCase()) ?? [];
      if (qNums.length > 0) {
        const numsMatch = qNums.every((n) => nameNums.includes(n));
        if (!numsMatch) continue;
      }

      if (qNorm.includes(nameNorm) || nameNorm.includes(qNorm)) {
        const score = nameNorm.length + 10;
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
        continue;
      }

      const tokens = p.name
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z0-9]/g, ""))
        .filter((t) => t.length > 2);
      const matchedTokens = tokens.filter((t) => qNorm.includes(t)).length;
      if (matchedTokens >= 2 && matchedTokens / tokens.length >= 0.6) {
        const score = matchedTokens * 5;
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
    }

    return best;
  },

  async findProductFromHistory(
    history: { role: string; content: string }[],
  ) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg?.role !== "user") continue;
      const found = await this.findProductByQuestion(msg.content);
      if (found) return found;
    }
    return null;
  },

  async getPopularProductAtOffset(offset: number) {
    const ordered = await this.getPopularProductsOrdered();
    const product = ordered[offset];
    return {
      product,
      total: ordered.length,
      offset,
      hasMore: offset + 1 < ordered.length,
    };
  },

  async createProduct(name: string, description: string, image: string, price: string) {
    const embedding = await this.productEmbeddings({ name, description, price });
    const result = await db
      .insert(products)
      .values({
        name,
        description,
        image,
        price,
        embedding,
      })
      .returning();
    return result[0];
  },

  async getProducts() {
    return db.select().from(products).orderBy(products.createdAt);
  },

  async getProductById(id: string) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return result[0];
  },

  async updateProduct(id: string, name: string, description: string, image: string, price: string) {
    const embedding = await this.productEmbeddings({ name, description, price });
    const result = await db
      .update(products)
      .set({
        name,
        description,
        image,
        price,
        embedding,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
    return { message: "Product deleted successfully" };
  },

  // searchProducts: async (query: string) => {
  //   const normalized = query.trim().toLowerCase();

  //   const rows = await db.select().from(products);
  //   return rows
  //     .filter((product) =>
  //       product.name.toLowerCase().includes(normalized) ||
  //       product.description.toLowerCase().includes(normalized)
  //     )
  //     .slice(0, 5);
  // },

  async productEmbeddings({ name, description, price }: { name: string; description: string; price: string }) {
    const embeddingText = `
    Product Name: ${name}
    Description: ${description}
    Price: ${price}
  `;
    const embedding = await embeddings.embedQuery(embeddingText);
    return embedding;
  },
};
