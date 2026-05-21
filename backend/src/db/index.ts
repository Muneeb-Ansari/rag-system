import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
if (pool) {
  console.log("Connected to the database");
} else {
  console.error("Failed to connect to the database");
}

export const db = drizzle(pool);