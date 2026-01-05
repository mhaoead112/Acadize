-- Migration: Add phone and bio fields to users table
-- Created: 2025-01-24

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
