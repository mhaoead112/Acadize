const API_URL = 'http://127.0.0.1:3001/api';
const AUTH_URL = 'http://127.0.0.1:3001/api/auth';
const TEST_EMAIL_DEFAULT = `user_default_${Date.now()}@example.com`;
const TEST_EMAIL_TEST = `user_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Password123!';

async function verifyStrictIsolation() {
  console.log('--- Starting Strict Tenant Isolation Verification ---');

  try {
    // 1. Register UserDefault on "default" tenant
    console.log('\n[1] Registering UserDefault on "default" tenant...');
    const regDefaultRes = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'default' },
      body: JSON.stringify({ email: TEST_EMAIL_DEFAULT, password: TEST_PASSWORD, name: 'Default User', role: 'student' })
    });
    if (!regDefaultRes.ok && regDefaultRes.status !== 409) {
      console.error('Registration failed:', await regDefaultRes.text());
      return;
    }
    console.log('UserDefault registered.');

    // 2. Login UserDefault -> TokenDefault
    console.log('\n[2] Logging in UserDefault...');
    const loginDefaultRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'default' },
      body: JSON.stringify({ email: TEST_EMAIL_DEFAULT, password: TEST_PASSWORD })
    });
    const loginDefaultData = await loginDefaultRes.json();
    if (!loginDefaultRes.ok) {
      console.error('Login failed:', loginDefaultData);
      return;
    }
    const tokenDefault = loginDefaultData.accessToken;
    const userIdDefault = loginDefaultData.user.id;
    console.log('UserDefault logged in. ID:', userIdDefault);

    // 3. Register UserTest on "test" tenant
    console.log('\n[3] Registering UserTest on "test" tenant...');
    const regTestRes = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'test' },
      body: JSON.stringify({ email: TEST_EMAIL_TEST, password: TEST_PASSWORD, name: 'Test User', role: 'student' })
    });
    if (!regTestRes.ok && regTestRes.status !== 409) {
      console.error('Registration failed:', await regTestRes.text());
    } else {
      console.log('UserTest registered.');
    }

    // 4. Test Middleware Firewall: Access "test" tenant endpoint with "default" token
    console.log('\n[4] Testing Middleware Firewall (Cross-Tenant Access)...');
    console.log('Attempting GET /api/users/me on "test" subdomain with "default" token');
    const firewallRes = await fetch(`${API_URL}/users/me`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${tokenDefault}`,
        'X-Tenant-Subdomain': 'test' 
      }
    });
    console.log(`Status: ${firewallRes.status} (Expected 403)`);
    if (firewallRes.status === 403) {
      console.log('✅ Firewall blocked cross-tenant access successfully.');
    } else {
      console.error('❌ Firewall FAILED! Status:', firewallRes.status);
    }

    // 5. Test Data Scoping: Search for UserTest from "default" tenant
    console.log('\n[5] Testing Data Scoping (Cross-Tenant Search)...');
    console.log('Attempting to search for "Test User" from "default" tenant');
    const searchRes = await fetch(`${API_URL}/conversations/search?query=Test`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${tokenDefault}`,
        'X-Tenant-Subdomain': 'default' 
      }
    });
    const searchData = await searchRes.json();
    console.log('Search Results:', searchData);
    
    const foundUserTest = Array.isArray(searchData) && searchData.some(u => u.email === TEST_EMAIL_TEST); // conversations search might not return email, only username/fullname
    // But we know UserTest full name is "Test User".
    const foundTestUserByName = Array.isArray(searchData) && searchData.some(u => u.fullName === 'Test User');

    if (!foundTestUserByName) {
      console.log('✅ Search correctly scoped (did not find Test User from other tenant).');
    } else {
      console.error('❌ Data Leak! Found user from other tenant in search results.');
    }

    // 6. Test Data Scoping: List all users
    console.log('\n[6] Testing Data Scoping (List Users)...');
    const listUsersRes = await fetch(`${API_URL}/users`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${tokenDefault}`,
        'X-Tenant-Subdomain': 'default' 
      }
    });
    const listUsersData = await listUsersRes.json();
    const foundTestUserInList = Array.isArray(listUsersData) && listUsersData.some(u => u.email === TEST_EMAIL_TEST);
    
    if (!foundTestUserInList) {
      console.log('✅ List Users correctly scoped (did not find Test User).');
    } else {
       console.error('❌ Data Leak! Found user from other tenant in user list.');
    }

    // 7. Test Cross-Tenant User Lookup by ID
    // We need UserTest's ID. Login as UserTest to get it.
    console.log('\n[7] Getting UserTest ID for specific lookup test...');
    const loginTestRes = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'test' },
      body: JSON.stringify({ email: TEST_EMAIL_TEST, password: TEST_PASSWORD })
    });
    const loginTestData = await loginTestRes.json();
    const userIdTest = loginTestData.user.id;
    
    console.log(`Attempting GET /api/users/${userIdTest} from "default" tenant`);
    const lookupRes = await fetch(`${API_URL}/users/${userIdTest}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${tokenDefault}`,
        'X-Tenant-Subdomain': 'default' 
      }
    });
    console.log(`Status: ${lookupRes.status} (Expected 404)`);
    
    if (lookupRes.status === 404) {
      console.log('✅ Direct user lookup scoped correctly (returned 404).');
    } else {
      console.error('❌ Data Leak! Could lookup user from other tenant by ID.');
    }

  } catch (error) {
    console.error('Verification Error:', error);
  }
}

verifyStrictIsolation();
