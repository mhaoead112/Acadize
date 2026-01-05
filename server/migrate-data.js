/**
 * Data Migration Script
 * Migrates data from local PostgreSQL to Neon cloud database
 * 
 * Usage: node migrate-data.js
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

// Source database (local PostgreSQL)
const sourceDb = new Pool({
  connectionString: "postgresql://postgres:password@localhost:5432/eduverse-dev",
  // Update with your local database credentials
});

// Target database (Neon)
const targetDb = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tables in migration order (respecting foreign keys)
const TABLES_ORDER = [
  'users',
  'courses',
  'enrollments',
  'lessons',
  'assignments',
  'submissions',
  'grades',
  'events',
  'event_participants',
  'announcements',
  'study_groups',
  'group_members',
  'conversations',
  'conversation_participants',
  'messages',
  'message_read_receipts',
  'user_presence',
  'notifications',
  'blocked_users',
  'reported_users',
  'parent_children',
  'attendance',
  'study_activity',
  'study_streaks',
  'push_subscriptions'
];

async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows.map(row => row.column_name);
}

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);
  
  try {
    // Get column names
    const columns = await getTableColumns(sourceDb, tableName);
    const columnList = columns.join(', ');
    
    // Count source rows
    const countResult = await sourceDb.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const totalRows = parseInt(countResult.rows[0].count);
    
    if (totalRows === 0) {
      console.log(`   ⚠️  No data in ${tableName} - skipping`);
      return { table: tableName, rows: 0, status: 'empty' };
    }
    
    console.log(`   📊 Found ${totalRows} rows to migrate`);
    
    // Fetch all data from source
    const sourceData = await sourceDb.query(`SELECT * FROM "${tableName}"`);
    
    // Prepare insert statement
    const placeholders = columns.map((_, i) => 
      `($${i * columns.length + 1}:raw)`.replace(':raw', 
        columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')
      )
    );
    
    let insertedRows = 0;
    let errors = 0;
    
    // Insert data in batches
    const batchSize = 100;
    for (let i = 0; i < sourceData.rows.length; i += batchSize) {
      const batch = sourceData.rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        try {
          const values = columns.map(col => row[col]);
          const valuePlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
          
          await targetDb.query(
            `INSERT INTO "${tableName}" (${columnList}) VALUES (${valuePlaceholders}) ON CONFLICT DO NOTHING`,
            values
          );
          
          insertedRows++;
          process.stdout.write(`\r   ✓ Inserted: ${insertedRows}/${totalRows}`);
        } catch (err) {
          errors++;
          console.error(`\n   ❌ Error inserting row:`, err.message);
        }
      }
    }
    
    console.log(`\n   ✅ Completed: ${insertedRows} rows inserted, ${errors} errors`);
    return { table: tableName, rows: insertedRows, errors, status: 'success' };
    
  } catch (error) {
    console.error(`   ❌ Failed to migrate ${tableName}:`, error.message);
    return { table: tableName, rows: 0, status: 'failed', error: error.message };
  }
}

async function verifyMigration() {
  console.log('\n\n🔍 Verifying migration...\n');
  
  const verification = [];
  
  for (const table of TABLES_ORDER) {
    try {
      const sourceCount = await sourceDb.query(`SELECT COUNT(*) FROM "${table}"`);
      const targetCount = await targetDb.query(`SELECT COUNT(*) FROM "${table}"`);
      
      const source = parseInt(sourceCount.rows[0].count);
      const target = parseInt(targetCount.rows[0].count);
      const match = source === target ? '✅' : '⚠️';
      
      console.log(`${match} ${table.padEnd(30)} Source: ${source}, Target: ${target}`);
      verification.push({ table, source, target, match: source === target });
    } catch (err) {
      console.log(`❌ ${table.padEnd(30)} Error: ${err.message}`);
    }
  }
  
  return verification;
}

async function main() {
  console.log('🚀 Starting Data Migration from Local PostgreSQL to Neon\n');
  console.log('Source: Local PostgreSQL (eduverse-dev)');
  console.log('Target: Neon Cloud Database\n');
  console.log('⚠️  WARNING: This will copy data to Neon. Existing data will be preserved.');
  console.log('⚠️  Use ON CONFLICT DO NOTHING to avoid duplicates.\n');
  
  const results = [];
  
  try {
    // Test connections
    console.log('🔌 Testing database connections...');
    await sourceDb.query('SELECT NOW()');
    console.log('   ✅ Source database connected');
    
    await targetDb.query('SELECT NOW()');
    console.log('   ✅ Target database connected\n');
    
    // Migrate each table
    console.log('📦 Starting table migration...');
    for (const table of TABLES_ORDER) {
      const result = await migrateTable(table);
      results.push(result);
    }
    
    // Verify migration
    const verification = await verifyMigration();
    
    // Summary
    console.log('\n\n📊 Migration Summary:\n');
    console.log('═══════════════════════════════════════════════════════');
    
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const empty = results.filter(r => r.status === 'empty').length;
    const totalRows = results.reduce((sum, r) => sum + r.rows, 0);
    
    console.log(`✅ Successful migrations: ${successful}`);
    console.log(`⚠️  Empty tables: ${empty}`);
    console.log(`❌ Failed migrations: ${failed}`);
    console.log(`📊 Total rows migrated: ${totalRows}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tables:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   - ${r.table}: ${r.error}`);
      });
    }
    
    const allMatch = verification.every(v => v.match);
    if (allMatch) {
      console.log('\n🎉 Migration completed successfully! All row counts match.');
    } else {
      console.log('\n⚠️  Migration completed with warnings. Some row counts do not match.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sourceDb.end();
    await targetDb.end();
  }
}

// Run migration
main().catch(console.error);
