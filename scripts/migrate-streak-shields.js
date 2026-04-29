/**
 * Migration: Add streak shield & weekly streak columns to study_streaks table.
 * Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.
 * 
 * Usage: node scripts/migrate-streak-shields.js
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
  console.log('\n🛡️  Migrating streak shield & weekly streak columns...\n');

  try {
    await client.query('BEGIN');

    const columns = [
      { name: 'streak_shields',       type: 'INTEGER',     default: '0',    notNull: true  },
      { name: 'weekly_streak',        type: 'INTEGER',     default: '0',    notNull: true  },
      { name: 'weekly_active_days',   type: 'INTEGER',     default: '0',    notNull: true  },
      { name: 'last_weekly_check',    type: 'TIMESTAMPTZ', default: null,   notNull: false },
      { name: 'last_shield_earned_at',type: 'TIMESTAMPTZ', default: null,   notNull: false },
      { name: 'comeback_bonus_earned_at', type: 'TIMESTAMPTZ', default: null, notNull: false },
    ];

    for (const col of columns) {
      const defaultClause = col.default !== null ? ` DEFAULT ${col.default}` : '';
      const notNullClause = col.notNull ? ' NOT NULL' : '';
      await client.query(`
        ALTER TABLE study_streaks
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${defaultClause}${notNullClause};
      `);
      console.log(`  ✅  ${col.name}`);
    }

    await client.query('COMMIT');
    console.log('\n🎉  Migration completed successfully!\n');
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
