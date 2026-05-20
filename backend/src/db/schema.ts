import {
  jsonb,
    pgTable,
    text,
    uuid,
    vector,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),

  documentId: uuid("document_id")
    .references(() => documents.id)
    .notNull(),

  content: text("content").notNull(),

  // embedding: text("embedding").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull()
});