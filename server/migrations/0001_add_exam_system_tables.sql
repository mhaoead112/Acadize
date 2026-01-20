-- Migration: Add Exam System Tables (Anti-Cheat, Risk Scoring, Mistakes, Retakes)
-- Created: 2026-01-07
-- Description: Adds comprehensive exam monitoring, anti-cheat tracking, mistake pool, and retake exam functionality

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
 CREATE TYPE "public"."exam_status" AS ENUM('draft', 'scheduled', 'active', 'completed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'code', 'matching', 'fill_blank');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted', 'graded', 'flagged', 'under_review', 'invalidated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."anti_cheat_event_type" AS ENUM(
   'tab_switch', 'window_blur', 'copy_paste', 'right_click', 'keyboard_shortcut',
   'devtools_open', 'fullscreen_exit', 'multiple_monitors',
   'face_not_detected', 'multiple_faces', 'no_face_visible',
   'unauthorized_app', 'suspicious_pattern', 'rapid_answers',
   'unusual_timing', 'browser_extension_detected', 'screen_share_detected'
 );
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."event_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."review_status" AS ENUM('pending', 'under_review', 'cleared', 'violation_confirmed', 'escalated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."mistake_type" AS ENUM('wrong_answer', 'partial_credit', 'timeout', 'skipped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."remediation_status" AS ENUM('not_started', 'in_progress', 'completed', 'skipped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."retake_status" AS ENUM('pending', 'available', 'in_progress', 'completed', 'expired', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES
-- ============================================

-- --- EXAMS ---
CREATE TABLE IF NOT EXISTS "exams" (
  "id" text PRIMARY KEY,
  "title" varchar(500) NOT NULL,
  "description" text,
  "course_id" text NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "created_by" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  
  -- Status & Scheduling
  "status" exam_status DEFAULT 'draft' NOT NULL,
  "scheduled_start" timestamp,
  "scheduled_end" timestamp,
  "duration" integer NOT NULL, -- minutes
  
  -- Configuration
  "passing_score" integer DEFAULT 70 NOT NULL,
  "total_points" integer DEFAULT 100 NOT NULL,
  "shuffle_questions" boolean DEFAULT true NOT NULL,
  "shuffle_options" boolean DEFAULT true NOT NULL,
  "show_results_immediately" boolean DEFAULT false NOT NULL,
  "allow_review" boolean DEFAULT true NOT NULL,
  
  -- Anti-Cheat Settings
  "anti_cheat_enabled" boolean DEFAULT true NOT NULL,
  "require_webcam" boolean DEFAULT false NOT NULL,
  "require_screen_share" boolean DEFAULT false NOT NULL,
  "require_fullscreen" boolean DEFAULT true NOT NULL,
  "lock_browser" boolean DEFAULT false NOT NULL,
  "allow_backtracking" boolean DEFAULT false NOT NULL,
  
  -- Access Control
  "access_code" varchar(50),
  "ip_whitelist" jsonb, -- array of allowed IPs
  "max_attempts" integer DEFAULT 1 NOT NULL,
  
  -- Metadata
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "exam_course_idx" ON "exams"("course_id");
CREATE INDEX IF NOT EXISTS "exam_status_idx" ON "exams"("status");
CREATE INDEX IF NOT EXISTS "exam_schedule_idx" ON "exams"("scheduled_start", "scheduled_end");
--> statement-breakpoint

-- --- EXAM QUESTIONS ---
CREATE TABLE IF NOT EXISTS "exam_questions" (
  "id" text PRIMARY KEY,
  "exam_id" text NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  
  -- Question Content
  "question_text" text NOT NULL,
  "question_type" question_type NOT NULL,
  "options" jsonb, -- for multiple choice, matching, etc.
  "correct_answer" jsonb NOT NULL,
  
  -- Metadata
  "points" integer DEFAULT 1 NOT NULL,
  "order" integer NOT NULL,
  "topic" varchar(255),
  "subtopic" varchar(255),
  "skill_tag" varchar(255),
  "difficulty_level" varchar(50), -- 'easy', 'medium', 'hard'
  
  -- Additional Resources
  "explanation" text, -- shown after grading
  "hint" text,
  "reference_material" jsonb, -- links to lessons/resources
  
  -- Time Limits
  "time_limit" integer, -- seconds per question
  
  -- Metadata
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "exam_question_exam_idx" ON "exam_questions"("exam_id");
CREATE INDEX IF NOT EXISTS "exam_question_topic_idx" ON "exam_questions"("topic");
CREATE INDEX IF NOT EXISTS "exam_question_difficulty_idx" ON "exam_questions"("difficulty_level");
--> statement-breakpoint

-- --- EXAM ATTEMPTS ---
CREATE TABLE IF NOT EXISTS "exam_attempts" (
  "id" text PRIMARY KEY,
  "exam_id" text NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  
  -- Attempt Info
  "attempt_number" integer DEFAULT 1 NOT NULL,
  "status" attempt_status DEFAULT 'in_progress' NOT NULL,
  
  -- Timing
  "started_at" timestamp DEFAULT now() NOT NULL,
  "submitted_at" timestamp,
  "duration_seconds" integer, -- actual time taken
  
  -- Scoring
  "score" real DEFAULT 0,
  "max_score" integer DEFAULT 100 NOT NULL,
  "percentage" real DEFAULT 0,
  "passed" boolean,
  
  -- Review & Grading
  "graded_at" timestamp,
  "graded_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "auto_graded" boolean DEFAULT false NOT NULL,
  
  -- Anti-Cheat Context
  "device_fingerprint" varchar(255),
  "ip_address" varchar(45),
  "user_agent" text,
  "browser_info" jsonb,
  "location_data" jsonb,
  
  -- Recording URLs
  "webcam_recording_url" text,
  "screen_recording_url" text,
  
  -- Flags
  "flagged_for_review" boolean DEFAULT false NOT NULL,
  "integrity_score" real, -- 0-100, higher = more trustworthy
  
  -- Retake Metadata
  "is_retake" boolean DEFAULT false NOT NULL,
  "original_attempt_id" text REFERENCES "exam_attempts"("id") ON DELETE SET NULL,
  "retake_reason" text,
  
  -- Metadata
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "exam_attempt_exam_idx" ON "exam_attempts"("exam_id");
CREATE INDEX IF NOT EXISTS "exam_attempt_student_idx" ON "exam_attempts"("student_id");
CREATE INDEX IF NOT EXISTS "exam_attempt_status_idx" ON "exam_attempts"("status");
CREATE INDEX IF NOT EXISTS "exam_attempt_flagged_idx" ON "exam_attempts"("flagged_for_review");
CREATE INDEX IF NOT EXISTS "exam_attempt_retake_idx" ON "exam_attempts"("is_retake", "original_attempt_id");
--> statement-breakpoint

-- --- EXAM ANSWERS ---
CREATE TABLE IF NOT EXISTS "exam_answers" (
  "id" text PRIMARY KEY,
  "attempt_id" text NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "exam_questions"("id") ON DELETE CASCADE,
  
  -- Answer Content
  "answer" jsonb NOT NULL,
  "is_correct" boolean,
  "points_awarded" real DEFAULT 0,
  "points_possible" integer DEFAULT 1 NOT NULL,
  
  -- Timing
  "time_spent_seconds" integer, -- time on this question
  "answered_at" timestamp DEFAULT now() NOT NULL,
  
  -- Review
  "feedback" text, -- grader feedback
  "flagged" boolean DEFAULT false NOT NULL,
  
  -- AI Scoring (for essays/code)
  "ai_score" real,
  "ai_feedback" text,
  "manually_reviewed" boolean DEFAULT false NOT NULL,
  
  -- Metadata
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  
  UNIQUE("attempt_id", "question_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "exam_answer_attempt_idx" ON "exam_answers"("attempt_id");
CREATE INDEX IF NOT EXISTS "exam_answer_question_idx" ON "exam_answers"("question_id");
CREATE INDEX IF NOT EXISTS "exam_answer_correctness_idx" ON "exam_answers"("is_correct");
--> statement-breakpoint

-- --- ANTI-CHEAT EVENTS ---
CREATE TABLE IF NOT EXISTS "anti_cheat_events" (
  "id" text PRIMARY KEY,
  "attempt_id" text NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  
  -- Event Classification
  "event_type" anti_cheat_event_type NOT NULL,
  "severity" event_severity NOT NULL,
  
  -- Event Details
  "description" text,
  "metadata" jsonb,
  
  -- Detection Info
  "detected_by" varchar(100), -- 'browser_monitor', 'ai_model', 'proctor'
  "ai_confidence" real, -- 0-1 for AI-detected events
  
  -- Context
  "timestamp" timestamp DEFAULT now() NOT NULL,
  "question_id" text REFERENCES "exam_questions"("id") ON DELETE SET NULL,
  
  -- Device/Browser Info
  "device_info" jsonb,
  "screenshot_url" text,
  "video_timestamp" integer, -- second in recording where event occurred
  
  -- Review Status
  "review_status" review_status DEFAULT 'pending' NOT NULL,
  "reviewed_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp,
  "review_notes" text,
  
  -- Metadata
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "anti_cheat_event_attempt_idx" ON "anti_cheat_events"("attempt_id");
CREATE INDEX IF NOT EXISTS "anti_cheat_event_type_idx" ON "anti_cheat_events"("event_type");
CREATE INDEX IF NOT EXISTS "anti_cheat_event_severity_idx" ON "anti_cheat_events"("severity");
CREATE INDEX IF NOT EXISTS "anti_cheat_event_timestamp_idx" ON "anti_cheat_events"("timestamp");
CREATE INDEX IF NOT EXISTS "anti_cheat_event_review_status_idx" ON "anti_cheat_events"("review_status");
--> statement-breakpoint

-- --- ANTI-CHEAT RISK SCORES ---
CREATE TABLE IF NOT EXISTS "anti_cheat_risk_scores" (
  "id" text PRIMARY KEY,
  "attempt_id" text NOT NULL UNIQUE REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  
  -- Overall Risk Assessment
  "overall_risk_score" real DEFAULT 0 NOT NULL, -- 0-100
  "risk_level" varchar(50), -- 'low', 'medium', 'high', 'critical'
  
  -- Category Scores (0-100 each)
  "behavior_score" real DEFAULT 0,
  "timing_score" real DEFAULT 0,
  "device_score" real DEFAULT 0,
  "biometric_score" real DEFAULT 0,
  "pattern_score" real DEFAULT 0,
  
  -- Event Counts by Severity
  "low_severity_count" integer DEFAULT 0,
  "medium_severity_count" integer DEFAULT 0,
  "high_severity_count" integer DEFAULT 0,
  "critical_severity_count" integer DEFAULT 0,
  
  -- Specific Violation Counts
  "tab_switch_count" integer DEFAULT 0,
  "copy_paste_count" integer DEFAULT 0,
  "fullscreen_exit_count" integer DEFAULT 0,
  "face_detection_issues" integer DEFAULT 0,
  
  -- Review Decision
  "requires_manual_review" boolean DEFAULT false NOT NULL,
  "review_priority" integer DEFAULT 0, -- 0-10, higher = more urgent
  
  -- Final Verdict
  "final_verdict" varchar(50), -- 'cleared', 'warning', 'violation', 'invalidated'
  "verdict_reason" text,
  "decided_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "decided_at" timestamp,
  
  -- ML Model Info
  "model_version" varchar(50),
  "model_prediction" jsonb,
  
  -- Metadata
  "calculated_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "anti_cheat_risk_score_attempt_idx" ON "anti_cheat_risk_scores"("attempt_id");
CREATE INDEX IF NOT EXISTS "anti_cheat_risk_score_risk_level_idx" ON "anti_cheat_risk_scores"("risk_level");
CREATE INDEX IF NOT EXISTS "anti_cheat_risk_score_review_idx" ON "anti_cheat_risk_scores"("requires_manual_review", "review_priority");
--> statement-breakpoint

-- --- MISTAKE RETAKE EXAMS (Created before mistake_pool to satisfy FK dependency) ---
CREATE TABLE IF NOT EXISTS "mistake_retake_exams" (
  "id" text PRIMARY KEY,
  "original_exam_id" text NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "original_attempt_id" text NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  
  -- Retake Info
  "title" varchar(500) NOT NULL,
  "description" text,
  "status" retake_status DEFAULT 'pending' NOT NULL,
  
  -- Scheduling
  "available_from" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "duration" integer NOT NULL, -- minutes
  
  -- Question Selection Strategy
  "adaptive_strategy" jsonb NOT NULL,
  "total_questions" integer NOT NULL,
  "total_points" integer NOT NULL,
  
  -- Mistake Pattern Targeting
  "target_topics" jsonb NOT NULL, -- array of topics
  "target_skills" jsonb, -- array of skills
  "mistake_ids" jsonb NOT NULL, -- array of mistake pool ids
  
  -- Difficulty Adjustment
  "adjusted_difficulty" boolean DEFAULT true NOT NULL,
  "difficulty_modifier" real DEFAULT 1.0, -- 0.8 = easier, 1.2 = harder
  
  -- Completion
  "completed_at" timestamp,
  "attempt_id" text REFERENCES "exam_attempts"("id") ON DELETE SET NULL,
  "score" real,
  "passed" boolean,
  "improvement_percentage" real, -- vs original attempt
  
  -- Notifications
  "student_notified" boolean DEFAULT false NOT NULL,
  "notified_at" timestamp,
  "reminder_sent_at" timestamp,
  
  -- Metadata
  "generated_at" timestamp DEFAULT now() NOT NULL,
  "generated_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "mistake_retake_exam_student_idx" ON "mistake_retake_exams"("student_id");
CREATE INDEX IF NOT EXISTS "mistake_retake_exam_original_idx" ON "mistake_retake_exams"("original_exam_id");
CREATE INDEX IF NOT EXISTS "mistake_retake_exam_status_idx" ON "mistake_retake_exams"("status");
CREATE INDEX IF NOT EXISTS "mistake_retake_exam_availability_idx" ON "mistake_retake_exams"("available_from", "expires_at");
CREATE INDEX IF NOT EXISTS "mistake_retake_exam_notification_idx" ON "mistake_retake_exams"("student_notified", "status");
--> statement-breakpoint

-- --- MISTAKE POOL ---
CREATE TABLE IF NOT EXISTS "mistake_pool" (
  "id" text PRIMARY KEY,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "attempt_id" text NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "answer_id" text NOT NULL REFERENCES "exam_answers"("id") ON DELETE CASCADE,
  "question_id" text NOT NULL REFERENCES "exam_questions"("id") ON DELETE CASCADE,
  "exam_id" text NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  
  -- Mistake Classification
  "mistake_type" mistake_type NOT NULL,
  
  -- Question Metadata (denormalized for analytics)
  "topic" varchar(255),
  "subtopic" varchar(255),
  "skill_tag" varchar(255),
  "difficulty_level" varchar(50),
  
  -- Student's Response
  "student_answer" jsonb,
  "correct_answer" jsonb,
  
  -- Scoring
  "points_lost" real NOT NULL,
  "points_possible" integer NOT NULL,
  
  -- Timing
  "occurred_at" timestamp NOT NULL,
  
  -- Remediation Tracking
  "remediation_status" remediation_status DEFAULT 'not_started' NOT NULL,
  "remediation_started_at" timestamp,
  "remediation_completed_at" timestamp,
  "resources_viewed" jsonb, -- array of lesson/resource ids
  
  -- Retake Tracking
  "included_in_retake" boolean DEFAULT false NOT NULL,
  "retake_exam_id" text REFERENCES "mistake_retake_exams"("id") ON DELETE SET NULL,
  "corrected_in_retake" boolean, -- null until retake completed
  "retake_attempt_id" text REFERENCES "exam_attempts"("id") ON DELETE SET NULL,
  
  -- Pattern Analysis
  "is_repeated_mistake" boolean DEFAULT false NOT NULL,
  "repetition_count" integer DEFAULT 1,
  
  -- Metadata
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "mistake_pool_student_idx" ON "mistake_pool"("student_id");
CREATE INDEX IF NOT EXISTS "mistake_pool_attempt_idx" ON "mistake_pool"("attempt_id");
CREATE INDEX IF NOT EXISTS "mistake_pool_topic_idx" ON "mistake_pool"("topic");
CREATE INDEX IF NOT EXISTS "mistake_pool_skill_idx" ON "mistake_pool"("skill_tag");
CREATE INDEX IF NOT EXISTS "mistake_pool_remediation_idx" ON "mistake_pool"("remediation_status");
CREATE INDEX IF NOT EXISTS "mistake_pool_retake_idx" ON "mistake_pool"("included_in_retake", "retake_exam_id");
CREATE INDEX IF NOT EXISTS "mistake_pool_pattern_idx" ON "mistake_pool"("student_id", "topic", "is_repeated_mistake");
--> statement-breakpoint

-- --- MASTERY ANALYTICS ---
CREATE TABLE IF NOT EXISTS "mastery_analytics" (
  "id" text PRIMARY KEY,
  "student_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "course_id" text REFERENCES "courses"("id") ON DELETE CASCADE,
  "exam_id" text REFERENCES "exams"("id") ON DELETE CASCADE,
  
  -- Topic/Skill Tracking
  "topic" varchar(255) NOT NULL,
  "subtopic" varchar(255),
  "skill_tag" varchar(255),
  
  -- Performance Metrics
  "total_questions_attempted" integer DEFAULT 0 NOT NULL,
  "correct_answers" integer DEFAULT 0 NOT NULL,
  "incorrect_answers" integer DEFAULT 0 NOT NULL,
  "mastery_percentage" real DEFAULT 0 NOT NULL,
  "mastery_level" varchar(50), -- 'beginner', 'developing', 'proficient', 'mastered'
  
  -- Progress Tracking
  "first_attempt_date" timestamp,
  "last_attempt_date" timestamp,
  "total_attempts" integer DEFAULT 0 NOT NULL,
  "consecutive_correct" integer DEFAULT 0,
  "improvement_rate" real DEFAULT 0, -- percentage points per week
  
  -- Retake Impact
  "retakes_completed" integer DEFAULT 0,
  "improvement_from_retakes" real DEFAULT 0, -- percentage points gained
  
  -- Time Analytics
  "average_time_per_question" real, -- seconds
  "total_time_spent" integer DEFAULT 0, -- seconds
  
  -- Prediction & Recommendations
  "predicted_mastery_date" timestamp,
  "recommended_practice_count" integer DEFAULT 0,
  "struggling_indicators" jsonb, -- array of red flags
  
  -- Metadata
  "last_updated" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  
  UNIQUE("student_id", "topic", "course_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "mastery_analytics_student_idx" ON "mastery_analytics"("student_id");
CREATE INDEX IF NOT EXISTS "mastery_analytics_topic_idx" ON "mastery_analytics"("topic");
CREATE INDEX IF NOT EXISTS "mastery_analytics_level_idx" ON "mastery_analytics"("mastery_level");
CREATE INDEX IF NOT EXISTS "mastery_analytics_course_idx" ON "mastery_analytics"("course_id");
--> statement-breakpoint

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE "exams" IS 'Stores exam definitions with anti-cheat settings';
COMMENT ON TABLE "exam_questions" IS 'Individual questions with metadata for analytics';
COMMENT ON TABLE "exam_attempts" IS 'Student exam attempts with integrity tracking';
COMMENT ON TABLE "exam_answers" IS 'Individual answers for each question in attempt';
COMMENT ON TABLE "anti_cheat_events" IS 'Records all suspicious activities during exam';
COMMENT ON TABLE "anti_cheat_risk_scores" IS 'Calculated risk scores for exam attempts';
COMMENT ON TABLE "mistake_pool" IS 'Tracks student mistakes for remediation and retakes';
COMMENT ON TABLE "mistake_retake_exams" IS 'Adaptive retake exams based on student mistakes';
COMMENT ON TABLE "mastery_analytics" IS 'Tracks student mastery by topic across all exams';
