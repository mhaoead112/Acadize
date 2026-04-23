-- Migration: Drop duplicate exam scheduling columns
-- These columns (scheduled_start, scheduled_end) were never used by any service or query.
-- All code uses the canonical columns: scheduled_start_at, scheduled_end_at.
-- Safe to drop: verified via full codebase grep on 2026-04-10.

ALTER TABLE exams DROP COLUMN IF EXISTS scheduled_start;
ALTER TABLE exams DROP COLUMN IF EXISTS scheduled_end;
