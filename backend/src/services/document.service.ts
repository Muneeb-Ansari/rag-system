import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { documentChunks, documents } from "../db/schema.js";
import { loadPDF } from "../loaders/pdfLoader.js";
import { vectorService } from "./vector.service.js";

export const documentService = {
  async hasChunks(): Promise<boolean> {
    const [row] = await db.select({ total: count() }).from(documentChunks);
    return (row?.total ?? 0) > 0;
  },

  async ingestPdf(filePath: string, fileName: string) {
    const text = await loadPDF(filePath);
    const chunks = await this.chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No text could be extracted from the PDF");
    }

    const [document] = await db
      .insert(documents)
      .values({ name: fileName })
      .returning({ id: documents.id });

    if (!document) {
      throw new Error("Failed to create document record");
    }

    for (const content of chunks) {
      const chunkForStorage = content.trim();
      const textForEmbedding = `[Source: ${fileName}]\n${chunkForStorage}`;
      const embedding = await vectorService.createEmbedding(textForEmbedding);

      await db.insert(documentChunks).values({
        documentId: document.id,
        content: chunkForStorage,
        embedding,
      });
    }

    return {
      documentId: document.id,
      name: fileName,
      chunkCount: chunks.length,
    };
  },

  // async deleteDocument(documentId: string) {
  //   await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
  //   await db.delete(documents).where(eq(documents.id, documentId));
  // },

  async getChunkCount(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(documentChunks);
    return Number(row?.total ?? 0);
  },

  async getAllChunkContents(): Promise<string[]> {
    const rows = await db
      .select({ content: documentChunks.content })
      .from(documentChunks);
    return rows.map((r) => r.content);
  },

  chunkBySize(text: string, size = 1200, overlap = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
      chunks.push(text.slice(i, i + size));
      i += size - overlap;
    }
    return chunks;
  },

  splitProductBlocks(catalog: string): string[] {
    const blocks = catalog.split(/\n(?=[^\n]+\nBrand:)/i);
    return blocks.map((b) => b.trim()).filter((b) => b.length > 30);
  },

  async chunkText(text: string) {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    const productsMatch = normalized.match(/\nProducts:\s*\n/i);

    if (!productsMatch || productsMatch.index === undefined) {
      return this.chunkBySize(normalized);
    }

    const headerEnd = productsMatch.index + productsMatch[0].length;
    const header = normalized.slice(0, headerEnd);
    const catalog = normalized.slice(headerEnd);

    const chunks: string[] = [...this.chunkBySize(header, 1400, 150)];

    const productBlocks = this.splitProductBlocks(catalog);
    if (productBlocks.length > 0) {
      const indexLines = productBlocks.map((block) => {
        const lines = block.split("\n");
        const name = lines[0]?.trim() ?? "Unknown";
        const price =
          block.match(/Price:\s*(PKR\s*[\d,]+)/i)?.[1] ??
          block.match(/Price:\s*([^\n]+)/i)?.[1] ??
          "N/A";
        const category =
          block.match(/Category:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
        return category
          ? `${name} (${category}) — ${price}`
          : `${name} — ${price}`;
      });

      chunks.push(
        `Product catalog index from uploaded document:\n${indexLines.join("\n")}`,
      );

      for (const block of productBlocks) {
        chunks.push(`Product from document:\n${block}`);
      }
    } else {
      chunks.push(...this.chunkBySize(catalog, 1400, 200));
    }

    return chunks;
  },

  async getDocuments() {
    const docs = await db.select().from(documents);
    return docs.map((doc) => ({
      id: doc.id,
      name: doc.name,
    }))
  },

  async deleteDocument(documentId: string) {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    await db.delete(documents).where(eq(documents.id, documentId));
  },

  async getDocumentName(): Promise<string | undefined> {
    const [doc] = await db.select({ name: documents.name }).from(documents).limit(1);
    return doc?.name;
  },

  async getPdfProductCount(): Promise<number> {
    const rows = await db
      .select({ content: documentChunks.content })
      .from(documentChunks);
    const index = rows.find((r) =>
      r.content.startsWith("Product catalog index from uploaded document:"),
    );
    if (index) {
      const lines = index.content
        .split("\n")
        .slice(1)
        .filter((line) => line.trim().length > 0);
      return lines.length;
    }
    return rows.filter((r) => r.content.startsWith("Product from document:")).length;
  },

  productNameMatchesQuestion(productName: string, question: string): boolean {
    const qNorm = question.toLowerCase().replace(/[^a-z0-9]/g, "");
    const nameNorm = productName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const qNums =
      question.match(/\b\d+[a-z]?\b/gi)?.map((n) => n.toLowerCase()) ?? [];
    const nameNums =
      productName.match(/\b\d+[a-z]?\b/gi)?.map((n) => n.toLowerCase()) ?? [];

    if (qNums.length > 0 && !qNums.every((n) => nameNums.includes(n))) {
      return false;
    }
    if (qNorm.includes(nameNorm) || nameNorm.includes(qNorm)) return true;

    const tokens = productName
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ""))
      .filter((t) => t.length > 2);
    const matched = tokens.filter((t) => qNorm.includes(t)).length;
    return matched >= 2 && matched / tokens.length >= 0.6;
  },

  async findProductInDocument(
    question: string,
  ): Promise<{ content: string; productName: string } | null> {
    const rows = await db
      .select({ content: documentChunks.content })
      .from(documentChunks);

    for (const row of rows) {
      if (!row.content.startsWith("Product from document:")) continue;
      const block = row.content.replace(/^Product from document:\s*/i, "").trim();
      const productName = block.split("\n")[0]?.trim() ?? "";
      if (productName && this.productNameMatchesQuestion(productName, question)) {
        return { content: block, productName };
      }
    }

    const matches = await vectorService.searchSimilar(
      `${question} product brand category price description`,
      5,
    );
    for (const row of matches) {
      const text = row.content.replace(/^Product from document:\s*/i, "").trim();
      const productName = text.split("\n")[0]?.trim() ?? "";
      if (productName && this.productNameMatchesQuestion(productName, question)) {
        return { content: text, productName };
      }
    }

    return null;
  },

  async getCategorySummaryFromDocument(): Promise<string | null> {
    const rows = await db
      .select({ content: documentChunks.content })
      .from(documentChunks);
    const index = rows.find((r) =>
      r.content.startsWith("Product catalog index from uploaded document:"),
    );
    if (!index) return null;

    const counts = new Map<string, number>();
    for (const line of index.content.split("\n").slice(1)) {
      const match = line.match(/\(([^)]+)\)\s*—/);
      const category = match?.[1]?.trim();
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    if (counts.size === 0) return null;

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const lines = sorted.map(([cat, n]) => `${cat}: ${n} products`);
    return `Category counts from uploaded document:\n${lines.join("\n")}\nMost items: ${sorted[0]![0]} (${sorted[0]![1]} products)`;
  },
};
