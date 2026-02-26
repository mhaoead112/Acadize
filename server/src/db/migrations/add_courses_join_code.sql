-- Add join_code to courses for student self-enrollment by code or invite link
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS join_code VARCHAR(16);

CREATE INDEX IF NOT EXISTS courses_join_code_idx ON courses(join_code);
