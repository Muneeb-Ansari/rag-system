import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { embeddings } from "./embedding.js";

export const productService = {
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

  searchProducts: async (query: string) => {
    const normalized = query.trim().toLowerCase();

    const rows = await db.select().from(products);
    return rows
      .filter((product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized)
      )
      .slice(0, 5);
  },

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
