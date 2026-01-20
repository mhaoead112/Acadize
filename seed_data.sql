-- =====================================================
-- EDUVERSE DATABASE SEED DATA
-- Comprehensive sample data for all tables
-- Run this after migrations have been applied
-- =====================================================

-- =====================================================
-- 1. USERS (Core accounts: admin, teachers, students, parents)
-- Password hash is for: 'password123' using bcrypt
-- =====================================================
INSERT INTO users (id, username, full_name, email, password_hash, role, is_active, email_verified, phone, bio, profile_picture, grade, is_temporary_password, created_at, updated_at) VALUES
-- Admin
('usr_admin_001', 'admin', 'System Administrator', 'admin@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'admin', true, true, '+1-555-0100', 'Platform administrator with full access', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', NULL, false, NOW(), NOW()),
-- Teachers
('usr_teacher_001', 'john.smith', 'John Smith', 'john.smith@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'teacher', true, true, '+1-555-0101', 'Mathematics teacher with 10 years of experience. Passionate about making math fun!', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', NULL, false, NOW(), NOW()),
('usr_teacher_002', 'sarah.jones', 'Sarah Jones', 'sarah.jones@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'teacher', true, true, '+1-555-0102', 'English Literature teacher. Book lover and creative writing enthusiast.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', NULL, false, NOW(), NOW()),
('usr_teacher_003', 'michael.chen', 'Michael Chen', 'michael.chen@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'teacher', true, true, '+1-555-0103', 'Computer Science teacher. Former software engineer at tech companies.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', NULL, false, NOW(), NOW()),
-- Students
('usr_student_001', 'alice.johnson', 'Alice Johnson', 'alice.johnson@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'student', true, true, '+1-555-0201', 'Freshman student interested in STEM subjects.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', 'Grade 9', false, NOW(), NOW()),
('usr_student_002', 'bob.williams', 'Bob Williams', 'bob.williams@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'student', true, true, '+1-555-0202', 'Sophomore with a passion for literature and creative writing.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'Grade 10', false, NOW(), NOW()),
('usr_student_003', 'carol.davis', 'Carol Davis', 'carol.davis@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'student', true, true, '+1-555-0203', 'Junior honors student. Aspiring software developer.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol', 'Grade 11', false, NOW(), NOW()),
('usr_student_004', 'david.brown', 'David Brown', 'david.brown@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'student', true, true, '+1-555-0204', 'Senior preparing for college. Math olympiad participant.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=david', 'Grade 12', false, NOW(), NOW()),
('usr_student_005', 'emma.wilson', 'Emma Wilson', 'emma.wilson@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'student', true, true, '+1-555-0205', 'Freshman interested in technology and robotics.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', 'Grade 9', false, NOW(), NOW()),
-- Parents
('usr_parent_001', 'robert.johnson', 'Robert Johnson', 'robert.johnson@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'parent', true, true, '+1-555-0301', 'Parent of Alice Johnson', 'https://api.dicebear.com/7.x/avataaars/svg?seed=robert', NULL, false, NOW(), NOW()),
('usr_parent_002', 'mary.williams', 'Mary Williams', 'mary.williams@eduverse.com', '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu.Mm', 'parent', true, true, '+1-555-0302', 'Parent of Bob Williams', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mary', NULL, false, NOW(), NOW());

-- =====================================================
-- 2. PARENT-CHILD RELATIONSHIPS
-- =====================================================
INSERT INTO parent_children (id, parent_id, child_id, linked_at) VALUES
('pc_001', 'usr_parent_001', 'usr_student_001', NOW()),
('pc_002', 'usr_parent_002', 'usr_student_002', NOW());

-- =====================================================
-- 3. COURSES
-- =====================================================
INSERT INTO courses (id, title, description, teacher_id, is_published, image_url, created_at, updated_at) VALUES
('crs_001', 'Algebra Fundamentals', 'Master the basics of algebra including equations, inequalities, and functions. Perfect for beginners and those looking to refresh their skills.', 'usr_teacher_001', true, 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400', NOW(), NOW()),
('crs_002', 'Advanced Calculus', 'Explore differential and integral calculus, series, and multivariable calculus. Recommended for students with strong algebra foundation.', 'usr_teacher_001', true, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400', NOW(), NOW()),
('crs_003', 'English Literature 101', 'Journey through classic and contemporary literature. Develop critical reading and analytical writing skills.', 'usr_teacher_002', true, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400', NOW(), NOW()),
('crs_004', 'Creative Writing Workshop', 'Unleash your creativity! Learn techniques for fiction, poetry, and personal essays in this hands-on workshop.', 'usr_teacher_002', true, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400', NOW(), NOW()),
('crs_005', 'Introduction to Programming', 'Learn programming fundamentals using Python. No prior experience required - perfect for absolute beginners.', 'usr_teacher_003', true, 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400', NOW(), NOW()),
('crs_006', 'Web Development Basics', 'Build modern websites using HTML, CSS, and JavaScript. Create your first portfolio by the end of this course.', 'usr_teacher_003', true, 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400', NOW(), NOW()),
('crs_007', 'Data Structures & Algorithms', 'Master essential computer science concepts. Perfect preparation for technical interviews and advanced coursework.', 'usr_teacher_003', false, 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400', NOW(), NOW());

-- =====================================================
-- 4. ENROLLMENTS
-- =====================================================
INSERT INTO enrollments (id, student_id, course_id, enrolled_at) VALUES
-- Alice's enrollments
('enr_001', 'usr_student_001', 'crs_001', NOW() - INTERVAL '30 days'),
('enr_002', 'usr_student_001', 'crs_005', NOW() - INTERVAL '25 days'),
-- Bob's enrollments
('enr_003', 'usr_student_002', 'crs_003', NOW() - INTERVAL '28 days'),
('enr_004', 'usr_student_002', 'crs_004', NOW() - INTERVAL '20 days'),
-- Carol's enrollments
('enr_005', 'usr_student_003', 'crs_005', NOW() - INTERVAL '35 days'),
('enr_006', 'usr_student_003', 'crs_006', NOW() - INTERVAL '30 days'),
('enr_007', 'usr_student_003', 'crs_002', NOW() - INTERVAL '15 days'),
-- David's enrollments
('enr_008', 'usr_student_004', 'crs_001', NOW() - INTERVAL '40 days'),
('enr_009', 'usr_student_004', 'crs_002', NOW() - INTERVAL '35 days'),
-- Emma's enrollments
('enr_010', 'usr_student_005', 'crs_001', NOW() - INTERVAL '20 days'),
('enr_011', 'usr_student_005', 'crs_005', NOW() - INTERVAL '15 days');

-- =====================================================
-- 5. LESSONS
-- =====================================================
INSERT INTO lessons (id, course_id, title, file_name, file_path, file_type, file_size, "order", created_at, updated_at) VALUES
-- Algebra lessons
('lsn_001', 'crs_001', 'Introduction to Variables', 'intro_variables.pdf', '/uploads/lessons/intro_variables.pdf', 'application/pdf', '2456789', '1', NOW(), NOW()),
('lsn_002', 'crs_001', 'Solving Linear Equations', 'linear_equations.pdf', '/uploads/lessons/linear_equations.pdf', 'application/pdf', '3567890', '2', NOW(), NOW()),
('lsn_003', 'crs_001', 'Working with Inequalities', 'inequalities.pdf', '/uploads/lessons/inequalities.pdf', 'application/pdf', '2789012', '3', NOW(), NOW()),
-- Calculus lessons
('lsn_004', 'crs_002', 'Limits and Continuity', 'limits.pdf', '/uploads/lessons/limits.pdf', 'application/pdf', '4567890', '1', NOW(), NOW()),
('lsn_005', 'crs_002', 'Derivatives Introduction', 'derivatives.pdf', '/uploads/lessons/derivatives.pdf', 'application/pdf', '5678901', '2', NOW(), NOW()),
-- English Literature lessons
('lsn_006', 'crs_003', 'Introduction to Literary Analysis', 'literary_analysis.pdf', '/uploads/lessons/literary_analysis.pdf', 'application/pdf', '3456789', '1', NOW(), NOW()),
('lsn_007', 'crs_003', 'Shakespeare: Romeo and Juliet', 'romeo_juliet.pdf', '/uploads/lessons/romeo_juliet.pdf', 'application/pdf', '4567890', '2', NOW(), NOW()),
-- Programming lessons
('lsn_008', 'crs_005', 'Getting Started with Python', 'python_intro.pdf', '/uploads/lessons/python_intro.pdf', 'application/pdf', '2345678', '1', NOW(), NOW()),
('lsn_009', 'crs_005', 'Variables and Data Types', 'python_variables.pdf', '/uploads/lessons/python_variables.pdf', 'application/pdf', '2789012', '2', NOW(), NOW()),
('lsn_010', 'crs_005', 'Control Flow: If Statements', 'python_control_flow.pdf', '/uploads/lessons/python_control_flow.pdf', 'application/pdf', '3012345', '3', NOW(), NOW()),
-- Web Dev lessons
('lsn_011', 'crs_006', 'HTML Fundamentals', 'html_basics.pdf', '/uploads/lessons/html_basics.pdf', 'application/pdf', '2567890', '1', NOW(), NOW()),
('lsn_012', 'crs_006', 'CSS Styling Essentials', 'css_basics.pdf', '/uploads/lessons/css_basics.pdf', 'application/pdf', '3456789', '2', NOW(), NOW());

-- =====================================================
-- 6. ASSIGNMENTS
-- =====================================================
INSERT INTO assignments (id, course_id, lesson_id, title, description, type, due_date, max_score, is_published, created_at, updated_at) VALUES
-- Algebra assignments
('asg_001', 'crs_001', 'lsn_001', 'Variables Practice Set', 'Complete exercises 1-20 on variable expressions. Show all work.', 'homework', NOW() + INTERVAL '7 days', '100', true, NOW(), NOW()),
('asg_002', 'crs_001', 'lsn_002', 'Linear Equations Quiz', 'Solve the given linear equations. Time limit: 45 minutes.', 'quiz', NOW() + INTERVAL '14 days', '50', true, NOW(), NOW()),
-- Calculus assignments
('asg_003', 'crs_002', 'lsn_004', 'Limits Problem Set', 'Evaluate the given limits and explain your reasoning.', 'homework', NOW() + INTERVAL '10 days', '100', true, NOW(), NOW()),
-- English assignments
('asg_004', 'crs_003', 'lsn_006', 'Literary Analysis Essay', 'Write a 500-word analysis of your chosen poem.', 'essay', NOW() + INTERVAL '21 days', '100', true, NOW(), NOW()),
('asg_005', 'crs_003', 'lsn_007', 'Romeo and Juliet Discussion', 'Analyze the themes of fate and free will in Act 3.', 'homework', NOW() + INTERVAL '14 days', '50', true, NOW(), NOW()),
-- Programming assignments
('asg_006', 'crs_005', 'lsn_008', 'Hello World Program', 'Create your first Python program that prints a greeting.', 'homework', NOW() + INTERVAL '5 days', '25', true, NOW(), NOW()),
('asg_007', 'crs_005', 'lsn_009', 'Calculator Project', 'Build a simple calculator using Python.', 'project', NOW() + INTERVAL '21 days', '100', true, NOW(), NOW()),
-- Web Dev assignments
('asg_008', 'crs_006', 'lsn_011', 'Personal Bio Page', 'Create an HTML page about yourself.', 'project', NOW() + INTERVAL '10 days', '100', true, NOW(), NOW());

-- =====================================================
-- 7. SUBMISSIONS
-- =====================================================
INSERT INTO submissions (id, assignment_id, student_id, content, file_path, file_name, file_type, file_size, submitted_at, status) VALUES
('sub_001', 'asg_001', 'usr_student_001', 'Completed exercises 1-20. Please see attached PDF.', '/uploads/submissions/alice_variables.pdf', 'alice_variables.pdf', 'application/pdf', '156789', NOW() - INTERVAL '2 days', 'graded'),
('sub_002', 'asg_006', 'usr_student_001', 'print("Hello, World!")\nprint("My name is Alice!")', NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days', 'graded'),
('sub_003', 'asg_004', 'usr_student_002', 'In this essay, I will analyze Robert Frost''s poem "The Road Not Taken"...', '/uploads/submissions/bob_essay.pdf', 'bob_essay.pdf', 'application/pdf', '234567', NOW() - INTERVAL '1 day', 'submitted'),
('sub_004', 'asg_006', 'usr_student_003', 'print("Hello World")\nprint("Welcome to Python!")', NULL, NULL, NULL, NULL, NOW() - INTERVAL '4 days', 'graded'),
('sub_005', 'asg_001', 'usr_student_004', 'All exercises completed with detailed solutions.', '/uploads/submissions/david_variables.pdf', 'david_variables.pdf', 'application/pdf', '189012', NOW() - INTERVAL '5 days', 'graded');

-- =====================================================
-- 8. GRADES
-- =====================================================
INSERT INTO grades (id, submission_id, score, max_score, feedback, graded_by, graded_at, created_at, updated_at) VALUES
('grd_001', 'sub_001', '92', '100', 'Excellent work! Great understanding of variable expressions. Minor error on problem 15.', 'usr_teacher_001', NOW() - INTERVAL '1 day', NOW(), NOW()),
('grd_002', 'sub_002', '25', '25', 'Perfect! Your code runs correctly and shows creativity.', 'usr_teacher_003', NOW() - INTERVAL '2 days', NOW(), NOW()),
('grd_003', 'sub_004', '23', '25', 'Good work! Consider adding more comments to your code.', 'usr_teacher_003', NOW() - INTERVAL '3 days', NOW(), NOW()),
('grd_004', 'sub_005', '98', '100', 'Outstanding! Your solutions are thorough and well-organized.', 'usr_teacher_001', NOW() - INTERVAL '4 days', NOW(), NOW());

-- =====================================================
-- 9. ANNOUNCEMENTS
-- =====================================================
INSERT INTO announcements (id, course_id, teacher_id, title, content, is_pinned, created_at, updated_at) VALUES
('ann_001', 'crs_001', 'usr_teacher_001', 'Welcome to Algebra Fundamentals!', 'Welcome everyone! I''m excited to have you in this class. Please review the syllabus and don''t hesitate to ask questions. Office hours are Tuesdays 3-5 PM.', true, NOW() - INTERVAL '30 days', NOW()),
('ann_002', 'crs_001', 'usr_teacher_001', 'Upcoming Quiz Reminder', 'Don''t forget: Linear Equations Quiz is due next Friday. Review chapters 2-3 and practice problems.', false, NOW() - INTERVAL '5 days', NOW()),
('ann_003', 'crs_003', 'usr_teacher_002', 'Literature Circle Groups Announced', 'Check your email for your literature circle group assignment. First meeting is this Thursday during class.', false, NOW() - INTERVAL '7 days', NOW()),
('ann_004', 'crs_005', 'usr_teacher_003', 'Programming Lab Hours Extended', 'Good news! The computer lab will be open until 8 PM on weekdays for additional practice time.', true, NOW() - INTERVAL '10 days', NOW()),
('ann_005', 'crs_006', 'usr_teacher_003', 'Guest Speaker: Industry Professional', 'We''ll have a guest speaker from a local tech company next Wednesday. Don''t miss this opportunity to learn about real-world web development!', false, NOW() - INTERVAL '3 days', NOW());

-- =====================================================
-- 10. EVENTS
-- =====================================================
INSERT INTO events (id, title, description, event_type, start_time, end_time, location, meeting_link, course_id, created_by, is_all_day, is_public, max_participants, recurrence, color, created_at, updated_at) VALUES
('evt_001', 'Algebra Study Session', 'Review for upcoming midterm exam', 'class', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '2 hours', 'Room 201', 'https://meet.google.com/abc-defg-hij', 'crs_001', 'usr_teacher_001', false, true, '30', 'none', '#4CAF50', NOW(), NOW()),
('evt_002', 'Poetry Reading Night', 'Students share their creative writing pieces', 'event', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '3 hours', 'Library Auditorium', NULL, 'crs_004', 'usr_teacher_002', false, true, '100', 'none', '#9C27B0', NOW(), NOW()),
('evt_003', 'Hackathon 2024', 'Annual coding competition for all programming students', 'event', NOW() + INTERVAL '14 days', NOW() + INTERVAL '16 days', 'Computer Lab A & B', NULL, NULL, 'usr_teacher_003', false, true, '50', 'none', '#2196F3', NOW(), NOW()),
('evt_004', 'Parent-Teacher Conference', 'Mid-semester progress discussions', 'meeting', NOW() + INTERVAL '21 days', NOW() + INTERVAL '21 days' + INTERVAL '4 hours', 'Main Hall', NULL, NULL, 'usr_admin_001', true, true, NULL, 'none', '#FF9800', NOW(), NOW()),
('evt_005', 'Calculus Office Hours', 'Weekly drop-in help session', 'meeting', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'Room 305', 'https://zoom.us/j/123456789', 'crs_002', 'usr_teacher_001', false, true, '20', 'weekly', '#F44336', NOW(), NOW());

-- =====================================================
-- 11. EVENT PARTICIPANTS
-- =====================================================
INSERT INTO event_participants (id, event_id, user_id, status, created_at) VALUES
('evp_001', 'evt_001', 'usr_student_001', 'accepted', NOW()),
('evp_002', 'evt_001', 'usr_student_004', 'accepted', NOW()),
('evp_003', 'evt_002', 'usr_student_002', 'accepted', NOW()),
('evp_004', 'evt_003', 'usr_student_003', 'accepted', NOW()),
('evp_005', 'evt_003', 'usr_student_005', 'pending', NOW());

-- =====================================================
-- 12. ATTENDANCE
-- =====================================================
INSERT INTO attendance (id, student_id, course_id, date, status, notes, marked_by, created_at, updated_at) VALUES
('att_001', 'usr_student_001', 'crs_001', CURRENT_DATE - INTERVAL '1 day', 'present', NULL, 'usr_teacher_001', NOW(), NOW()),
('att_002', 'usr_student_001', 'crs_001', CURRENT_DATE - INTERVAL '3 days', 'present', NULL, 'usr_teacher_001', NOW(), NOW()),
('att_003', 'usr_student_001', 'crs_001', CURRENT_DATE - INTERVAL '5 days', 'tardy', 'Arrived 10 minutes late', 'usr_teacher_001', NOW(), NOW()),
('att_004', 'usr_student_002', 'crs_003', CURRENT_DATE - INTERVAL '1 day', 'present', NULL, 'usr_teacher_002', NOW(), NOW()),
('att_005', 'usr_student_002', 'crs_003', CURRENT_DATE - INTERVAL '3 days', 'excused', 'Doctor appointment', 'usr_teacher_002', NOW(), NOW()),
('att_006', 'usr_student_003', 'crs_005', CURRENT_DATE - INTERVAL '1 day', 'present', NULL, 'usr_teacher_003', NOW(), NOW()),
('att_007', 'usr_student_004', 'crs_001', CURRENT_DATE - INTERVAL '1 day', 'present', NULL, 'usr_teacher_001', NOW(), NOW());

-- =====================================================
-- 13. REPORT CARDS
-- =====================================================
INSERT INTO report_cards (id, student_id, period, academic_year, file_name, file_path, file_size, uploaded_by, uploaded_at, created_at) VALUES
('rpc_001', 'usr_student_001', 'Q1', '2024-2025', 'alice_q1_2024.pdf', '/uploads/report_cards/alice_q1_2024.pdf', '345678', 'usr_teacher_001', NOW() - INTERVAL '60 days', NOW()),
('rpc_002', 'usr_student_002', 'Q1', '2024-2025', 'bob_q1_2024.pdf', '/uploads/report_cards/bob_q1_2024.pdf', '356789', 'usr_teacher_002', NOW() - INTERVAL '60 days', NOW()),
('rpc_003', 'usr_student_003', 'Q1', '2024-2025', 'carol_q1_2024.pdf', '/uploads/report_cards/carol_q1_2024.pdf', '367890', 'usr_teacher_003', NOW() - INTERVAL '60 days', NOW());

-- =====================================================
-- 14. STUDY GROUPS
-- =====================================================
INSERT INTO study_groups (id, name, description, course_id, created_by, avatar_url, is_active, auto_generated, created_at, updated_at) VALUES
('grp_001', 'Algebra Study Buddies', 'Study group for Algebra Fundamentals students', 'crs_001', 'usr_student_001', 'https://api.dicebear.com/7.x/shapes/svg?seed=algebra', true, false, NOW() - INTERVAL '20 days', NOW()),
('grp_002', 'Code Warriors', 'Collaborative programming group', 'crs_005', 'usr_student_003', 'https://api.dicebear.com/7.x/shapes/svg?seed=code', true, false, NOW() - INTERVAL '15 days', NOW()),
('grp_003', 'Literature Lovers', 'Discuss books and writing', 'crs_003', 'usr_student_002', 'https://api.dicebear.com/7.x/shapes/svg?seed=books', true, false, NOW() - INTERVAL '18 days', NOW());

-- =====================================================
-- 15. GROUP MEMBERS
-- =====================================================
INSERT INTO group_members (id, group_id, user_id, role, is_muted, is_restricted, joined_at) VALUES
('gm_001', 'grp_001', 'usr_student_001', 'admin', false, false, NOW() - INTERVAL '20 days'),
('gm_002', 'grp_001', 'usr_student_004', 'member', false, false, NOW() - INTERVAL '18 days'),
('gm_003', 'grp_001', 'usr_student_005', 'member', false, false, NOW() - INTERVAL '15 days'),
('gm_004', 'grp_002', 'usr_student_003', 'admin', false, false, NOW() - INTERVAL '15 days'),
('gm_005', 'grp_002', 'usr_student_001', 'member', false, false, NOW() - INTERVAL '12 days'),
('gm_006', 'grp_002', 'usr_student_005', 'member', false, false, NOW() - INTERVAL '10 days'),
('gm_007', 'grp_003', 'usr_student_002', 'admin', false, false, NOW() - INTERVAL '18 days');

-- =====================================================
-- 16. CONVERSATIONS
-- =====================================================
INSERT INTO conversations (id, type, group_id, name, avatar_url, created_at, updated_at) VALUES
('conv_001', 'group', 'grp_001', 'Algebra Study Buddies Chat', 'https://api.dicebear.com/7.x/shapes/svg?seed=algebra', NOW() - INTERVAL '20 days', NOW()),
('conv_002', 'group', 'grp_002', 'Code Warriors Chat', 'https://api.dicebear.com/7.x/shapes/svg?seed=code', NOW() - INTERVAL '15 days', NOW()),
('conv_003', 'group', 'grp_003', 'Literature Lovers Chat', 'https://api.dicebear.com/7.x/shapes/svg?seed=books', NOW() - INTERVAL '18 days', NOW()),
('conv_004', 'direct', NULL, NULL, NULL, NOW() - INTERVAL '10 days', NOW());

-- =====================================================
-- 17. CONVERSATION PARTICIPANTS
-- =====================================================
INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at, last_read_at) VALUES
('cp_001', 'conv_001', 'usr_student_001', NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 hour'),
('cp_002', 'conv_001', 'usr_student_004', NOW() - INTERVAL '18 days', NOW() - INTERVAL '2 hours'),
('cp_003', 'conv_001', 'usr_student_005', NOW() - INTERVAL '15 days', NOW() - INTERVAL '30 minutes'),
('cp_004', 'conv_002', 'usr_student_003', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 hour'),
('cp_005', 'conv_002', 'usr_student_001', NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 hours'),
('cp_006', 'conv_004', 'usr_student_001', NOW() - INTERVAL '10 days', NOW()),
('cp_007', 'conv_004', 'usr_student_002', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 hour');

-- =====================================================
-- 18. MESSAGES
-- =====================================================
INSERT INTO messages (id, conversation_id, sender_id, type, content, file_url, file_name, file_size, file_type, is_edited, is_deleted, created_at, updated_at) VALUES
('msg_001', 'conv_001', 'usr_student_001', 'text', 'Hey everyone! Ready for the quiz on Friday?', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '2 days', NOW()),
('msg_002', 'conv_001', 'usr_student_004', 'text', 'I think so! Anyone want to meet up to review?', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '2 days' + INTERVAL '10 minutes', NOW()),
('msg_003', 'conv_001', 'usr_student_005', 'text', 'Count me in! How about Thursday after school?', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '2 days' + INTERVAL '20 minutes', NOW()),
('msg_004', 'conv_002', 'usr_student_003', 'text', 'Just finished the calculator project. It was challenging but fun!', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '1 day', NOW()),
('msg_005', 'conv_002', 'usr_student_001', 'text', 'Nice! I''m still working on the division function. Any tips?', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', NOW()),
('msg_006', 'conv_004', 'usr_student_001', 'text', 'Hey Bob, did you finish reading the Shakespeare assignment?', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '3 hours', NOW()),
('msg_007', 'conv_004', 'usr_student_002', 'text', 'Almost done! It''s really interesting. Want to discuss it tomorrow?', NULL, NULL, NULL, NULL, false, false, NOW() - INTERVAL '2 hours', NOW());

-- =====================================================
-- 19. NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (id, user_id, type, title, message, sender_id, conversation_id, group_id, is_read, created_at) VALUES
('not_001', 'usr_student_001', 'new_message', 'New Message', 'David sent a message in Algebra Study Buddies', 'usr_student_004', 'conv_001', 'grp_001', true, NOW() - INTERVAL '2 days'),
('not_002', 'usr_student_001', 'assignment_due', 'Assignment Due Soon', 'Variables Practice Set is due in 5 days', NULL, NULL, NULL, false, NOW() - INTERVAL '1 day'),
('not_003', 'usr_student_002', 'new_message', 'New Message', 'Alice sent you a direct message', 'usr_student_001', 'conv_004', NULL, false, NOW() - INTERVAL '3 hours'),
('not_004', 'usr_student_003', 'announcement', 'New Announcement', 'Programming Lab Hours Extended', 'usr_teacher_003', NULL, NULL, true, NOW() - INTERVAL '10 days');

-- =====================================================
-- 20. USER PRESENCE
-- =====================================================
INSERT INTO user_presence (user_id, status, last_seen, updated_at) VALUES
('usr_student_001', 'online', NOW(), NOW()),
('usr_student_002', 'away', NOW() - INTERVAL '30 minutes', NOW()),
('usr_student_003', 'offline', NOW() - INTERVAL '2 hours', NOW()),
('usr_student_004', 'online', NOW(), NOW()),
('usr_student_005', 'offline', NOW() - INTERVAL '1 day', NOW()),
('usr_teacher_001', 'online', NOW(), NOW()),
('usr_teacher_002', 'away', NOW() - INTERVAL '15 minutes', NOW()),
('usr_teacher_003', 'offline', NOW() - INTERVAL '3 hours', NOW());

-- =====================================================
-- 21. STUDY ACTIVITIES
-- =====================================================
INSERT INTO study_activities (id, user_id, activity_date, activity_type, duration_minutes, created_at) VALUES
('sa_001', 'usr_student_001', CURRENT_DATE, 'lesson_view', '45', NOW()),
('sa_002', 'usr_student_001', CURRENT_DATE - INTERVAL '1 day', 'assignment_submit', '90', NOW() - INTERVAL '1 day'),
('sa_003', 'usr_student_001', CURRENT_DATE - INTERVAL '2 days', 'lesson_view', '30', NOW() - INTERVAL '2 days'),
('sa_004', 'usr_student_002', CURRENT_DATE, 'lesson_view', '60', NOW()),
('sa_005', 'usr_student_003', CURRENT_DATE, 'quiz_complete', '45', NOW()),
('sa_006', 'usr_student_003', CURRENT_DATE - INTERVAL '1 day', 'lesson_view', '75', NOW() - INTERVAL '1 day');

-- =====================================================
-- 22. STUDY STREAKS
-- =====================================================
INSERT INTO study_streaks (id, user_id, current_streak, longest_streak, last_activity_date, total_active_days, weekly_goal_hours, current_week_hours, updated_at) VALUES
('ss_001', 'usr_student_001', '5', '12', CURRENT_DATE, '45', '10', '8', NOW()),
('ss_002', 'usr_student_002', '3', '7', CURRENT_DATE, '28', '8', '5', NOW()),
('ss_003', 'usr_student_003', '10', '15', CURRENT_DATE, '67', '12', '11', NOW()),
('ss_004', 'usr_student_004', '2', '20', CURRENT_DATE - INTERVAL '1 day', '89', '15', '4', NOW()),
('ss_005', 'usr_student_005', '1', '5', CURRENT_DATE, '15', '8', '2', NOW());

-- =====================================================
-- 23. PARENT-TEACHER CONVERSATIONS
-- =====================================================
INSERT INTO parent_teacher_conversations (id, parent_id, teacher_id, subject, last_message_at, parent_unread_count, teacher_unread_count, is_archived, created_at, updated_at) VALUES
('ptc_001', 'usr_parent_001', 'usr_teacher_001', 'Alice''s Progress in Algebra', NOW() - INTERVAL '3 days', '0', '1', false, NOW() - INTERVAL '10 days', NOW()),
('ptc_002', 'usr_parent_002', 'usr_teacher_002', 'Bob''s Creative Writing Improvement', NOW() - INTERVAL '5 days', '1', '0', false, NOW() - INTERVAL '14 days', NOW());

-- =====================================================
-- 24. PARENT-TEACHER MESSAGES
-- =====================================================
INSERT INTO parent_teacher_messages (id, parent_id, teacher_id, sender_id, content, is_read, read_at, created_at, updated_at) VALUES
('ptm_001', 'usr_parent_001', 'usr_teacher_001', 'usr_parent_001', 'Hi Mr. Smith, I wanted to check in on Alice''s progress in algebra. She mentioned the upcoming quiz.', true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days', NOW()),
('ptm_002', 'usr_parent_001', 'usr_teacher_001', 'usr_teacher_001', 'Hello Mr. Johnson! Alice is doing great. She scored 92% on her last assignment. I recommend she review chapter 3 before the quiz.', true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days', NOW()),
('ptm_003', 'usr_parent_001', 'usr_teacher_001', 'usr_parent_001', 'Thank you for the update! We''ll make sure she reviews.', false, NULL, NOW() - INTERVAL '3 days', NOW()),
('ptm_004', 'usr_parent_002', 'usr_teacher_002', 'usr_teacher_002', 'Mrs. Williams, I wanted to share that Bob''s essay on Frost was exceptional. His analytical skills have improved significantly!', false, NULL, NOW() - INTERVAL '5 days', NOW());

-- =====================================================
-- 25. STAFF PROFILES
-- =====================================================
INSERT INTO staff_profiles (id, user_id, first_name, last_name, title, department, bio, image_url, email, phone, office_location, office_hours, display_order, is_active, created_at, updated_at) VALUES
('staff_001', 'usr_teacher_001', 'John', 'Smith', 'Mathematics Teacher', 'Mathematics', 'Passionate mathematics educator with over 10 years of experience. Specializes in making algebra and calculus accessible to all students.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', 'john.smith@eduverse.com', '+1-555-0101', 'Building A, Room 201', 'Tue/Thu 3-5 PM', '1', true, NOW(), NOW()),
('staff_002', 'usr_teacher_002', 'Sarah', 'Jones', 'English Literature Teacher', 'English', 'Literature enthusiast dedicated to fostering a love of reading and writing. Published author and creative writing mentor.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 'sarah.jones@eduverse.com', '+1-555-0102', 'Building B, Room 105', 'Mon/Wed 2-4 PM', '2', true, NOW(), NOW()),
('staff_003', 'usr_teacher_003', 'Michael', 'Chen', 'Computer Science Teacher', 'Technology', 'Former software engineer bringing real-world experience to the classroom. Expert in Python, web development, and algorithms.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', 'michael.chen@eduverse.com', '+1-555-0103', 'Building C, Room 301', 'Daily 4-5 PM', '3', true, NOW(), NOW()),
('staff_004', NULL, 'Jennifer', 'Martinez', 'School Counselor', 'Student Services', 'Dedicated to supporting student well-being and academic success. Certified school counselor with expertise in college preparation.', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jennifer', 'jennifer.martinez@eduverse.com', '+1-555-0104', 'Admin Building, Room 102', 'Mon-Fri 8 AM - 4 PM', '4', true, NOW(), NOW());

-- =====================================================
-- 26. STAFF ACHIEVEMENTS
-- =====================================================
INSERT INTO staff_achievements (id, staff_id, title, description, year, created_at) VALUES
('ach_001', 'staff_001', 'Teacher of the Year', 'Recognized for outstanding teaching and student engagement', '2023', NOW()),
('ach_002', 'staff_001', 'Math Olympiad Coach', 'Led student team to state championship', '2022', NOW()),
('ach_003', 'staff_002', 'Published Author', 'Released poetry collection "Voices of Tomorrow"', '2023', NOW()),
('ach_004', 'staff_003', 'Innovation in Teaching Award', 'Pioneered new programming curriculum', '2024', NOW());

-- =====================================================
-- 27. APPLICATIONS (Contact/Apply forms)
-- =====================================================
INSERT INTO applications (id, full_name, email, phone, message, created_at) VALUES
('app_001', 'Jennifer Roberts', 'jennifer.r@email.com', '+1-555-1001', 'I would like to enroll my child in the summer program.', NOW() - INTERVAL '5 days'),
('app_002', 'Thomas Anderson', 'thomas.a@email.com', '+1-555-1002', 'Interested in teaching position for mathematics.', NOW() - INTERVAL '3 days');

-- =====================================================
-- 28. CONTACTS (Contact form submissions)
-- =====================================================
INSERT INTO contacts (id, name, email, subject, message, created_at) VALUES
('cnt_001', 'Sarah Connor', 'sarah.c@email.com', 'Question about enrollment', 'When does the enrollment period start for fall semester?', NOW() - INTERVAL '7 days'),
('cnt_002', 'James Wilson', 'james.w@email.com', 'Technical Support', 'I''m having trouble accessing my student portal.', NOW() - INTERVAL '2 days');

-- =====================================================
-- 29. NEWS ARTICLES
-- =====================================================
INSERT INTO news_articles (id, title, content, author_id, image_url, category, is_published, created_at, updated_at) VALUES
('news_001', 'Annual Science Fair Winners Announced', 'We are proud to announce the winners of this year''s science fair! First place goes to Carol Davis for her innovative project on renewable energy solutions...', 'usr_admin_001', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400', 'achievements', true, NOW() - INTERVAL '5 days', NOW()),
('news_002', 'New Computer Lab Opening', 'The school is excited to announce the opening of our state-of-the-art computer lab. Featuring 30 new workstations with the latest software...', 'usr_admin_001', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400', 'facilities', true, NOW() - INTERVAL '10 days', NOW()),
('news_003', 'Spring Sports Registration Open', 'Registration for spring sports is now open! Available sports include baseball, softball, track and field, and tennis...', 'usr_admin_001', 'https://images.unsplash.com/photo-1461896836934- voices82c19c?w=400', 'sports', true, NOW() - INTERVAL '3 days', NOW());

-- =====================================================
-- 30. NEWS COMMENTS
-- =====================================================
INSERT INTO news_comments (id, article_id, user_id, content, created_at) VALUES
('nc_001', 'news_001', 'usr_student_003', 'Thank you! It was an amazing experience participating in the science fair!', NOW() - INTERVAL '4 days'),
('nc_002', 'news_002', 'usr_student_001', 'Can''t wait to use the new lab!', NOW() - INTERVAL '9 days');

-- =====================================================
-- 31. EXAMS
-- =====================================================
INSERT INTO exams (id, course_id, created_by, title, description, instructions, status, scheduled_start_at, scheduled_end_at, duration, total_points, passing_score, attempts_allowed, max_attempts, shuffle_questions, shuffle_options, show_results_immediately, show_correct_answers, allow_backtracking, anti_cheat_enabled, require_webcam, require_fullscreen, copy_paste_allowed, right_click_allowed, tab_switch_limit, access_code, retake_enabled, adaptive_retake, created_at, updated_at) VALUES
('exam_001', 'crs_001', 'usr_teacher_001', 'Algebra Midterm Exam', 'Comprehensive exam covering chapters 1-5', 'Read each question carefully. Show all work for partial credit. No calculators allowed.', 'scheduled', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '2 hours', 90, 100, 70, '1', 1, true, true, false, false, true, true, true, true, false, false, 3, 'ALG2024', true, true, NOW(), NOW()),
('exam_002', 'crs_005', 'usr_teacher_003', 'Python Basics Quiz', 'Test your knowledge of Python fundamentals', 'Answer all questions. Multiple choice and short answer.', 'active', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '24 hours', 45, 50, 60, '2', 2, false, false, true, true, true, true, false, true, true, true, 5, NULL, true, false, NOW(), NOW()),
('exam_003', 'crs_003', 'usr_teacher_002', 'Shakespeare Analysis Test', 'Test on Romeo and Juliet themes and literary devices', 'Write complete sentences. Cite specific examples from the text.', 'draft', NULL, NULL, 60, 75, 65, '1', 1, false, false, true, true, true, false, false, false, true, true, 10, NULL, false, false, NOW(), NOW());

-- =====================================================
-- 32. EXAM QUESTIONS
-- =====================================================
INSERT INTO exam_questions (id, exam_id, question_type, question_text, options, correct_answer, points, partial_credit_enabled, topic, subtopic, skill_tag, difficulty_level, "order", requires_manual_grading, created_at, updated_at) VALUES
-- Algebra exam questions
('eq_001', 'exam_001', 'multiple_choice', 'What is the solution to 2x + 5 = 15?', '[{"id": "a", "text": "x = 5"}, {"id": "b", "text": "x = 10"}, {"id": "c", "text": "x = 7"}, {"id": "d", "text": "x = 3"}]', '"a"', 5, false, 'Algebra', 'Linear Equations', 'problem_solving', 'easy', 1, false, NOW(), NOW()),
('eq_002', 'exam_001', 'multiple_choice', 'Which expression is equivalent to 3(x + 4)?', '[{"id": "a", "text": "3x + 4"}, {"id": "b", "text": "3x + 12"}, {"id": "c", "text": "x + 12"}, {"id": "d", "text": "3x + 7"}]', '"b"', 5, false, 'Algebra', 'Distributive Property', 'conceptual_understanding', 'easy', 2, false, NOW(), NOW()),
('eq_003', 'exam_001', 'short_answer', 'Solve for y: 3y - 7 = 14', NULL, '"7"', 10, true, 'Algebra', 'Linear Equations', 'problem_solving', 'medium', 3, false, NOW(), NOW()),
('eq_004', 'exam_001', 'true_false', 'The expression x² + 2x + 1 can be factored as (x + 1)².', '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]', '"true"', 5, false, 'Algebra', 'Factoring', 'conceptual_understanding', 'medium', 4, false, NOW(), NOW()),
('eq_005', 'exam_001', 'essay', 'Explain the process of solving a quadratic equation using the quadratic formula. Include an example.', NULL, '"detailed_explanation_required"', 25, true, 'Algebra', 'Quadratic Equations', 'critical_thinking', 'hard', 5, true, NOW(), NOW()),
-- Python quiz questions
('eq_006', 'exam_002', 'multiple_choice', 'What is the output of print(type(5.0))?', '[{"id": "a", "text": "int"}, {"id": "b", "text": "float"}, {"id": "c", "text": "number"}, {"id": "d", "text": "double"}]', '"b"', 5, false, 'Programming', 'Data Types', 'conceptual_understanding', 'easy', 1, false, NOW(), NOW()),
('eq_007', 'exam_002', 'code', 'Write a Python function that takes a list of numbers and returns their sum.', NULL, '"def sum_list(numbers): return sum(numbers)"', 15, true, 'Programming', 'Functions', 'problem_solving', 'medium', 2, true, NOW(), NOW()),
('eq_008', 'exam_002', 'fill_blank', 'In Python, the _____ keyword is used to define a function.', NULL, '["def"]', 5, false, 'Programming', 'Functions', 'recall', 'easy', 3, false, NOW(), NOW());

-- =====================================================
-- 33. EXAM ATTEMPTS
-- =====================================================
INSERT INTO exam_attempts (id, exam_id, student_id, attempt_number, status, started_at, submitted_at, time_remaining, ip_address, user_agent, score, max_score, percentage, passed, auto_graded, flagged_for_review, integrity_score, is_retake, created_at, updated_at) VALUES
('att_exam_001', 'exam_002', 'usr_student_001', 1, 'submitted', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', 42, 50, 84.0, true, true, false, 95.5, false, NOW(), NOW()),
('att_exam_002', 'exam_002', 'usr_student_003', 1, 'submitted', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NULL, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0', 48, 50, 96.0, true, true, false, 98.0, false, NOW(), NOW()),
('att_exam_003', 'exam_002', 'usr_student_005', 1, 'in_progress', NOW() - INTERVAL '30 minutes', NULL, '15', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0', NULL, 50, NULL, NULL, NULL, false, 100.0, false, NOW(), NOW());

-- =====================================================
-- 34. EXAM ANSWERS
-- =====================================================
INSERT INTO exam_answers (id, attempt_id, question_id, answer, is_correct, points_awarded, points_possible, answered_at, time_spent_seconds, feedback, flagged, manually_reviewed, created_at, updated_at) VALUES
('ea_001', 'att_exam_001', 'eq_006', '"b"', true, 5, 5, NOW() - INTERVAL '1 hour' - INTERVAL '40 minutes', 45, NULL, false, false, NOW(), NOW()),
('ea_002', 'att_exam_001', 'eq_007', '"def sum_numbers(nums): total = 0; for n in nums: total += n; return total"', true, 15, 15, NOW() - INTERVAL '1 hour' - INTERVAL '20 minutes', 180, 'Good implementation!', false, true, NOW(), NOW()),
('ea_003', 'att_exam_001', 'eq_008', '"def"', true, 5, 5, NOW() - INTERVAL '1 hour' - INTERVAL '15 minutes', 20, NULL, false, false, NOW(), NOW()),
('ea_004', 'att_exam_002', 'eq_006', '"b"', true, 5, 5, NOW() - INTERVAL '2 hours' - INTERVAL '50 minutes', 30, NULL, false, false, NOW(), NOW()),
('ea_005', 'att_exam_002', 'eq_007', '"def sum_list(numbers): return sum(numbers)"', true, 15, 15, NOW() - INTERVAL '2 hours' - INTERVAL '30 minutes', 120, 'Excellent use of built-in function!', false, true, NOW(), NOW()),
('ea_006', 'att_exam_002', 'eq_008', '"def"', true, 5, 5, NOW() - INTERVAL '2 hours' - INTERVAL '25 minutes', 15, NULL, false, false, NOW(), NOW());

-- =====================================================
-- 35. ANTI-CHEAT EVENTS
-- =====================================================
INSERT INTO anti_cheat_events (id, attempt_id, event_type, severity, description, metadata, detected_by, ai_confidence, "timestamp", review_status, created_at) VALUES
('ace_001', 'att_exam_001', 'tab_switch', 'low', 'Student switched tabs briefly', '{"duration_seconds": 2, "tab_title": "Calculator"}', 'browser_monitor', NULL, NOW() - INTERVAL '1 hour' - INTERVAL '30 minutes', 'cleared', NOW()),
('ace_002', 'att_exam_003', 'fullscreen_exit', 'medium', 'Exited fullscreen mode', '{"duration_seconds": 5}', 'browser_monitor', NULL, NOW() - INTERVAL '20 minutes', 'pending', NOW());

-- =====================================================
-- 36. ANTI-CHEAT RISK SCORES
-- =====================================================
INSERT INTO anti_cheat_risk_scores (id, attempt_id, overall_risk_score, risk_level, behavior_score, timing_score, device_score, tab_switch_count, fullscreen_exit_count, requires_manual_review, review_priority, calculated_at, updated_at) VALUES
('acrs_001', 'att_exam_001', 8.5, 'low', 10, 5, 5, 1, 0, false, 0, NOW(), NOW()),
('acrs_002', 'att_exam_002', 2.0, 'low', 0, 2, 4, 0, 0, false, 0, NOW(), NOW()),
('acrs_003', 'att_exam_003', 25.0, 'medium', 20, 10, 10, 0, 1, true, 3, NOW(), NOW());

-- =====================================================
-- 37. BLOCKED USERS
-- =====================================================
INSERT INTO blocked_users (id, user_id, blocked_user_id, reason, created_at) VALUES
('bu_001', 'usr_student_001', 'usr_student_005', 'Personal preference', NOW() - INTERVAL '30 days');

-- =====================================================
-- 38. REPORTED USERS
-- =====================================================
INSERT INTO reported_users (id, reporter_id, reported_user_id, reason, context, status, created_at) VALUES
('ru_001', 'usr_student_002', 'usr_student_003', 'Inappropriate language in chat', 'Used inappropriate words in study group chat', 'resolved', NOW() - INTERVAL '20 days');

-- =====================================================
-- 39. MESSAGE READ RECEIPTS
-- =====================================================
INSERT INTO message_read_receipts (id, message_id, user_id, read_at) VALUES
('mrr_001', 'msg_001', 'usr_student_004', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
('mrr_002', 'msg_001', 'usr_student_005', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes'),
('mrr_003', 'msg_002', 'usr_student_001', NOW() - INTERVAL '2 days' + INTERVAL '12 minutes');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DATABASE SEED COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created sample data for:';
    RAISE NOTICE '- 11 Users (1 admin, 3 teachers, 5 students, 2 parents)';
    RAISE NOTICE '- 7 Courses';
    RAISE NOTICE '- 12 Lessons';
    RAISE NOTICE '- 8 Assignments';
    RAISE NOTICE '- 5 Submissions with 4 Grades';
    RAISE NOTICE '- 5 Announcements';
    RAISE NOTICE '- 5 Events with participants';
    RAISE NOTICE '- Attendance records';
    RAISE NOTICE '- Study groups, conversations, and messages';
    RAISE NOTICE '- 3 Exams with questions and attempts';
    RAISE NOTICE '- Anti-cheat events and risk scores';
    RAISE NOTICE '- And much more!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Default login credentials:';
    RAISE NOTICE 'Email: any user email (e.g., admin@eduverse.com)';
    RAISE NOTICE 'Password: password123';
    RAISE NOTICE '==============================================';
END $$;
