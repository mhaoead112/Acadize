
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting badge rarity and identity migration...');

    // 1. Create the rarity enum if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE badge_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Badge rarity enum created/verified');

    // 2. Add columns to gamification_badges
    await client.query(`
      ALTER TABLE gamification_badges 
      ADD COLUMN IF NOT EXISTS rarity badge_rarity DEFAULT 'common' NOT NULL,
      ADD COLUMN IF NOT EXISTS story_text TEXT,
      ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;
    `);
    console.log('✓ Columns added to gamification_badges');

    // 3. Create user_featured_badges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_featured_badges (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id TEXT NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
        display_order INTEGER NOT NULL,
        PRIMARY KEY (user_id, badge_id)
      );
    `);
    console.log('✓ user_featured_badges table created');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
