-- Add report_period enum type
DO $$ BEGIN
    CREATE TYPE report_period AS ENUM ('Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'FINAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create report_cards table
CREATE TABLE IF NOT EXISTS report_cards (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period report_period NOT NULL,
    academic_year TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size TEXT NOT NULL,
    uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_cards_student_id ON report_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_period ON report_cards(period);
CREATE INDEX IF NOT EXISTS idx_report_cards_academic_year ON report_cards(academic_year);
CREATE INDEX IF NOT EXISTS idx_report_cards_uploaded_at ON report_cards(uploaded_at);

-- Create unique constraint to prevent duplicate reports for same student/period/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_cards_unique ON report_cards(student_id, period, academic_year);
