const API_URL = 'http://127.0.0.1:3001/api/auth';
const TEST_EMAIL = `verify_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Password123!';

async function test() {
  console.log('--- Starting Tenant Auth Verification ---');
  console.log('Testing User:', TEST_EMAIL);

  try {
      // 1. Register User in Default Tenant
      console.log('\n[1] Registering user in DEFAULT tenant...');
      const regRes = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'default' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User', role: 'student' })
      });
      const regData = await regRes.json();
      console.log(`Status: ${regRes.status} (Expected 201)`);
      if (!regRes.ok) {
        console.error('Registration failed:', regData);
        // If user already exists, try to continue with login
        if (regRes.status !== 409) return;
      }

      // 2. Login in Default Tenant (Should Succeed)
      console.log('\n[2] Logging in user in DEFAULT tenant...');
      const loginDefaultRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'default' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
      });
      console.log(`Status: ${loginDefaultRes.status} (Expected 200)`);
      const loginDefaultData = await loginDefaultRes.json();
      
      let refreshToken = null;
      if (loginDefaultRes.ok) {
          console.log('✅ Login successful in correct tenant');
          refreshToken = loginDefaultData.refreshToken;
      } else {
          console.error('❌ Login failed in correct tenant:', loginDefaultData);
          return;
      }

      // 3. Login in Test Tenant (Should Fail)
      console.log('\n[3] Logging in user in TEST tenant (Cross-Tenant)...');
      const loginTestRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'test' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
      });
      console.log(`Status: ${loginTestRes.status} (Expected 401)`);
      const loginTestData = await loginTestRes.json();
      
      if (!loginTestRes.ok) {
          console.log('✅ Cross-tenant login rejected as expected:', loginTestData.message);
      } else {
          console.error('❌ Cross-tenant login unexpectedly succeeded!');
      }

      // 4. Token Refresh Cross-Tenant Check
      if (refreshToken) {
         console.log('\n[4] Testing Token Refresh Cross-Tenant...');
         const refreshRes = await fetch(`${API_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': 'test' },
            body: JSON.stringify({ refreshToken })
         });
         console.log(`Status: ${refreshRes.status} (Expected 403)`);
         const refreshData = await refreshRes.json();
         
         if (refreshRes.status === 403) {
             console.log('✅ Cross-tenant refresh rejected as expected:', refreshData.message);
         } else {
             console.error('❌ Cross-tenant refresh unexpectedly allowed!', refreshData);
         }
      }

  } catch (error) {
      console.error('Test execution error:', error);
  }
}

test();
