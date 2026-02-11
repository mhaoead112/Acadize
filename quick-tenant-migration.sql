-- STEP 1: Check what organizations exist
SELECT id, name, subdomain FROM organizations;

-- STEP 2: Check what type the plan column is
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'organizations' AND column_name = 'plan';

-- STEP 3: Insert default org (use correct plan type based on step 2)
-- If plan is VARCHAR, run this:
INSERT INTO organizations (id, name, subdomain, plan, is_active)
VALUES ('org_default', 'Default Organization', 'default', 'enterprise', true)
ON CONFLICT (id) DO NOTHING;

-- STEP 4: Insert test org
INSERT INTO organizations (id, name, subdomain, plan, is_active, primary_color)
VALUES ('org_test', 'Test Organization', 'test', 'pro', true, '#10b981')
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Verify orgs exist now
SELECT id, name, subdomain FROM organizations;

-- STEP 6: Update existing users to use org_default
UPDATE users SET organization_id = 'org_default' WHERE organization_id IS NULL;

-- STEP 7: Insert test users (only if org_test exists)
INSERT INTO users (id, email, username, full_name, password_hash, role, organization_id, is_active, email_verified)
VALUES 
    ('test_admin_001', 'admin@test.eduverse.io', 'test_admin', 'Test Admin', '$2b$10$DleQHs68.eWGaCQwbCpq/eiqQEaXF59Ra64yHBfPNdFNdDfmrYWiG', 'admin', 'org_test', true, true)
ON CONFLICT (id) DO UPDATE SET organization_id = 'org_test';

INSERT INTO users (id, email, username, full_name, password_hash, role, organization_id, is_active, email_verified)
VALUES 
    ('test_teacher_001', 'teacher@test.eduverse.io', 'test_teacher', 'Test Teacher', '$2b$10$DleQHs68.eWGaCQwbCpq/eiqQEaXF59Ra64yHBfPNdFNdDfmrYWiG', 'teacher', 'org_test', true, true)
ON CONFLICT (id) DO UPDATE SET organization_id = 'org_test';

INSERT INTO users (id, email, username, full_name, password_hash, role, organization_id, is_active, email_verified)
VALUES 
    ('test_student_001', 'student@test.eduverse.io', 'test_student', 'Test Student', '$2b$10$DleQHs68.eWGaCQwbCpq/eiqQEaXF59Ra64yHBfPNdFNdDfmrYWiG', 'student', 'org_test', true, true)
ON CONFLICT (id) DO UPDATE SET organization_id = 'org_test';

-- STEP 8: Verify
SELECT id, username, organization_id, role FROM users WHERE organization_id = 'org_test';
