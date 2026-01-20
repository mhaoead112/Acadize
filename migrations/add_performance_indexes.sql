-- Add Performance Indexes Migration
-- Created: 2026-01-12
-- Purpose: Add critical indexes to improve query performance

-- Enrollments (frequently joined)
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- Exam Answers (heavy queries during grading)
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_question ON exam_answers(attempt_id, question_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_correct ON exam_answers(is_correct);

-- Anti-Cheat Events (real-time monitoring)
CREATE INDEX IF NOT EXISTS idx_anti_cheat_events_attempt_severity ON anti_cheat_events(attempt_id, severity);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_events_timestamp ON anti_cheat_events(timestamp DESC);

-- Messages (chat performance)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Submissions (assignment grading)
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- Exam Attempts (teacher review)
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_status ON exam_attempts(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_flagged ON exam_attempts(flagged_for_review) WHERE flagged_for_review = true;

-- Risk Scores (proctor dashboard)
CREATE INDEX IF NOT EXISTS idx_risk_scores_attempt ON anti_cheat_risk_scores(attempt_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON anti_cheat_risk_scores(risk_level);

-- Lessons (course content)
CREATE INDEX IF NOT EXISTS idx_lessons_course_order ON lessons(course_id, "order");

-- Assignments (due date queries)
CREATE INDEX IF NOT EXISTS idx_assignments_course_due ON assignments(course_id, due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_published ON assignments(is_published) WHERE is_published = true;

-- Full-text search indexes (requires pg_trgm extension)
-- Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm ON users USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm ON courses USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_exam_questions_text_trgm ON exam_questions USING gin(question_text gin_trgm_ops);
