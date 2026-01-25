import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.AI_DB_HOST,
  port: parseInt(process.env.AI_DB_PORT || '5432'),
  user: process.env.AI_DB_USER,
  password: process.env.AI_DB_PASSWORD,
  database: process.env.AI_DB_NAME,
  ssl: process.env.AI_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function clearVectors() {
  try {
    console.log('🗑️  Dropping and recreating lesson vectors table with correct dimensions...');

    // Drop the old table and recreate with correct vector dimension
    await pool.query('DROP TABLE IF EXISTS lesson_vectors');
    console.log('✓ lesson_vectors table dropped');

    // Create table with vector(4096) for qwen3-embedding-8b model
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE IF NOT EXISTS lesson_vectors (
        id SERIAL PRIMARY KEY,
        lessonid TEXT NOT NULL,
        chunktxt TEXT NOT NULL,
        vector vector(4096),
        createdat TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ lesson_vectors table recreated with vector(4096)');

    await pool.query('DELETE FROM processed_files');
    console.log('✓ processed_files cleared');

    await pool.end();
    console.log('\n✅ Database reset successfully! Restart the server to re-index lessons.');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

clearVectors();
