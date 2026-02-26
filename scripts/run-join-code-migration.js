/**
 * Adds join_code column to courses table for student self-enrollment by code/invite link.
 * Usage: node scripts/run-join-code-migration.js
 * Requires: DATABASE_URL in .env (root or server/)
 */
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from root or server
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is required. Set it in .env or server/.env');
    process.exit(1);
  }
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, '..', 'server', 'src', 'db', 'migrations', 'add_courses_join_code.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running add_courses_join_code migration...');
    await client.query(sql);
    console.log('✅ Migration completed. courses.join_code is ready.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
