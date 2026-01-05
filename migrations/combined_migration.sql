-- ============================================
-- EDUVERSE DATABASE - COMBINED MIGRATIONS
-- ============================================
-- 
-- This file combines all 18 database migrations in chronological order.
-- Use this for fresh database setup or deployment to Neon cloud database.
--
-- USAGE:
-- 1. For Neon database (cloud):
--    psql "YOUR_NEON_CONNECTION_STRING" < migrations/combined_migration.sql
--
-- 2. For local PostgreSQL:
--    psql -U postgres -d eduverse-dev < migrations/combined_migration.sql
--
-- 3. Using environment variable:
--    psql "$DATABASE_URL" < migrations/combined_migration.sql
--
-- PREREQUISITES:
-- - PostgreSQL 12+ or Neon database instance
-- - Empty database (or will overwrite existing schema)
-- - Required extensions: none (all types are created in this migration)
--
-- CONTENTS:
-- - User authentication and roles
-- - Courses, lessons, and enrollments
-- - Assignments, submissions, and grades
-- - Events and attendance tracking
-- - Study groups and messaging system
-- - Notifications and user presence
-- - Parent portal and calendar
-- - Push notification subscriptions
--
-- Total migrations: 18
-- Generated: 2025-01-24
-- Last updated: 2025-01-24
-- ============================================

-- ============================================
-- Migration: 0000_worried_blue_shield.sql
-- ============================================

DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);


-- ============================================
-- Migration: 0001_curly_darwin.sql
-- ============================================

CREATE TABLE IF NOT EXISTS "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"teacher_id" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);


-- ============================================
-- Migration: 0002_glamorous_wasp.sql
-- ============================================

ALTER TABLE "courses" ADD COLUMN "title" text NOT NULL;


-- ============================================
-- Migration: 0003_fix_users_schema.sql
-- ============================================

-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN "username" varchar(255) UNIQUE;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_role" "public"."user_role";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp;
--> statement-breakpoint
-- Populate username and full_name from existing data
UPDATE "users" SET "username" = LOWER("email") WHERE "username" IS NULL;
--> statement-breakpoint
UPDATE "users" SET "full_name" = "name" WHERE "full_name" IS NULL;
--> statement-breakpoint
-- Make username and full_name NOT NULL after populating
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;


-- ============================================
-- Migration: 0004_add_lessons_table.sql
-- ============================================

CREATE TABLE IF NOT EXISTS "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;


-- ============================================
-- Migration: 0005_add_assignment_type.sql
-- ============================================

-- Add type column to assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework' NOT NULL;

-- Update existing assignments to have a type
UPDATE assignments 
SET type = 'homework' 
WHERE type IS NULL;


-- ============================================
-- Migration: 0005_add_assignments_submissions_grades.sql
-- ============================================

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


-- ============================================
-- Migration: 0005_add_events_tables.sql
-- ============================================

-- Add event type enum
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('assignment', 'exam', 'class', 'event', 'deadline', 'meeting');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  meeting_link TEXT,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true NOT NULL,
  max_participants TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create event participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' NOT NULL,
  registered_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_course_id ON events(course_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);


-- ============================================
-- Migration: 0005_add_phone_bio_to_users.sql
-- ============================================

-- Migration: Add phone and bio fields to users table
-- Created: 2025-01-24

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;


-- ============================================
-- Migration: 0005_add_study_streaks.sql
-- ============================================

-- Add study activity tracking table
CREATE TABLE IF NOT EXISTS "study_activity" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_date" timestamp NOT NULL,
  "activity_type" text NOT NULL,
  "duration_minutes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add study streaks table
CREATE TABLE IF NOT EXISTS "study_streaks" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "current_streak" text DEFAULT '0' NOT NULL,
  "longest_streak" text DEFAULT '0' NOT NULL,
  "last_activity_date" timestamp,
  "total_active_days" text DEFAULT '0' NOT NULL,
  "weekly_goal_hours" text DEFAULT '10' NOT NULL,
  "current_week_hours" text DEFAULT '0' NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_study_activity_user_date" ON "study_activity"("user_id", "activity_date");
CREATE INDEX IF NOT EXISTS "idx_study_streaks_user" ON "study_streaks"("user_id");


-- ============================================
-- Migration: 0006_add_announcements_and_lesson_order.sql
-- ============================================

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


-- ============================================
-- Migration: 0006_add_profile_picture.sql
-- ============================================

-- Add profile_picture column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add grade column to users table (for students)
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR(50);


-- ============================================
-- Migration: 0007_fix_enrollments_table.sql
-- ============================================

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


-- ============================================
-- Migration: 0008_add_study_groups_messaging.sql
-- ============================================

-- Create message type enum
DO $$ BEGIN
  CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create conversation type enum
DO $$ BEGIN
  CREATE TYPE conversation_type AS ENUM ('group', 'direct');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create study groups table
CREATE TABLE IF NOT EXISTS study_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create group members table
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(group_id, user_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type conversation_type NOT NULL,
  group_id TEXT REFERENCES study_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_read_at TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type message_type DEFAULT 'text' NOT NULL,
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  file_type TEXT,
  is_edited BOOLEAN DEFAULT false NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_group ON conversations(group_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);


-- ============================================
-- Migration: 0009_add_read_receipts_presence_moderation.sql
-- ============================================

-- Add deliveredAt to messages
ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMP;

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user ON message_read_receipts(user_id);

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' NOT NULL,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_presence_status ON user_presence(status);

-- Add moderation fields to group_members
ALTER TABLE group_members ADD COLUMN is_muted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE group_members ADD COLUMN is_restricted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE group_members ADD COLUMN muted_until TIMESTAMP;

-- Add auto_generated to study_groups
ALTER TABLE study_groups ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX idx_study_groups_auto_generated ON study_groups(auto_generated);
CREATE INDEX idx_study_groups_course ON study_groups(course_id);


-- ============================================
-- Migration: 0010_add_notifications_blocks_avatar.sql
-- ============================================

-- Add avatar_url to study_groups (if not exists)
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_message', 'mention', 'group_invite', 'dm_request'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES study_groups(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_user_id);

-- Create reported_users table
CREATE TABLE IF NOT EXISTS reported_users (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  context TEXT,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'reviewed', 'resolved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_reported_users_reporter ON reported_users(reporter_id);
CREATE INDEX idx_reported_users_reported ON reported_users(reported_user_id);
CREATE INDEX idx_reported_users_status ON reported_users(status);

-- Add metadata to conversations for DM names
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS avatar_url TEXT;


-- ============================================
-- Migration: 0011_add_parent_events_attendance.sql
-- ============================================

-- Add parent_children linking table
CREATE TABLE IF NOT EXISTS parent_children (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(parent_id, child_id)
);

-- Add events table for calendar
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'class', 'meeting', 'holiday', 'exam', 'announcement'
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_all_day BOOLEAN DEFAULT FALSE NOT NULL,
  recurrence TEXT, -- 'none', 'daily', 'weekly', 'monthly'
  color TEXT, -- Hex color for calendar display
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add event_participants table for tracking who's invited
CREATE TABLE IF NOT EXISTS event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Add attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL, -- 'present', 'absent', 'tardy', 'excused'
  notes TEXT,
  marked_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(student_id, course_id, date)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parent_children_parent ON parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child ON parent_children(child_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_course ON events(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);


-- ============================================
-- Migration: add_push_subscriptions.sql
-- ============================================

-- Create Push Subscriptions Table for Web Push Notifications
-- Run this migration to enable push notifications for all users

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Create index for faster lookups by active status
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Create unique constraint to prevent duplicate subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);


