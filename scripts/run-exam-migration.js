import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running exam system migration...\n');
    
    const migrationPath = path.join(__dirname, '../server', 'migrations', '0001_add_exam_system_tables.sql');
    console.log(`📂 Reading migration from: ${migrationPath}`);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⏳ Executing migration SQL...\n');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify tables were created
    console.log('📋 Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('exams', 'exam_questions', 'exam_attempts', 'exam_answers', 'anti_cheat_events', 'anti_cheat_risk_scores', 'mistake_pool', 'mistake_retake_exams', 'mastery_analytics')
      ORDER BY table_name;
    `);
    
    console.log(`\nCreated ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
  } catch (err) {
    console.error('❌ Migration failed:');
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

runMigration();
