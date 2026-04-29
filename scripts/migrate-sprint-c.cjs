/**
 * Sprint C Migration — Skill Tree
 * Creates: skill_tree_nodes
 *
 * Run with:  node scripts/migrate-sprint-c.cjs
 */
'use strict';

require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🌳 Running Sprint C migration: Skill Tree…');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_tree_nodes (
        id            TEXT PRIMARY KEY,
        course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id     TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        prereq_node_id TEXT,
        position      INTEGER NOT NULL DEFAULT 0,
        section_label VARCHAR(120),
        pos_x         INTEGER NOT NULL DEFAULT 0,
        pos_y         INTEGER NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT skill_tree_nodes_lesson_unique_idx UNIQUE (lesson_id)
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS skill_tree_nodes_course_idx
        ON skill_tree_nodes (course_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Sprint C migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Sprint C migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
