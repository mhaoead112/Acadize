/**
 * Script to create a test organization
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:VIisualStudioCode@localhost:5432/eduverse'
});

async function createTestOrganization() {
  const client = await pool.connect();
  
  try {
    console.log('Creating test organizations...\n');
    
    // Create default system organization
    await client.query(`
      INSERT INTO organizations (id, name, subdomain, plan, is_active, primary_color, secondary_color, config)
      VALUES ('org_default_system', 'System Default', 'default', 'enterprise', true, '#6366f1', '#8b5cf6', '{}')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Created org_default_system (default)');
    
    // Create test organization
    await client.query(`
      INSERT INTO organizations (id, name, subdomain, plan, is_active, primary_color, secondary_color, config)
      VALUES ('org_test_org', 'Test Organization', 'test', 'pro', true, '#10b981', '#059669', '{}')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Created org_test_org (test)');
    
    // Create demo organization
    await client.query(`
      INSERT INTO organizations (id, name, subdomain, plan, is_active, primary_color, secondary_color, config)
      VALUES ('org_demo', 'Demo School', 'demo', 'free', true, '#f59e0b', '#d97706', '{}')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Created org_demo (demo)');
    
    // Show all organizations
    const result = await client.query('SELECT id, name, subdomain, plan FROM organizations ORDER BY created_at');
    console.log('\n📋 All organizations:');
    console.table(result.rows);
    
    console.log('\n🎉 Done! You can now access:');
    console.log('   http://default.lvh.me:5173 - System Default');
    console.log('   http://test.lvh.me:5173    - Test Organization');
    console.log('   http://demo.lvh.me:5173    - Demo School');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestOrganization();
