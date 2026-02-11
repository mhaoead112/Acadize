/**
 * Migration Runner Script
 * Runs the multi-tenant SQL migration against the database
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root (two levels up from scripts/)
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Also try loading from server/.env if exists
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

async function runMigration() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ DATABASE_URL is not set in environment');
        process.exit(1);
    }

    console.log('🔄 Connecting to database...');
    
    const pool = new Pool({ connectionString: databaseUrl });
    
    try {
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../migrations/0002_add_organizations_multi_tenant.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        
        console.log('📄 Running migration: 0002_add_organizations_multi_tenant.sql');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        
        // Verify the tables were created
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('organizations', 'organization_invites');
        `);
        
        console.log('📋 Verified tables:', result.rows.map(r => r.table_name).join(', '));
        
        // Check if organization_id was added to users
        const columnsResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'organization_id';
        `);
        
        if (columnsResult.rows.length > 0) {
            console.log('✅ organization_id column added to users table');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
