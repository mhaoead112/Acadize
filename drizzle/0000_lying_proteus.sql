CREATE TYPE "public"."anti_cheat_event_type" AS ENUM('tab_switch', 'window_blur', 'copy_paste', 'right_click', 'keyboard_shortcut', 'devtools_open', 'fullscreen_exit', 'multiple_monitors', 'face_not_detected', 'multiple_faces', 'no_face_visible', 'unauthorized_app', 'suspicious_pattern', 'rapid_answers', 'unusual_timing', 'browser_extension_detected', 'screen_share_detected');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted', 'graded', 'flagged', 'under_review', 'invalidated');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'tardy', 'excused');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('group', 'direct');--> statement-breakpoint
CREATE TYPE "public"."event_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('class', 'meeting', 'holiday', 'exam', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."exam_status" AS ENUM('draft', 'scheduled', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'file', 'image', 'video');--> statement-breakpoint
CREATE TYPE "public"."mistake_type" AS ENUM('wrong_answer', 'partial_credit', 'timeout', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."organization_plan" AS ENUM('free', 'starter', 'professional', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'code', 'matching', 'fill_blank');--> statement-breakpoint
CREATE TYPE "public"."remediation_status" AS ENUM('not_started', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."report_period" AS ENUM('Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'FINAL');--> statement-breakpoint
CREATE TYPE "public"."retake_status" AS ENUM('pending', 'available', 'in_progress', 'completed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'under_review', 'cleared', 'violation_confirmed', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'admin', 'parent', 'proctor');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "anti_cheat_events" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"event_type" "anti_cheat_event_type" NOT NULL,
	"severity" "event_severity" NOT NULL,
	"description" text,
	"metadata" jsonb,
	"detected_by" varchar(100),
	"ai_confidence" real,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"question_id" text,
	"device_info" jsonb,
	"screenshot_url" text,
	"video_timestamp" integer,
	"review_status" "review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anti_cheat_risk_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"overall_risk_score" real DEFAULT 0 NOT NULL,
	"risk_level" varchar(50),
	"behavior_score" real DEFAULT 0,
	"timing_score" real DEFAULT 0,
	"device_score" real DEFAULT 0,
	"biometric_score" real DEFAULT 0,
	"pattern_score" real DEFAULT 0,
	"low_severity_count" integer DEFAULT 0,
	"medium_severity_count" integer DEFAULT 0,
	"high_severity_count" integer DEFAULT 0,
	"critical_severity_count" integer DEFAULT 0,
	"tab_switch_count" integer DEFAULT 0,
	"copy_paste_count" integer DEFAULT 0,
	"fullscreen_exit_count" integer DEFAULT 0,
	"face_detection_issues" integer DEFAULT 0,
	"requires_manual_review" boolean DEFAULT false NOT NULL,
	"review_priority" integer DEFAULT 0,
	"final_verdict" varchar(50),
	"verdict_reason" text,
	"decided_by" text,
	"decided_at" timestamp,
	"model_version" varchar(50),
	"model_prediction" jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "anti_cheat_risk_scores_attempt_id_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"lesson_id" text,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'homework' NOT NULL,
	"due_date" timestamp,
	"max_score" text DEFAULT '100',
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" NOT NULL,
	"notes" text,
	"marked_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blocked_users" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"blocked_user_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"conversation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "conversation_type" NOT NULL,
	"group_id" text,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"teacher_id" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"course_id" text NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" "event_type" NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"meeting_link" text,
	"course_id" text,
	"created_by" text NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"max_participants" text,
	"recurrence" text,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"question_id" text NOT NULL,
	"answer" jsonb,
	"is_correct" boolean,
	"points_awarded" real DEFAULT 0,
	"points_possible" integer DEFAULT 1 NOT NULL,
	"answered_at" timestamp NOT NULL,
	"time_spent_seconds" integer,
	"feedback" text,
	"flagged" boolean DEFAULT false NOT NULL,
	"ai_score" real,
	"ai_feedback" text,
	"manually_reviewed" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"student_id" text NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"time_remaining" text,
	"duration_seconds" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_fingerprint" text,
	"browser_info" jsonb,
	"score" real,
	"max_score" integer,
	"percentage" real,
	"passed" boolean,
	"auto_graded" boolean,
	"graded_at" timestamp,
	"graded_by" text,
	"flagged_for_review" boolean DEFAULT false NOT NULL,
	"integrity_score" real DEFAULT 0,
	"location_data" jsonb,
	"is_retake" boolean DEFAULT false NOT NULL,
	"original_attempt_id" text,
	"retake_reason" text,
	"webcam_recording_url" text,
	"screen_recording_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"exam_id" text NOT NULL,
	"question_type" "question_type" NOT NULL,
	"question_text" text NOT NULL,
	"question_image_url" text,
	"question_code_snippet" text,
	"options" jsonb,
	"correct_answer" jsonb NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"partial_credit_enabled" boolean DEFAULT false NOT NULL,
	"topic" varchar(255),
	"subtopic" varchar(255),
	"skill_tag" varchar(255),
	"difficulty_level" varchar(50),
	"blooms_taxonomy" varchar(50),
	"question_bank_id" text,
	"order" integer NOT NULL,
	"section_name" varchar(255),
	"requires_manual_grading" boolean DEFAULT false NOT NULL,
	"rubric" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"course_id" text NOT NULL,
	"created_by" text NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"instructions" text,
	"status" "exam_status" DEFAULT 'draft' NOT NULL,
	"scheduled_start_at" timestamp,
	"scheduled_end_at" timestamp,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"duration" integer NOT NULL,
	"total_points" integer DEFAULT 100 NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"attempts_allowed" text DEFAULT '1' NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"time_limit" text,
	"late_submission_allowed" boolean DEFAULT false NOT NULL,
	"late_submission_penalty" integer DEFAULT 0,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"shuffle_options" boolean DEFAULT false NOT NULL,
	"show_results" boolean DEFAULT true NOT NULL,
	"show_results_immediately" boolean DEFAULT false NOT NULL,
	"show_correct_answers" boolean DEFAULT false NOT NULL,
	"allow_review" boolean DEFAULT true NOT NULL,
	"allow_backtracking" boolean DEFAULT false NOT NULL,
	"anti_cheat_enabled" boolean DEFAULT true NOT NULL,
	"require_webcam" boolean DEFAULT false NOT NULL,
	"require_screen_share" boolean DEFAULT false NOT NULL,
	"require_fullscreen" boolean DEFAULT true NOT NULL,
	"require_lockdown_browser" boolean DEFAULT false NOT NULL,
	"lock_browser" boolean DEFAULT false NOT NULL,
	"tab_switch_limit" integer DEFAULT 3,
	"copy_paste_allowed" boolean DEFAULT false NOT NULL,
	"right_click_allowed" boolean DEFAULT false NOT NULL,
	"access_code" varchar(255),
	"ip_whitelist" jsonb,
	"retake_enabled" boolean DEFAULT true NOT NULL,
	"retake_delay" integer DEFAULT 24,
	"adaptive_retake" boolean DEFAULT true NOT NULL,
	"recording_disclosure" text,
	"data_retention_days" integer DEFAULT 365,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"score" text NOT NULL,
	"max_score" text DEFAULT '100',
	"feedback" text,
	"graded_by" text,
	"graded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "grades_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_restricted" boolean DEFAULT false NOT NULL,
	"muted_until" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" text NOT NULL,
	"order" text DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_read_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"type" "message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"file_url" text,
	"file_name" text,
	"file_size" text,
	"file_type" text,
	"is_edited" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mistake_pool" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"attempt_id" text NOT NULL,
	"answer_id" text NOT NULL,
	"question_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"mistake_type" "mistake_type" NOT NULL,
	"topic" varchar(255),
	"subtopic" varchar(255),
	"skill_tag" varchar(255),
	"difficulty_level" varchar(50),
	"student_answer" jsonb,
	"correct_answer" jsonb,
	"points_lost" real NOT NULL,
	"points_possible" integer NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"remediation_status" "remediation_status" DEFAULT 'not_started' NOT NULL,
	"remediation_started_at" timestamp,
	"remediation_completed_at" timestamp,
	"resources_viewed" jsonb,
	"included_in_retake" boolean DEFAULT false NOT NULL,
	"retake_exam_id" text,
	"corrected_in_retake" boolean,
	"retake_attempt_id" text,
	"is_repeated_mistake" boolean DEFAULT false NOT NULL,
	"repetition_count" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mistake_retake_exams" (
	"id" text PRIMARY KEY NOT NULL,
	"original_exam_id" text NOT NULL,
	"student_id" text NOT NULL,
	"original_attempt_id" text NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "retake_status" DEFAULT 'pending' NOT NULL,
	"available_from" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"adaptive_strategy" jsonb NOT NULL,
	"total_questions" integer NOT NULL,
	"total_points" integer NOT NULL,
	"target_topics" jsonb NOT NULL,
	"target_skills" jsonb,
	"mistake_ids" jsonb NOT NULL,
	"adjusted_difficulty" boolean DEFAULT true NOT NULL,
	"difficulty_modifier" real DEFAULT 1,
	"completed_at" timestamp,
	"attempt_id" text,
	"score" real,
	"passed" boolean,
	"improvement_percentage" real,
	"student_notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp,
	"reminder_sent_at" timestamp,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"generated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" text NOT NULL,
	"image_url" text,
	"category" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"article_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"sender_id" text,
	"conversation_id" text,
	"group_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_invites" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"invited_by" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(63) NOT NULL,
	"custom_domain" varchar(255),
	"logo_url" text,
	"favicon_url" text,
	"primary_color" varchar(7) DEFAULT '#6366f1',
	"secondary_color" varchar(7) DEFAULT '#8b5cf6',
	"plan" "organization_plan" DEFAULT 'free' NOT NULL,
	"max_users" integer DEFAULT 50,
	"max_storage_gb" integer DEFAULT 5,
	"config" jsonb DEFAULT '{}'::jsonb,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "organizations_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "parent_children" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text NOT NULL,
	"child_id" text NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_teacher_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"subject" text,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"parent_unread_count" text DEFAULT '0',
	"teacher_unread_count" text DEFAULT '0',
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parent_teacher_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"attachment_url" text,
	"attachment_name" text,
	"attachment_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"period" "report_period" NOT NULL,
	"academic_year" text NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reported_users" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"context" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"year" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"title" text NOT NULL,
	"department" text NOT NULL,
	"bio" text,
	"image_url" text,
	"email" text,
	"phone" text,
	"office_location" text,
	"office_hours" text,
	"display_order" text DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "study_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity_date" timestamp NOT NULL,
	"activity_type" text NOT NULL,
	"duration_minutes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"course_id" text,
	"created_by" text NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "study_streaks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_streak" text DEFAULT '0' NOT NULL,
	"longest_streak" text DEFAULT '0' NOT NULL,
	"last_activity_date" timestamp,
	"total_active_days" text DEFAULT '0' NOT NULL,
	"weekly_goal_hours" text DEFAULT '10' NOT NULL,
	"current_week_hours" text DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "study_streaks_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"student_id" text NOT NULL,
	"content" text,
	"file_path" text,
	"file_name" text,
	"file_type" text,
	"file_size" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_presence" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"username" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"preferred_role" "user_role",
	"last_login_at" timestamp,
	"phone" text,
	"bio" text,
	"profile_picture" text,
	"grade" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"is_temporary_password" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_events" ADD CONSTRAINT "anti_cheat_events_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_events" ADD CONSTRAINT "anti_cheat_events_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_events" ADD CONSTRAINT "anti_cheat_events_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_risk_scores" ADD CONSTRAINT "anti_cheat_risk_scores_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anti_cheat_risk_scores" ADD CONSTRAINT "anti_cheat_risk_scores_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_users_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_id_study_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."study_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_original_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("original_attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_study_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."study_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_receipts" ADD CONSTRAINT "message_read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_answer_id_exam_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."exam_answers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_retake_exam_id_mistake_retake_exams_id_fk" FOREIGN KEY ("retake_exam_id") REFERENCES "public"."mistake_retake_exams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_pool" ADD CONSTRAINT "mistake_pool_retake_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("retake_attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_retake_exams" ADD CONSTRAINT "mistake_retake_exams_original_exam_id_exams_id_fk" FOREIGN KEY ("original_exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_retake_exams" ADD CONSTRAINT "mistake_retake_exams_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_retake_exams" ADD CONSTRAINT "mistake_retake_exams_original_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("original_attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_retake_exams" ADD CONSTRAINT "mistake_retake_exams_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mistake_retake_exams" ADD CONSTRAINT "mistake_retake_exams_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_article_id_news_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_group_id_study_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."study_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_children" ADD CONSTRAINT "parent_children_child_id_users_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_teacher_conversations" ADD CONSTRAINT "parent_teacher_conversations_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_teacher_conversations" ADD CONSTRAINT "parent_teacher_conversations_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_teacher_messages" ADD CONSTRAINT "parent_teacher_messages_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_teacher_messages" ADD CONSTRAINT "parent_teacher_messages_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_teacher_messages" ADD CONSTRAINT "parent_teacher_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_users" ADD CONSTRAINT "reported_users_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_users" ADD CONSTRAINT "reported_users_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_achievements" ADD CONSTRAINT "staff_achievements_staff_id_staff_profiles_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_activities" ADD CONSTRAINT "study_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_groups" ADD CONSTRAINT "study_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_streaks" ADD CONSTRAINT "study_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anti_cheat_event_attempt_idx" ON "anti_cheat_events" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "anti_cheat_event_type_idx" ON "anti_cheat_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "anti_cheat_event_severity_idx" ON "anti_cheat_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "anti_cheat_event_timestamp_idx" ON "anti_cheat_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "anti_cheat_event_review_status_idx" ON "anti_cheat_events" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "anti_cheat_risk_score_attempt_idx" ON "anti_cheat_risk_scores" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "anti_cheat_risk_score_risk_level_idx" ON "anti_cheat_risk_scores" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "anti_cheat_risk_score_review_idx" ON "anti_cheat_risk_scores" USING btree ("requires_manual_review","review_priority");--> statement-breakpoint
CREATE INDEX "courses_org_idx" ON "courses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "courses_teacher_idx" ON "courses" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "exam_answer_attempt_idx" ON "exam_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "exam_answer_question_idx" ON "exam_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "exam_answer_correctness_idx" ON "exam_answers" USING btree ("is_correct");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_answer_unique_idx" ON "exam_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "exam_attempt_exam_student_idx" ON "exam_attempts" USING btree ("exam_id","student_id");--> statement-breakpoint
CREATE INDEX "exam_attempt_student_idx" ON "exam_attempts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "exam_attempt_status_idx" ON "exam_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exam_attempt_flagged_idx" ON "exam_attempts" USING btree ("flagged_for_review");--> statement-breakpoint
CREATE INDEX "exam_attempt_retake_idx" ON "exam_attempts" USING btree ("is_retake","original_attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempt_unique_idx" ON "exam_attempts" USING btree ("exam_id","student_id","attempt_number");--> statement-breakpoint
CREATE INDEX "exam_question_exam_idx" ON "exam_questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_question_topic_idx" ON "exam_questions" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "exam_question_difficulty_idx" ON "exam_questions" USING btree ("difficulty_level");--> statement-breakpoint
CREATE INDEX "exam_course_idx" ON "exams" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "exam_status_idx" ON "exams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "exam_schedule_idx" ON "exams" USING btree ("scheduled_start_at","scheduled_end_at");--> statement-breakpoint
CREATE INDEX "mistake_pool_student_idx" ON "mistake_pool" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "mistake_pool_attempt_idx" ON "mistake_pool" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "mistake_pool_topic_idx" ON "mistake_pool" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "mistake_pool_skill_idx" ON "mistake_pool" USING btree ("skill_tag");--> statement-breakpoint
CREATE INDEX "mistake_pool_remediation_idx" ON "mistake_pool" USING btree ("remediation_status");--> statement-breakpoint
CREATE INDEX "mistake_pool_retake_idx" ON "mistake_pool" USING btree ("included_in_retake","retake_exam_id");--> statement-breakpoint
CREATE INDEX "mistake_pool_pattern_idx" ON "mistake_pool" USING btree ("student_id","topic","is_repeated_mistake");--> statement-breakpoint
CREATE INDEX "mistake_retake_exam_student_idx" ON "mistake_retake_exams" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "mistake_retake_exam_original_idx" ON "mistake_retake_exams" USING btree ("original_exam_id");--> statement-breakpoint
CREATE INDEX "mistake_retake_exam_status_idx" ON "mistake_retake_exams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mistake_retake_exam_availability_idx" ON "mistake_retake_exams" USING btree ("available_from","expires_at");--> statement-breakpoint
CREATE INDEX "mistake_retake_exam_notification_idx" ON "mistake_retake_exams" USING btree ("student_notified","status");--> statement-breakpoint
CREATE INDEX "org_invite_org_idx" ON "organization_invites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_invite_email_idx" ON "organization_invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "org_invite_token_idx" ON "organization_invites" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "org_subdomain_idx" ON "organizations" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "org_custom_domain_idx" ON "organizations" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "org_plan_idx" ON "organizations" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "org_active_idx" ON "organizations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_org_email_idx" ON "users" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_org_username_idx" ON "users" USING btree ("organization_id","username");