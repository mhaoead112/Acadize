-- Migration: Fix enrollments table to use TEXT instead of UUID
-- Created: 2025-11-25

-- Drop the existing enrollments table if it exists
DROP TABLE IF EXISTS "enrollments" CASCADE;

-- Recreate enrollments table with correct TEXT types
CREATE TABLE "enrollments" (
    "id" TEXT PRIMARY KEY,
    "student_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "course_id" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "enrolled_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE("student_id", "course_id")
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "idx_enrollments_student" ON "enrollments"("student_id");
CREATE INDEX IF NOT EXISTS "idx_enrollments_course" ON "enrollments"("course_id");
