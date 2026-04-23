-- Migration: Clean up orphan columns left by partial 0016 run
-- The 0016 migration successfully converted all types but left
-- two intermediate temp columns behind.

-- Drop the orphan temp column on assignments (max_score is already integer)
ALTER TABLE assignments DROP COLUMN IF EXISTS max_score_int;

-- Drop the orphan temp column on grades (score is already real NOT NULL)
ALTER TABLE grades DROP COLUMN IF EXISTS score_real;
