-- ============================================
-- Phase 3: Row-Level Security (RLS) Policies
-- ============================================
-- This migration adds Row-Level Security to enforce 
-- tenant data isolation at the database level.

-- Enable RLS on tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policy: Organizations
-- Users can only see their own organization
-- ============================================
CREATE POLICY org_isolation_policy ON organizations
    FOR ALL
    USING (id = current_setting('app.current_organization_id', true));

-- ============================================
-- RLS Policy: Users
-- Users can only see users in their organization
-- ============================================
CREATE POLICY users_isolation_policy ON users
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true));

-- ============================================
-- RLS Policy: Courses
-- Users can only see courses in their organization
-- ============================================
CREATE POLICY courses_isolation_policy ON courses
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true));

-- ============================================
-- RLS Policy: Exams
-- Users can only see exams in their organization
-- ============================================
CREATE POLICY exams_isolation_policy ON exams
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', true));

-- ============================================
-- Grant privileges to application role
-- ============================================
-- Note: Adjust 'app_user' to your actual database role
-- GRANT ALL ON users, courses, exams, organizations TO app_user;

-- ============================================
-- IMPORTANT: Bypass RLS for superuser operations
-- The application should set the organization context before queries:
-- SET app.current_organization_id = 'org_xxx';
-- ============================================

-- Create helper function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(org_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_organization_id', org_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_organization_id', true);
END;
$$ LANGUAGE plpgsql STABLE;
