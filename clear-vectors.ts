import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

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
    console.log('🗑️  Clearing lesson vectors and processed files...');
    
    await pool.query('DELETE FROM lesson_vectors');
    console.log('✓ lesson_vectors cleared');
    
    await pool.query('DELETE FROM processed_files');
    console.log('✓ processed_files cleared');
    
    const result = await pool.query('SELECT COUNT(*) as count FROM lesson_vectors');
    console.log(`\n📊 Remaining vectors: ${result.rows[0].count}`);
    
    await pool.end();
    console.log('\n✅ Database cleared successfully!');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

clearVectors();
