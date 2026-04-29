/**
 * Creates the missing xp_transactions table required by the XP/Quest system.
 * Safe to run multiple times — uses IF NOT EXISTS.
 *
 * Usage:  node scripts/create-xp-tables.js
 */

import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is required.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  console.log('\n⚡  Creating xp_transactions table…\n');
  try {
    await client.query('BEGIN');

    // xp_transactions — append-only XP ledger
    await client.query(`
      CREATE TABLE IF NOT EXISTS xp_transactions (
        id              TEXT         PRIMARY KEY,
        user_id         TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        amount          INTEGER      NOT NULL,
        reason          VARCHAR(100) NOT NULL,
        source_id       TEXT,
        source_type     VARCHAR(50),
        metadata        JSONB,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    console.log('  ✅  xp_transactions table');

    await client.query(`
      CREATE INDEX IF NOT EXISTS xp_tx_user_org_idx
        ON xp_transactions (user_id, organization_id);
    `);
    console.log('  ✅  INDEX xp_tx_user_org_idx');

    await client.query(`
      CREATE INDEX IF NOT EXISTS xp_tx_source_idx
        ON xp_transactions (source_id, reason);
    `);
    console.log('  ✅  INDEX xp_tx_source_idx');

    // Partial unique index — only deduplicates when source_id is not NULL
    // (manual teacher awards with no sourceId are allowed to stack)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS xp_tx_dedupe_idx
        ON xp_transactions (user_id, reason, source_id)
        WHERE source_id IS NOT NULL;
    `);
    console.log('  ✅  UNIQUE INDEX xp_tx_dedupe_idx (partial, source_id IS NOT NULL)');

    await client.query('COMMIT');
    console.log('\n🎉  xp_transactions migration complete!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n💥  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
