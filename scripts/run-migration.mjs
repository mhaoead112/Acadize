// scripts/run-migration.mjs
// Usage: node scripts/run-migration.mjs <migration-file>
// Example: node scripts/run-migration.mjs migrations/0015_fix_lessons_order_integer.sql
//
// Runs a SQL migration file directly against the DATABASE_URL using the pg driver.
// Does NOT require psql to be installed.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load .env file if present — try multiple candidates used in this project
try {
  const dotenv = require('dotenv');
  const fs = require('fs');
  const candidates = ['.env', 'server/.env', 'ai.env', '.env.local'];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      dotenv.config({ path: c, override: false });
    }
  }
} catch (_) {
  // dotenv not required if env vars are set by the shell
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-migration.mjs <migration-file>');
  process.exit(1);
}

const sqlContent = readFileSync(resolve(file), 'utf8');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Make sure your .env file is loaded or set the variable manually.');
  process.exit(1);
}

// Load pg driver (installed as a project dependency)
let pg;
try {
  pg = require('pg');
} catch (e) {
  console.error('Could not load pg driver:', e.message);
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });

try {
  await client.connect();
  console.log(`\nRunning migration: ${file}`);
  console.log('─'.repeat(60));
  console.log(sqlContent);
  console.log('─'.repeat(60));
  await client.query(sqlContent);
  console.log('\n✅ Migration completed successfully.\n');
} catch (err) {
  console.error('\n❌ Migration failed:', err.message, '\n');
  process.exit(1);
} finally {
  await client.end();
}
