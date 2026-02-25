-- Comprehensive fix for UUID to TEXT migration
-- This converts all tables from UUID to TEXT (CUID) types

-- Step 1: Drop dependent tables first
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Recreate users table with TEXT id
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Recreate courses table
CREATE TABLE courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Recreate enrollments table
CREATE TABLE enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(student_id, course_id)
);

-- Step 5: Recreate lessons table
CREATE TABLE lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size TEXT NOT NULL,
    "order" TEXT DEFAULT '0',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 6: Recreate assignments table
CREATE TABLE assignments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'homework' NOT NULL,
    due_date TIMESTAMP,
    max_score TEXT DEFAULT '100',
    is_published BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 7: Recreate submissions table
CREATE TABLE submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    file_path TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size TEXT,
    submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'submitted' NOT NULL,
    UNIQUE(assignment_id, student_id)
);

-- Step 8: Recreate grades table
CREATE TABLE grades (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE UNIQUE,
    score TEXT NOT NULL,
    max_score TEXT DEFAULT '100',
    feedback TEXT,
    graded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 9: Create indexes
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_lessons_course ON lessons(course_id);
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_grades_submission ON grades(submission_id);

-- Step 10: Insert demo users
-- Password for all demo users is: "password123"
-- Hash generated with bcrypt: $2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu

INSERT INTO users (id, username, full_name, email, password_hash, role, is_active) VALUES
('demo_teacher_001', 'teacher1', 'John Teacher', 'teacher@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'teacher', true),
('demo_teacher_002', 'teacher2', 'Sarah Educator', 'teacher2@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'teacher', true),
('demo_student_001', 'student1', 'Alice Student', 'alice@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'student', true),
('demo_student_002', 'student2', 'Bob Learner', 'bob@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'student', true),
('demo_student_003', 'student3', 'Charlie Smith', 'charlie@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'student', true),
('demo_student_004', 'student4', 'Diana Jones', 'diana@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'student', true),
('demo_student_005', 'student5', 'Emma Wilson', 'emma@demo.com', '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 'student', true);

-- Step 11: Insert demo courses
INSERT INTO courses (id, title, description, teacher_id, is_published) VALUES
('demo_course_001', 'Introduction to Programming', 'Learn the basics of programming with Python', 'demo_teacher_001', true),
('demo_course_002', 'Web Development Fundamentals', 'Build modern web applications', 'demo_teacher_001', true),
('demo_course_003', 'Data Structures and Algorithms', 'Master computer science fundamentals', 'demo_teacher_002', true);

-- Step 12: Insert demo enrollments
INSERT INTO enrollments (id, student_id, course_id) VALUES
('demo_enroll_001', 'demo_student_001', 'demo_course_001'),
('demo_enroll_002', 'demo_student_002', 'demo_course_001'),
('demo_enroll_003', 'demo_student_003', 'demo_course_001'),
('demo_enroll_004', 'demo_student_001', 'demo_course_002'),
('demo_enroll_005', 'demo_student_002', 'demo_course_002'),
('demo_enroll_006', 'demo_student_004', 'demo_course_002'),
('demo_enroll_007', 'demo_student_005', 'demo_course_003');

-- Done! Database schema now matches the code (TEXT-based CUIDs instead of UUIDs)
-- Demo users created with password: password123
