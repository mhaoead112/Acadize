-- Add type column to assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework' NOT NULL;

-- Update existing assignments to have a type
UPDATE assignments 
SET type = 'homework' 
WHERE type IS NULL;
