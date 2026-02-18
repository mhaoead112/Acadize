// Test script for new API endpoints
// Run with: node test-apis.js

const BASE_URL = 'http://localhost:3001';

// Replace with your admin token after logging in
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN_HERE';

async function testAdminAPIs() {
  console.log('🧪 Testing Admin APIs...\n');

  try {
    // Test 1: Get system stats
    console.log('1️⃣ Testing GET /api/admin/stats');
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const stats = await statsRes.json();
    console.log('✅ Stats:', stats, '\n');

    // Test 2: Get user stats
    console.log('2️⃣ Testing GET /api/admin/stats/users');
    const userStatsRes = await fetch(`${BASE_URL}/api/admin/stats/users`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const userStats = await userStatsRes.json();
    console.log('✅ User Stats:', userStats, '\n');

    // Test 3: Get all users
    console.log('3️⃣ Testing GET /api/admin/users');
    const usersRes = await fetch(`${BASE_URL}/api/admin/users?limit=5`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const users = await usersRes.json();
    console.log('✅ Users:', users, '\n');

    // Test 4: Create a test student
    console.log('4️⃣ Testing POST /api/admin/users');
    const newUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'teststudent',
        email: 'test@student.com',
        fullName: 'Test Student',
        role: 'student',
        password: 'password123'
      })
    });
    const newUser = await newUserRes.json();
    console.log('✅ New User Created:', newUser, '\n');

    // Test 5: Get platform analytics
    console.log('5️⃣ Testing GET /api/admin/analytics');
    const analyticsRes = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const analytics = await analyticsRes.json();
    console.log('✅ Analytics:', analytics, '\n');

    // Test 6: Get moderation reports
    console.log('6️⃣ Testing GET /api/admin/reports');
    const reportsRes = await fetch(`${BASE_URL}/api/admin/reports?status=pending`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const reports = await reportsRes.json();
    console.log('✅ Reports:', reports, '\n');

    console.log('✅ All Admin API tests completed!\n');
  } catch (error) {
    console.error('❌ Error testing Admin APIs:', error);
  }
}

async function testParentAPIs() {
  console.log('🧪 Testing Parent APIs...\n');

  const PARENT_TOKEN = 'YOUR_PARENT_JWT_TOKEN_HERE';

  try {
    // Test 1: Get linked children
    console.log('1️⃣ Testing GET /api/parent/children');
    const childrenRes = await fetch(`${BASE_URL}/api/parent/children`, {
      headers: { 'Authorization': `Bearer ${PARENT_TOKEN}` }
    });
    const children = await childrenRes.json();
    console.log('✅ Children:', children, '\n');

    // Test 2: Link a child
    console.log('2️⃣ Testing POST /api/parent/link-child');
    const linkRes = await fetch(`${BASE_URL}/api/parent/link-child`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PARENT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        linkCode: 'student1' // Replace with actual student username
      })
    });
    const linkResult = await linkRes.json();
    console.log('✅ Link Result:', linkResult, '\n');

    // Test 3: Get teachers
    console.log('3️⃣ Testing GET /api/parent/teachers');
    const teachersRes = await fetch(`${BASE_URL}/api/parent/teachers`, {
      headers: { 'Authorization': `Bearer ${PARENT_TOKEN}` }
    });
    const teachers = await teachersRes.json();
    console.log('✅ Teachers:', teachers, '\n');

    console.log('✅ All Parent API tests completed!\n');
  } catch (error) {
    console.error('❌ Error testing Parent APIs:', error);
  }
}

async function testEventsAPIs() {
  console.log('🧪 Testing Events APIs...\n');

  const TEACHER_TOKEN = 'YOUR_TEACHER_JWT_TOKEN_HERE';

  try {
    // Test 1: Get events
    console.log('1️⃣ Testing GET /api/events');
    const eventsRes = await fetch(`${BASE_URL}/api/events`, {
      headers: { 'Authorization': `Bearer ${TEACHER_TOKEN}` }
    });
    const events = await eventsRes.json();
    console.log('✅ Events:', events, '\n');

    // Test 2: Create an event
    console.log('2️⃣ Testing POST /api/events');
    const newEventRes = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEACHER_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Meeting',
        description: 'Testing the events API',
        eventType: 'meeting',
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
        location: 'Room 101',
        isAllDay: false,
        color: '#3b82f6'
      })
    });
    const newEvent = await newEventRes.json();
    console.log('✅ New Event Created:', newEvent, '\n');

    console.log('✅ All Events API tests completed!\n');
  } catch (error) {
    console.error('❌ Error testing Events APIs:', error);
  }
}

// Instructions
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                   API Testing Script                         ║
╚══════════════════════════════════════════════════════════════╝

📝 Instructions:
1. Login to get JWT tokens:
   - Admin: POST /api/auth/login with admin credentials
   - Parent: POST /api/auth/login with parent credentials
   - Teacher: POST /api/auth/login with teacher credentials

2. Replace token placeholders in this file:
   - ADMIN_TOKEN
   - PARENT_TOKEN
   - TEACHER_TOKEN

3. Run individual test functions:
   - testAdminAPIs()
   - testParentAPIs()
   - testEventsAPIs()

4. Or test all at once:
   - Promise.all([testAdminAPIs(), testParentAPIs(), testEventsAPIs()])

════════════════════════════════════════════════════════════════
`);

// Uncomment to run tests
// testAdminAPIs();
// testParentAPIs();
// testEventsAPIs();
