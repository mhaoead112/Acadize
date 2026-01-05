import { db } from './index.js';

export async function setupDatabase() {
  try {
    // Test connection
    await db.execute('SELECT 1');
    console.log('✅ Database connected successfully');

    // Create demo users if they don't exist
    const demoUsers = [
      {
        username: 'student_demo',
        email: 'student_demo@eduverse.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWfBGNLdGOCa', // demo123
        fullName: 'Student Demo User',
        role: 'student'
      },
      {
        username: 'teacher_demo',
        email: 'teacher_demo@eduverse.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWfBGNLdGOCa', // demo123
        fullName: 'Teacher Demo User',
        role: 'teacher'
      },
      {
        username: 'admin_demo',
        email: 'admin_demo@eduverse.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWfBGNLdGOCa', // demo123
        fullName: 'Admin Demo User',
        role: 'admin'
      },
      {
        username: 'parent_demo',
        email: 'parent_demo@eduverse.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWfBGNLdGOCa', // demo123
        fullName: 'Parent Demo User',
        role: 'parent'
      }
    ];

    for (const demoUser of demoUsers) {
      const existing = await db.execute(
        'SELECT id FROM users WHERE username = $1 LIMIT 1',
        [demoUser.username]
      );

      if (existing.rows.length === 0) {
        await db.execute(`
          INSERT INTO users (username, email, password, full_name, role, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [
          demoUser.username,
          demoUser.email,
          demoUser.password,
          demoUser.fullName,
          demoUser.role,
          true
        ]);
        console.log(`✅ Created demo user: ${demoUser.username}`);
      } else {
        console.log(`ℹ️ Demo user already exists: ${demoUser.username}`);
      }
    }

    console.log('✅ Database setup completed');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}