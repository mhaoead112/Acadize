import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema.js"; // adjust path if needed

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory (go up two levels: db -> src -> server)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Check that DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("FATAL ERROR: DATABASE_URL is not set in your .env file.");
}

// Create a pool — enable SSL for cloud providers (Neon, Supabase, etc.)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Initialize Drizzle with our schema
export const db = drizzle(pool, { schema });

// Export pool for raw SQL queries (used by legacy code)
export { pool };
export default pool;

// Optional: test connection
(async () => {
  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL successfully");
    client.release();
  } catch (err) {
    console.error(" Failed to connect to PostgreSQL:", err);
  }
})();
