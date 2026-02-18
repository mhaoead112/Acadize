import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:VIisualStudioCode@localhost:5432/eduverse'
});

async function verify() {
  try {
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'organization_invites')
      ORDER BY table_name;
    `);
    
    console.log('Multi-tenant tables:');
    if (tablesResult.rows.length === 0) {
      console.log('  ❌ No tables found');
    } else {
      tablesResult.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
    }
    
    // Check if organization_id columns exist
    const columnsResult = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name = 'organization_id' 
      AND table_name IN ('users', 'courses', 'exams')
      ORDER BY table_name;
    `);
    
    console.log('\nOrganization ID columns:');
    if (columnsResult.rows.length === 0) {
      console.log('  ❌ No organization_id columns found');
    } else {
      columnsResult.rows.forEach(row => console.log(`  ✓ ${row.table_name}.${row.column_name}`));
    }
    
    // Check if default organization exists
    const orgResult = await pool.query(`
      SELECT id, name, subdomain FROM organizations WHERE id = 'org_default_system' LIMIT 1;
    `);
    
    console.log('\nDefault organization:');
    if (orgResult.rows.length === 0) {
      console.log('  ❌ Default organization not found');
    } else {
      orgResult.rows.forEach(row => console.log(`  ✓ ${row.name} (${row.subdomain})`));
    }
    
  } catch (error) {
    console.error('Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
