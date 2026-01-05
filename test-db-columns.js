// Quick test to check database columns
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:VIisualStudioCode@localhost:5432/eduverse'
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Users table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    // Check if there's any user data
    const userData = await pool.query('SELECT id, username, full_name, email, profile_picture, grade, role FROM users LIMIT 3');
    console.log('\nSample user data:');
    userData.rows.forEach((user, idx) => {
      console.log(`\nUser ${idx + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Full Name: ${user.full_name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Profile Picture: ${user.profile_picture || 'null'}`);
      console.log(`  Grade: ${user.grade || 'null'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
