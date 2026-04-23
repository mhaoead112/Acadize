-- Clean up any previous attempts
DROP POLICY IF EXISTS users_isolation_policy ON "users";
DROP POLICY IF EXISTS courses_isolation_policy ON "courses";
DROP POLICY IF EXISTS exams_isolation_policy ON "exams";
DROP POLICY IF EXISTS assignments_isolation_policy ON "assignments";
DROP POLICY IF EXISTS submissions_isolation_policy ON "submissions";
DROP POLICY IF EXISTS grades_isolation_policy ON "grades";

-- Enable RLS and FORCE it even for table owners

-- Users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_users ON "users";
CREATE POLICY tenant_isolation_users ON "users"
    FOR ALL
    USING ("organization_id" = current_setting('app.current_tenant_id', true));

-- Courses table
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_courses ON "courses";
CREATE POLICY tenant_isolation_courses ON "courses"
    FOR ALL
    USING ("organization_id" = current_setting('app.current_tenant_id', true));

-- Exams table
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exams" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_exams ON "exams";
CREATE POLICY tenant_isolation_exams ON "exams"
    FOR ALL
    USING ("organization_id" = current_setting('app.current_tenant_id', true));

-- Assignments table
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_assignments ON "assignments";
CREATE POLICY tenant_isolation_assignments ON "assignments"
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM "courses" c 
        WHERE c.id = "assignments".course_id 
        AND c.organization_id = current_setting('app.current_tenant_id', true)
    ));

-- Submissions table
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submissions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_submissions ON "submissions";
CREATE POLICY tenant_isolation_submissions ON "submissions"
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM "users" u 
        WHERE u.id = "submissions".student_id 
        AND u.organization_id = current_setting('app.current_tenant_id', true)
    ));

-- Grades table
ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grades" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_grades ON "grades";
CREATE POLICY tenant_isolation_grades ON "grades"
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM "submissions" s 
        JOIN "users" u ON u.id = s.student_id
        WHERE s.id = "grades".submission_id 
        AND u.organization_id = current_setting('app.current_tenant_id', true)
    ));
