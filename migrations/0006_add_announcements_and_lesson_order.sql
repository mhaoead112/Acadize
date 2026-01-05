-- Migration: Add announcements table and order column to lessons table
-- Created: 2024

-- Add order column to lessons table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'order'
    ) THEN
        ALTER TABLE "lessons" ADD COLUMN "order" text DEFAULT '0';
    END IF;
END $$;

-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS "announcements" (
    "id" text PRIMARY KEY,
    "course_id" text NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
    "teacher_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_announcements_course_id" ON "announcements"("course_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_teacher_id" ON "announcements"("teacher_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_is_pinned" ON "announcements"("is_pinned");
CREATE INDEX IF NOT EXISTS "idx_lessons_order" ON "lessons"("order");
