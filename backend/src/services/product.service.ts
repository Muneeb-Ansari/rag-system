import { db } from "../db/index.js";
import { products } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const productService = {
  async createProduct(name: string, description: string, image: string, price: string) {
    const result = await db
      .insert(products)
      .values({
        name,
        description,
        image,
        price,
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
    const result = await db
      .update(products)
      .set({
        name,
        description,
        image,
        price,
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
};
