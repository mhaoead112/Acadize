import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in .env file');
  process.exit(1);
}

const pool = new Pool({ connectionString });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationPath = path.join(__dirname, 'migrations', '0021_add_educational_tables.sql');

fs.readFile(migrationPath, 'utf8', (err, sql) => {
  if (err) {
    console.error('Error reading migration file:', err);
    pool.end();
    process.exit(1);
  }

  pool.query(sql, (err, res) => {
    if (err) {
      console.error('Error executing migration:', err);
    } else {
      console.log('Migration executed successfully');
    }
    pool.end();
  });
});