-- Add profile_picture column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add grade column to users table (for students)
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade VARCHAR(50);
