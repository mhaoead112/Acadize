-- Add additional fields to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_code TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester_start DATE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester_end DATE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_url TEXT;
