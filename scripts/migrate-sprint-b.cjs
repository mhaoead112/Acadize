
require('dotenv').config({ path: 'server/.env' });
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function migrate() {
  console.log('Migrating Sprint B tables using pg...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create daily_challenges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_challenges (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        condition_type VARCHAR(50) NOT NULL,
        condition_value INTEGER NOT NULL,
        xp_reward INTEGER NOT NULL,
        buff_type VARCHAR(50),
        buff_value VARCHAR(50),
        buff_duration_minutes INTEGER DEFAULT 60,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS daily_challenges_org_date_unique_idx ON daily_challenges (organization_id, date);`);

    // 2. Create user_challenge_completions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_challenge_completions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_id TEXT NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS user_challenge_unique_idx ON user_challenge_completions (user_id, challenge_id);`);

    // 3. Create user_buffs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_buffs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        buff_type VARCHAR(50) NOT NULL,
        buff_value VARCHAR(50) NOT NULL,
        starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        source_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS user_buffs_user_type_idx ON user_buffs (user_id, buff_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS user_buffs_active_idx ON user_buffs (user_id, expires_at);`);

    await client.query('COMMIT');
    console.log('Sprint B tables migrated successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
