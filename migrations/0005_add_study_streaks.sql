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
