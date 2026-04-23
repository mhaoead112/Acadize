-- Migration: Fix lessons.order column type from text to integer
-- The previous text type caused lexicographic ordering bugs ("10" < "2").
-- This converts it to integer, backfilling any non-numeric values with 0.
-- Safe: the column already stored numeric strings like '0', '1', '2', etc.

-- Step 1: Add a temporary integer column
ALTER TABLE lessons ADD COLUMN order_int integer DEFAULT 0 NOT NULL;

-- Step 2: Populate it from the existing text column (cast numeric strings, default 0 for nulls/non-numeric)
UPDATE lessons
SET order_int = CASE
  WHEN "order" ~ '^[0-9]+$' THEN "order"::integer
  ELSE 0
END;

-- Step 3: Drop the old text column
ALTER TABLE lessons DROP COLUMN "order";

-- Step 4: Rename the new column to "order"
ALTER TABLE lessons RENAME COLUMN order_int TO "order";
