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
      const embedding = await vectorService.createEmbedding(content);

      await db.insert(documentChunks).values({
        documentId: document.id,
        content,
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

  async chunkText(text: string, size = 1000, overlap = 200) {

    const chunks = [];
    let i = 0;

    while (i < text.length) {
      chunks.push(text.slice(i, i + size));
      i += size - overlap;
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
  }
};
