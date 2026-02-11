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
    
    // Migration: Multi-tenant organizations
    console.log('Running 0002_add_organizations_multi_tenant.sql...');
    const migrationMultiTenant = fs.readFileSync(
      path.join(__dirname, 'server', 'migrations', '0002_add_organizations_multi_tenant.sql'),
      'utf8'
    );
    await client.query(migrationMultiTenant);
    console.log('✓ Completed 0002_add_organizations_multi_tenant.sql\\n');
    
    // Migration: Row-Level Security
    console.log('Running 0003_add_row_level_security.sql...');
    const migrationRLS = fs.readFileSync(
      path.join(__dirname, 'server', 'migrations', '0003_add_row_level_security.sql'),
      'utf8'
    );
    await client.query(migrationRLS);
    console.log('✓ Completed 0003_add_row_level_security.sql\\n');
    
    await client.query('COMMIT');
    console.log('All migrations completed successfully!');
    
    // Verify the tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'organization_invites')
      ORDER BY table_name;
    `);
    
    console.log('\nVerified multi-tenant tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verify the organization_id columns
    const columnsResult = await client.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name = 'organization_id' 
      AND table_name IN ('users', 'courses', 'exams')
      ORDER BY table_name;
    `);
    
    console.log('\nVerified organization_id columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}.${row.column_name}`);
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
