import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: 'postgresql://postgres:VIisualStudioCode@localhost:5432/eduverse'
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Running migrations...\n');
    
    // Migration 3: Fix users schema
    console.log('Running 0003_fix_users_schema.sql...');
    const migration3 = fs.readFileSync(
      path.join(__dirname, 'migrations', '0003_fix_users_schema.sql'),
      'utf8'
    );
    await client.query(migration3);
    console.log('✓ Completed 0003_fix_users_schema.sql\n');
    
    // Migration 6: Add profile picture and grade
    console.log('Running 0006_add_profile_picture.sql...');
    const migration6 = fs.readFileSync(
      path.join(__dirname, 'migrations', '0006_add_profile_picture.sql'),
      'utf8'
    );
    await client.query(migration6);
    console.log('✓ Completed 0006_add_profile_picture.sql\n');
    
    await client.query('COMMIT');
    console.log('All migrations completed successfully!');
    
    // Verify the columns
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('username', 'full_name', 'profile_picture', 'grade')
      ORDER BY column_name;
    `);
    
    console.log('\nVerified columns in users table:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
