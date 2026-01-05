-- Migration: Add assignments, submissions, and grades tables
-- Created: 2025-11-22

-- Create assignments table
CREATE TABLE IF NOT EXISTS "assignments" (
    "id" TEXT PRIMARY KEY,
    "course_id" TEXT NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "lesson_id" TEXT REFERENCES "lessons"("id") ON DELETE SET NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP,
    "max_score" TEXT DEFAULT '100',
    "is_published" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS "submissions" (
    "id" TEXT PRIMARY KEY,
    "assignment_id" TEXT NOT NULL REFERENCES "assignments"("id") ON DELETE CASCADE,
    "student_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" TEXT,
    "file_path" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" TEXT,
    "submitted_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "status" TEXT DEFAULT 'submitted' NOT NULL,
    UNIQUE("assignment_id", "student_id")
);

-- Create grades table
CREATE TABLE IF NOT EXISTS "grades" (
    "id" TEXT PRIMARY KEY,
    "submission_id" TEXT NOT NULL REFERENCES "submissions"("id") ON DELETE CASCADE UNIQUE,
    "score" TEXT NOT NULL,
    "max_score" TEXT DEFAULT '100',
    "feedback" TEXT,
    "graded_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "graded_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_assignments_course" ON "assignments"("course_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_lesson" ON "assignments"("lesson_id");
CREATE INDEX IF NOT EXISTS "idx_submissions_assignment" ON "submissions"("assignment_id");
CREATE INDEX IF NOT EXISTS "idx_submissions_student" ON "submissions"("student_id");
CREATE INDEX IF NOT EXISTS "idx_grades_submission" ON "grades"("submission_id");
