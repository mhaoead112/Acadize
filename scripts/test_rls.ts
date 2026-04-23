import { pool } from '../server/src/db/index.js';

async function testRLS() {
    try {
        console.log('Setting up non-superuser for testing...');
        // Drop if exists (catch error if doesn't)
        await pool.query("DO $$ BEGIN IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_rls_user') THEN DROP OWNED BY test_rls_user; DROP ROLE test_rls_user; END IF; END $$;");
        await pool.query("CREATE ROLE test_rls_user WITH LOGIN PASSWORD 'VeryStrongPassword123!@#'");
        
        // Grant permissions
        await pool.query("GRANT USAGE ON SCHEMA public TO test_rls_user");
        await pool.query("GRANT SELECT ON ALL TABLES IN SCHEMA public TO test_rls_user");
        await pool.query("GRANT test_rls_user TO current_user");

        console.log('Testing with superuser context (should bypass RLS and return 34+)...');
        const superRes = await pool.query('SELECT count(*) FROM users');
        console.log(`Superuser Count: ${superRes.rows[0].count}`);

        console.log('Testing with non-superuser context (no session setting - should return 0)...');
        const client = await pool.connect();
        await client.query("SET ROLE test_rls_user");
        const res1 = await client.query('SELECT count(*) FROM users');
        console.log(`Non-Superuser Unset Count: ${res1.rows[0].count}`);

        console.log('Testing with non-superuser context (with valid session setting)...');
        // Let's get a random organization ID to guarantee a match
        await client.query("RESET ROLE");
        const orgQuery = await pool.query('SELECT id FROM organizations LIMIT 1');
        const validOrgId = orgQuery.rows[0]?.id || "non-existent-guid";
        
        await client.query("SET ROLE test_rls_user");
        await client.query(`SET LOCAL app.current_tenant_id = '${validOrgId}'`);
        const res2 = await client.query('SELECT count(*) FROM users');
        console.log(`Non-Superuser Configured Count: ${res2.rows[0].count}`);
        
        await client.query("RESET ROLE");
        client.release();
        
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
testRLS();
