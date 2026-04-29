import pg from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Fix for __dirname in ESM
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './server/.env' });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const query = `
      UPDATE organizations 
      SET 
        user_subscription_enabled = true,
        user_monthly_price_piasters = COALESCE(user_monthly_price_piasters, 1000),
        user_annual_price_piasters = COALESCE(user_annual_price_piasters, 9600),
        user_currency = COALESCE(user_currency, 'USD')
    `;
    const result = await pool.query(query);
    console.log('✅ Subscriptions enabled for organizations!');
    console.log(`Updated ${result.rowCount} rows.`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
