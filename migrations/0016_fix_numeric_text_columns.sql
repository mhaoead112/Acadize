-- Migration: Fix numeric columns stored as text
-- Affects: assignments.max_score, grades.score, grades.max_score,
--          study_streaks (current_streak, longest_streak, total_active_days,
--                         weekly_goal_hours, current_week_hours)
--
-- Strategy: Add new typed column, backfill, drop old, rename.
-- Note: submissions.status is intentionally text (stores 'submitted','graded','late') — NOT changed.

-- ============================================================
-- 1. assignments.max_score: text → integer
-- ============================================================
ALTER TABLE assignments ADD COLUMN max_score_int integer DEFAULT 100;
UPDATE assignments SET max_score_int = CASE
  WHEN max_score ~ '^[0-9]+(\.[0-9]+)?$' THEN ROUND(max_score::numeric)::integer
  ELSE 100
END;
ALTER TABLE assignments DROP COLUMN max_score;
ALTER TABLE assignments RENAME COLUMN max_score_int TO max_score;

-- ============================================================
-- 2. grades.score: text → real
-- ============================================================
ALTER TABLE grades ADD COLUMN score_real real;
UPDATE grades SET score_real = CASE
  WHEN score ~ '^-?[0-9]+(\.[0-9]+)?$' THEN score::real
  ELSE 0
END;
ALTER TABLE grades DROP COLUMN score;
ALTER TABLE grades RENAME COLUMN score_real TO score;
ALTER TABLE grades ALTER COLUMN score SET NOT NULL;

-- ============================================================
-- 3. grades.max_score: text → integer
-- ============================================================
ALTER TABLE grades ADD COLUMN max_score_int integer DEFAULT 100;
UPDATE grades SET max_score_int = CASE
  WHEN max_score ~ '^[0-9]+(\.[0-9]+)?$' THEN ROUND(max_score::numeric)::integer
  ELSE 100
END;
ALTER TABLE grades DROP COLUMN max_score;
ALTER TABLE grades RENAME COLUMN max_score_int TO max_score;

-- ============================================================
-- 4. study_streaks: all text columns → integer or real
-- ============================================================
ALTER TABLE study_streaks ADD COLUMN current_streak_int integer DEFAULT 0 NOT NULL;
ALTER TABLE study_streaks ADD COLUMN longest_streak_int integer DEFAULT 0 NOT NULL;
ALTER TABLE study_streaks ADD COLUMN total_active_days_int integer DEFAULT 0 NOT NULL;
ALTER TABLE study_streaks ADD COLUMN weekly_goal_hours_real real DEFAULT 10 NOT NULL;
ALTER TABLE study_streaks ADD COLUMN current_week_hours_real real DEFAULT 0 NOT NULL;

UPDATE study_streaks SET
  current_streak_int      = CASE WHEN current_streak ~ '^[0-9]+$' THEN current_streak::integer ELSE 0 END,
  longest_streak_int      = CASE WHEN longest_streak ~ '^[0-9]+$' THEN longest_streak::integer ELSE 0 END,
  total_active_days_int   = CASE WHEN total_active_days ~ '^[0-9]+$' THEN total_active_days::integer ELSE 0 END,
  weekly_goal_hours_real  = CASE WHEN weekly_goal_hours ~ '^[0-9]+(\.[0-9]+)?$' THEN weekly_goal_hours::real ELSE 10 END,
  current_week_hours_real = CASE WHEN current_week_hours ~ '^[0-9]+(\.[0-9]+)?$' THEN current_week_hours::real ELSE 0 END;

ALTER TABLE study_streaks DROP COLUMN current_streak;
ALTER TABLE study_streaks DROP COLUMN longest_streak;
ALTER TABLE study_streaks DROP COLUMN total_active_days;
ALTER TABLE study_streaks DROP COLUMN weekly_goal_hours;
ALTER TABLE study_streaks DROP COLUMN current_week_hours;

ALTER TABLE study_streaks RENAME COLUMN current_streak_int      TO current_streak;
ALTER TABLE study_streaks RENAME COLUMN longest_streak_int      TO longest_streak;
ALTER TABLE study_streaks RENAME COLUMN total_active_days_int   TO total_active_days;
ALTER TABLE study_streaks RENAME COLUMN weekly_goal_hours_real  TO weekly_goal_hours;
ALTER TABLE study_streaks RENAME COLUMN current_week_hours_real TO current_week_hours;
