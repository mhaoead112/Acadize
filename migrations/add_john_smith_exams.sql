-- =====================================================
-- EXAM SEED DATA FOR TEACHER JOHN SMITH
-- Various question types and styles for demonstration
-- Run this after the main seed_data.sql
-- =====================================================

-- First, get John Smith's user ID (should be 'usr_teacher_001' from seed data)
-- Assumes courses 'crs_001' (Algebra Fundamentals) and 'crs_002' (Advanced Calculus) exist

-- =====================================================
-- EXAM 1: Algebra Midterm - Multiple Choice & True/False Heavy
-- =====================================================
INSERT INTO exams (
  id, course_id, created_by, title, description, instructions,
  status, scheduled_start_at, scheduled_end_at, duration,
  total_points, passing_score, attempts_allowed, max_attempts,
  shuffle_questions, shuffle_options, show_results_immediately, show_correct_answers,
  allow_backtracking, anti_cheat_enabled, require_webcam, require_fullscreen,
  copy_paste_allowed, right_click_allowed, tab_switch_limit,
  retake_enabled, adaptive_retake, created_at, updated_at
) VALUES (
  'exam_algebra_mid_001',
  'crs_001',
  'usr_teacher_001',
  'Algebra Midterm Examination',
  'Comprehensive midterm exam covering linear equations, inequalities, and basic functions. This exam tests your understanding of core algebraic concepts.',
  'Read each question carefully. You may not use a calculator for this exam. Show all work for partial credit on short answer questions. You have 90 minutes to complete all questions.',
  'scheduled',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
  90,
  150,
  70,
  '1',
  1,
  true,
  true,
  false,
  false,
  true,
  true,
  true,
  true,
  false,
  false,
  3,
  true,
  true,
  NOW(),
  NOW()
);

-- Algebra Midterm Questions
INSERT INTO exam_questions (
  id, exam_id, question_type, question_text, options, correct_answer,
  points, partial_credit_enabled, topic, subtopic, skill_tag,
  difficulty_level, "order", requires_manual_grading, created_at, updated_at
) VALUES
-- Multiple Choice Questions (Easy)
('q_alg_mid_001', 'exam_algebra_mid_001', 'multiple_choice',
  'What is the solution to the equation 3x + 9 = 24?',
  '[{"id": "a", "text": "x = 5"}, {"id": "b", "text": "x = 7"}, {"id": "c", "text": "x = 11"}, {"id": "d", "text": "x = 8"}]',
  '"a"',
  5, false, 'Algebra', 'Linear Equations', 'problem_solving', 'easy', 1, false, NOW(), NOW()),

('q_alg_mid_002', 'exam_algebra_mid_001', 'multiple_choice',
  'Which expression is equivalent to 2(3x - 4) + 5x?',
  '[{"id": "a", "text": "11x - 8"}, {"id": "b", "text": "6x - 8 + 5x"}, {"id": "c", "text": "11x - 4"}, {"id": "d", "text": "6x + 1"}]',
  '"a"',
  5, false, 'Algebra', 'Simplifying Expressions', 'conceptual_understanding', 'easy', 2, false, NOW(), NOW()),

('q_alg_mid_003', 'exam_algebra_mid_001', 'multiple_choice',
  'If f(x) = 2x + 3, what is f(5)?',
  '[{"id": "a", "text": "10"}, {"id": "b", "text": "13"}, {"id": "c", "text": "8"}, {"id": "d", "text": "25"}]',
  '"b"',
  5, false, 'Algebra', 'Functions', 'application', 'easy', 3, false, NOW(), NOW()),

-- Multiple Choice Questions (Medium)
('q_alg_mid_004', 'exam_algebra_mid_001', 'multiple_choice',
  'Solve for x: 2(x - 3) = 4x + 8',
  '[{"id": "a", "text": "x = -7"}, {"id": "b", "text": "x = -14"}, {"id": "c", "text": "x = 7"}, {"id": "d", "text": "x = 1"}]',
  '"a"',
  8, false, 'Algebra', 'Linear Equations', 'problem_solving', 'medium', 4, false, NOW(), NOW()),

('q_alg_mid_005', 'exam_algebra_mid_001', 'multiple_choice',
  'Which inequality represents "a number x decreased by 7 is at least 15"?',
  '[{"id": "a", "text": "x - 7 > 15"}, {"id": "b", "text": "x - 7 ≥ 15"}, {"id": "c", "text": "x - 7 ≤ 15"}, {"id": "d", "text": "7 - x ≥ 15"}]',
  '"b"',
  8, false, 'Algebra', 'Inequalities', 'conceptual_understanding', 'medium', 5, false, NOW(), NOW()),

('q_alg_mid_006', 'exam_algebra_mid_001', 'multiple_choice',
  'The graph of y = 2x - 3 passes through which point?',
  '[{"id": "a", "text": "(0, -3)"}, {"id": "b", "text": "(0, 3)"}, {"id": "c", "text": "(-3, 0)"}, {"id": "d", "text": "(2, -3)"}]',
  '"a"',
  8, false, 'Algebra', 'Graphing Linear Equations', 'application', 'medium', 6, false, NOW(), NOW()),

-- True/False Questions
('q_alg_mid_007', 'exam_algebra_mid_001', 'true_false',
  'The expression (x + 5)² is equivalent to x² + 25.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"false"',
  5, false, 'Algebra', 'Expanding Expressions', 'conceptual_understanding', 'medium', 7, false, NOW(), NOW()),

('q_alg_mid_008', 'exam_algebra_mid_001', 'true_false',
  'If a < b and c > 0, then ac < bc.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"true"',
  5, false, 'Algebra', 'Inequalities', 'conceptual_understanding', 'medium', 8, false, NOW(), NOW()),

('q_alg_mid_009', 'exam_algebra_mid_001', 'true_false',
  'The slope of a horizontal line is undefined.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"false"',
  5, false, 'Algebra', 'Slope', 'recall', 'easy', 9, false, NOW(), NOW()),

('q_alg_mid_010', 'exam_algebra_mid_001', 'true_false',
  'Two lines with the same slope are always parallel.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"false"',
  5, false, 'Algebra', 'Parallel Lines', 'conceptual_understanding', 'hard', 10, false, NOW(), NOW()),

-- Fill in the Blank
('q_alg_mid_011', 'exam_algebra_mid_001', 'fill_blank',
  'The slope-intercept form of a linear equation is y = mx + ___.',
  NULL,
  '["b", "B"]',
  5, false, 'Algebra', 'Linear Equations', 'recall', 'easy', 11, false, NOW(), NOW()),

('q_alg_mid_012', 'exam_algebra_mid_001', 'fill_blank',
  'If 5x = 35, then x = ___.',
  NULL,
  '["7"]',
  5, false, 'Algebra', 'Solving Equations', 'problem_solving', 'easy', 12, false, NOW(), NOW()),

('q_alg_mid_013', 'exam_algebra_mid_001', 'fill_blank',
  'The expression 3x + 2x simplifies to ___x.',
  NULL,
  '["5"]',
  5, false, 'Algebra', 'Combining Like Terms', 'application', 'easy', 13, false, NOW(), NOW()),

-- Short Answer Questions
('q_alg_mid_014', 'exam_algebra_mid_001', 'short_answer',
  'Solve for y: 4y - 12 = 2y + 8. Show your work.',
  NULL,
  '"10"',
  10, true, 'Algebra', 'Linear Equations', 'problem_solving', 'medium', 14, false, NOW(), NOW()),

('q_alg_mid_015', 'exam_algebra_mid_001', 'short_answer',
  'Find the slope of the line passing through points (2, 5) and (6, 13).',
  NULL,
  '"2"',
  10, true, 'Algebra', 'Slope', 'application', 'medium', 15, false, NOW(), NOW()),

('q_alg_mid_016', 'exam_algebra_mid_001', 'short_answer',
  'Simplify: 3(2x + 4) - 2(x - 1)',
  NULL,
  '"4x + 14"',
  10, true, 'Algebra', 'Simplifying Expressions', 'problem_solving', 'medium', 16, false, NOW(), NOW()),

-- Essay Questions
('q_alg_mid_017', 'exam_algebra_mid_001', 'essay',
  'Explain the difference between an expression and an equation. Provide two examples of each and describe when you would use each in real-world scenarios.',
  NULL,
  '"rubric_based"',
  20, true, 'Algebra', 'Foundations', 'critical_thinking', 'medium', 17, true, NOW(), NOW()),

('q_alg_mid_018', 'exam_algebra_mid_001', 'essay',
  'A phone plan charges $25 per month plus $0.10 per text message. Write an equation to represent the total monthly cost, explain each variable, graph the relationship, and determine the cost for 150 text messages.',
  NULL,
  '"rubric_based"',
  25, true, 'Algebra', 'Word Problems', 'application', 'hard', 18, true, NOW(), NOW());


-- =====================================================
-- EXAM 2: Calculus Quiz - Mixed Format
-- =====================================================
INSERT INTO exams (
  id, course_id, created_by, title, description, instructions,
  status, scheduled_start_at, scheduled_end_at, duration,
  total_points, passing_score, attempts_allowed, max_attempts,
  shuffle_questions, shuffle_options, show_results_immediately, show_correct_answers,
  allow_backtracking, anti_cheat_enabled, require_webcam, require_fullscreen,
  copy_paste_allowed, right_click_allowed, tab_switch_limit,
  retake_enabled, adaptive_retake, created_at, updated_at
) VALUES (
  'exam_calc_quiz_001',
  'crs_002',
  'usr_teacher_001',
  'Derivatives Pop Quiz',
  'Short quiz on basic derivative rules and applications. Tests understanding of power rule, product rule, and chain rule.',
  'Answer all questions. Calculators are NOT allowed. You have 30 minutes.',
  'active',
  NOW() - INTERVAL '1 hour',
  NOW() + INTERVAL '48 hours',
  30,
  50,
  60,
  '2',
  2,
  true,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  false,
  false,
  5,
  true,
  false,
  NOW(),
  NOW()
);

-- Calculus Quiz Questions
INSERT INTO exam_questions (
  id, exam_id, question_type, question_text, options, correct_answer,
  points, partial_credit_enabled, topic, subtopic, skill_tag,
  difficulty_level, "order", requires_manual_grading, created_at, updated_at
) VALUES
-- Multiple Choice
('q_calc_001', 'exam_calc_quiz_001', 'multiple_choice',
  'What is the derivative of f(x) = x³?',
  '[{"id": "a", "text": "3x²"}, {"id": "b", "text": "x²"}, {"id": "c", "text": "3x³"}, {"id": "d", "text": "x⁴/4"}]',
  '"a"',
  5, false, 'Calculus', 'Power Rule', 'application', 'easy', 1, false, NOW(), NOW()),

('q_calc_002', 'exam_calc_quiz_001', 'multiple_choice',
  'Find d/dx [sin(x) · cos(x)] using the product rule.',
  '[{"id": "a", "text": "cos²(x) - sin²(x)"}, {"id": "b", "text": "-sin(x)cos(x)"}, {"id": "c", "text": "cos(2x)"}, {"id": "d", "text": "Both A and C are correct"}]',
  '"d"',
  8, false, 'Calculus', 'Product Rule', 'problem_solving', 'medium', 2, false, NOW(), NOW()),

('q_calc_003', 'exam_calc_quiz_001', 'multiple_choice',
  'What is the derivative of f(x) = e^(2x)?',
  '[{"id": "a", "text": "e^(2x)"}, {"id": "b", "text": "2e^(2x)"}, {"id": "c", "text": "e^(2x)/2"}, {"id": "d", "text": "2xe^(2x)"}]',
  '"b"',
  8, false, 'Calculus', 'Chain Rule', 'application', 'medium', 3, false, NOW(), NOW()),

-- Fill in the Blank
('q_calc_004', 'exam_calc_quiz_001', 'fill_blank',
  'The derivative of a constant is ___.',
  NULL,
  '["0", "zero"]',
  5, false, 'Calculus', 'Basic Rules', 'recall', 'easy', 4, false, NOW(), NOW()),

('q_calc_005', 'exam_calc_quiz_001', 'fill_blank',
  'If f(x) = x⁵, then f''(x) = ___x⁴.',
  NULL,
  '["5"]',
  5, false, 'Calculus', 'Power Rule', 'application', 'easy', 5, false, NOW(), NOW()),

-- Short Answer
('q_calc_006', 'exam_calc_quiz_001', 'short_answer',
  'Find the derivative of f(x) = 3x⁴ - 2x² + 7x - 1.',
  NULL,
  '"12x³ - 4x + 7"',
  10, true, 'Calculus', 'Power Rule', 'problem_solving', 'medium', 6, false, NOW(), NOW()),

-- True/False
('q_calc_007', 'exam_calc_quiz_001', 'true_false',
  'The derivative of ln(x) is 1/x for x > 0.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"true"',
  5, false, 'Calculus', 'Logarithmic Functions', 'recall', 'easy', 7, false, NOW(), NOW()),

('q_calc_008', 'exam_calc_quiz_001', 'true_false',
  'If f(x) = x², then f''''(x) = 2 (the second derivative is 2).',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"true"',
  4, false, 'Calculus', 'Higher Derivatives', 'conceptual_understanding', 'medium', 8, false, NOW(), NOW());


-- =====================================================
-- EXAM 3: Algebra Final - Comprehensive with Matching
-- =====================================================
INSERT INTO exams (
  id, course_id, created_by, title, description, instructions,
  status, scheduled_start_at, scheduled_end_at, duration,
  total_points, passing_score, attempts_allowed, max_attempts,
  shuffle_questions, shuffle_options, show_results_immediately, show_correct_answers,
  allow_backtracking, anti_cheat_enabled, require_webcam, require_fullscreen,
  copy_paste_allowed, right_click_allowed, tab_switch_limit,
  retake_enabled, adaptive_retake, created_at, updated_at
) VALUES (
  'exam_algebra_final_001',
  'crs_001',
  'usr_teacher_001',
  'Algebra Final Examination',
  'Comprehensive final exam covering all topics from the semester including equations, inequalities, functions, graphing, and word problems.',
  'This is a comprehensive final exam. Read all questions carefully. You may use a scientific calculator (no graphing calculators). Show all work for full credit. You have 2 hours to complete the exam.',
  'draft',
  NULL,
  NULL,
  120,
  200,
  65,
  '1',
  1,
  true,
  true,
  false,
  false,
  true,
  true,
  true,
  true,
  false,
  false,
  2,
  false,
  false,
  NOW(),
  NOW()
);

-- Algebra Final Questions
INSERT INTO exam_questions (
  id, exam_id, question_type, question_text, options, correct_answer,
  points, partial_credit_enabled, topic, subtopic, skill_tag,
  difficulty_level, "order", section_name, requires_manual_grading, created_at, updated_at
) VALUES
-- Section A: Multiple Choice (Fundamentals)
('q_alg_fin_001', 'exam_algebra_final_001', 'multiple_choice',
  'Solve: -3(x - 4) + 2 = 2x - 3',
  '[{"id": "a", "text": "x = 3.4"}, {"id": "b", "text": "x = 17/5"}, {"id": "c", "text": "x = 2.6"}, {"id": "d", "text": "x = -3.4"}]',
  '"b"',
  5, false, 'Algebra', 'Linear Equations', 'problem_solving', 'medium', 1, 'Section A: Fundamentals', false, NOW(), NOW()),

('q_alg_fin_002', 'exam_algebra_final_001', 'multiple_choice',
  'Which represents the solution to |2x - 1| < 5?',
  '[{"id": "a", "text": "-2 < x < 3"}, {"id": "b", "text": "x < -2 or x > 3"}, {"id": "c", "text": "-3 < x < 2"}, {"id": "d", "text": "x < 3"}]',
  '"a"',
  8, false, 'Algebra', 'Absolute Value', 'problem_solving', 'hard', 2, 'Section A: Fundamentals', false, NOW(), NOW()),

('q_alg_fin_003', 'exam_algebra_final_001', 'multiple_choice',
  'Factor completely: x² - 9x + 20',
  '[{"id": "a", "text": "(x - 4)(x - 5)"}, {"id": "b", "text": "(x + 4)(x + 5)"}, {"id": "c", "text": "(x - 4)(x + 5)"}, {"id": "d", "text": "(x - 2)(x - 10)"}]',
  '"a"',
  8, false, 'Algebra', 'Factoring', 'problem_solving', 'medium', 3, 'Section A: Fundamentals', false, NOW(), NOW()),

-- Section B: Matching
('q_alg_fin_004', 'exam_algebra_final_001', 'matching',
  'Match each equation type with its standard form:\n\n1. Linear equation\n2. Quadratic equation\n3. Absolute value equation\n4. Exponential equation',
  '[{"id": "A", "text": "y = ab^x"}, {"id": "B", "text": "ax² + bx + c = 0"}, {"id": "C", "text": "|ax + b| = c"}, {"id": "D", "text": "y = mx + b"}]',
  '{"1": "D", "2": "B", "3": "C", "4": "A"}',
  12, true, 'Algebra', 'Equation Types', 'conceptual_understanding', 'medium', 4, 'Section B: Matching', false, NOW(), NOW()),

('q_alg_fin_005', 'exam_algebra_final_001', 'matching',
  'Match each property with its example:\n\n1. Commutative Property\n2. Associative Property\n3. Distributive Property\n4. Identity Property',
  '[{"id": "A", "text": "a(b + c) = ab + ac"}, {"id": "B", "text": "a + 0 = a"}, {"id": "C", "text": "a + b = b + a"}, {"id": "D", "text": "(a + b) + c = a + (b + c)"}]',
  '{"1": "C", "2": "D", "3": "A", "4": "B"}',
  12, true, 'Algebra', 'Properties', 'recall', 'easy', 5, 'Section B: Matching', false, NOW(), NOW()),

-- Section C: Fill in the Blank
('q_alg_fin_006', 'exam_algebra_final_001', 'fill_blank',
  'The quadratic formula states x = (-b ± √(b² - 4ac)) / ___.',
  NULL,
  '["2a"]',
  5, false, 'Algebra', 'Quadratic Formula', 'recall', 'easy', 6, 'Section C: Fill in the Blank', false, NOW(), NOW()),

('q_alg_fin_007', 'exam_algebra_final_001', 'fill_blank',
  'In the equation y = mx + b, the letter m represents the ___.',
  NULL,
  '["slope", "rate of change"]',
  5, false, 'Algebra', 'Linear Equations', 'recall', 'easy', 7, 'Section C: Fill in the Blank', false, NOW(), NOW()),

('q_alg_fin_008', 'exam_algebra_final_001', 'fill_blank',
  'Two lines are perpendicular if the product of their slopes equals ___.',
  NULL,
  '["-1"]',
  5, false, 'Algebra', 'Perpendicular Lines', 'recall', 'medium', 8, 'Section C: Fill in the Blank', false, NOW(), NOW()),

-- Section D: Short Answer
('q_alg_fin_009', 'exam_algebra_final_001', 'short_answer',
  'Solve the system of equations:\n2x + 3y = 12\nx - y = 1\n\nProvide x and y values.',
  NULL,
  '{"x": "3", "y": "2"}',
  15, true, 'Algebra', 'Systems of Equations', 'problem_solving', 'medium', 9, 'Section D: Short Answer', false, NOW(), NOW()),

('q_alg_fin_010', 'exam_algebra_final_001', 'short_answer',
  'Find the vertex of the parabola y = x² - 6x + 5.',
  NULL,
  '"(3, -4)"',
  15, true, 'Algebra', 'Quadratic Functions', 'application', 'hard', 10, 'Section D: Short Answer', false, NOW(), NOW()),

('q_alg_fin_011', 'exam_algebra_final_001', 'short_answer',
  'Solve for x: log₂(x) + log₂(x - 2) = 3',
  NULL,
  '"4"',
  15, true, 'Algebra', 'Logarithms', 'problem_solving', 'hard', 11, 'Section D: Short Answer', false, NOW(), NOW()),

-- Section E: Essay/Extended Response
('q_alg_fin_012', 'exam_algebra_final_001', 'essay',
  'A small business sells custom t-shirts. The cost function is C(x) = 5x + 200, where x is the number of shirts and C(x) is the total cost in dollars. The revenue function is R(x) = 15x.\n\na) Write the profit function P(x).\nb) How many shirts must be sold to break even?\nc) How many shirts must be sold to make a profit of $500?\nd) Explain what the y-intercept of the cost function represents in the context of this problem.',
  NULL,
  '"rubric_based"',
  25, true, 'Algebra', 'Word Problems', 'application', 'hard', 12, 'Section E: Extended Response', true, NOW(), NOW()),

('q_alg_fin_013', 'exam_algebra_final_001', 'essay',
  'Compare and contrast linear functions and quadratic functions. Include in your response:\n\n• The general form of each function type\n• How to identify each from a graph\n• How to identify each from a table of values\n• At least one real-world example of each\n• How the rate of change differs between the two types',
  NULL,
  '"rubric_based"',
  30, true, 'Algebra', 'Functions', 'critical_thinking', 'hard', 13, 'Section E: Extended Response', true, NOW(), NOW()),

-- Section F: Code/Computation (for variety - practical application)
('q_alg_fin_014', 'exam_algebra_final_001', 'code',
  'Write a step-by-step algorithm (in pseudocode or plain English) to solve a system of two linear equations using the substitution method. Then demonstrate your algorithm by solving:\n\ny = 2x + 3\n3x + y = 13',
  NULL,
  '"x = 2, y = 7"',
  20, true, 'Algebra', 'Systems of Equations', 'application', 'hard', 14, 'Section F: Practical Application', true, NOW(), NOW()),

-- True/False section
('q_alg_fin_015', 'exam_algebra_final_001', 'true_false',
  'The graph of y = x² is symmetric about the y-axis.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"true"',
  5, false, 'Algebra', 'Quadratic Functions', 'conceptual_understanding', 'easy', 15, 'Section G: True or False', false, NOW(), NOW()),

('q_alg_fin_016', 'exam_algebra_final_001', 'true_false',
  'Every quadratic equation has exactly two real solutions.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"false"',
  5, false, 'Algebra', 'Quadratic Equations', 'conceptual_understanding', 'medium', 16, 'Section G: True or False', false, NOW(), NOW()),

('q_alg_fin_017', 'exam_algebra_final_001', 'true_false',
  'If f(x) = x + 3 and g(x) = x - 3, then f(g(x)) = x.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"true"',
  5, false, 'Algebra', 'Function Composition', 'conceptual_understanding', 'medium', 17, 'Section G: True or False', false, NOW(), NOW()),

('q_alg_fin_018', 'exam_algebra_final_001', 'true_false',
  'The domain of f(x) = √x is all real numbers.',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"false"',
  5, false, 'Algebra', 'Functions', 'conceptual_understanding', 'easy', 18, 'Section G: True or False', false, NOW(), NOW());


-- =====================================================
-- EXAM 4: Quick Practice Quiz - All Easy Questions
-- =====================================================
INSERT INTO exams (
  id, course_id, created_by, title, description, instructions,
  status, scheduled_start_at, scheduled_end_at, duration,
  total_points, passing_score, attempts_allowed, max_attempts,
  shuffle_questions, shuffle_options, show_results_immediately, show_correct_answers,
  allow_backtracking, anti_cheat_enabled, require_webcam, require_fullscreen,
  copy_paste_allowed, right_click_allowed, tab_switch_limit,
  retake_enabled, adaptive_retake, created_at, updated_at
) VALUES (
  'exam_algebra_practice_001',
  'crs_001',
  'usr_teacher_001',
  'Algebra Warm-Up Practice',
  'Quick practice quiz to review basic concepts. Unlimited attempts allowed - use this to prepare for the midterm!',
  'This is a practice quiz. Take your time and learn from any mistakes. Results are shown immediately.',
  'active',
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '60 days',
  15,
  40,
  50,
  'unlimited',
  100,
  true,
  true,
  true,
  true,
  true,
  false,
  false,
  false,
  true,
  true,
  100,
  true,
  false,
  NOW(),
  NOW()
);

-- Practice Quiz Questions
INSERT INTO exam_questions (
  id, exam_id, question_type, question_text, options, correct_answer,
  points, partial_credit_enabled, topic, subtopic, skill_tag,
  difficulty_level, "order", requires_manual_grading, created_at, updated_at
) VALUES
('q_prac_001', 'exam_algebra_practice_001', 'multiple_choice',
  'What is 3 + 5 × 2?',
  '[{"id": "a", "text": "16"}, {"id": "b", "text": "13"}, {"id": "c", "text": "11"}, {"id": "d", "text": "10"}]',
  '"b"',
  5, false, 'Algebra', 'Order of Operations', 'recall', 'easy', 1, false, NOW(), NOW()),

('q_prac_002', 'exam_algebra_practice_001', 'multiple_choice',
  'Simplify: 4x + 3x',
  '[{"id": "a", "text": "7x"}, {"id": "b", "text": "12x"}, {"id": "c", "text": "7x²"}, {"id": "d", "text": "x⁷"}]',
  '"a"',
  5, false, 'Algebra', 'Combining Like Terms', 'application', 'easy', 2, false, NOW(), NOW()),

('q_prac_003', 'exam_algebra_practice_001', 'true_false',
  '5² = 10',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"false"',
  5, false, 'Algebra', 'Exponents', 'recall', 'easy', 3, false, NOW(), NOW()),

('q_prac_004', 'exam_algebra_practice_001', 'fill_blank',
  'If x + 4 = 9, then x = ___.',
  NULL,
  '["5"]',
  5, false, 'Algebra', 'Solving Equations', 'problem_solving', 'easy', 4, false, NOW(), NOW()),

('q_prac_005', 'exam_algebra_practice_001', 'multiple_choice',
  'Which is equivalent to 2³?',
  '[{"id": "a", "text": "6"}, {"id": "b", "text": "8"}, {"id": "c", "text": "9"}, {"id": "d", "text": "5"}]',
  '"b"',
  5, false, 'Algebra', 'Exponents', 'recall', 'easy', 5, false, NOW(), NOW()),

('q_prac_006', 'exam_algebra_practice_001', 'fill_blank',
  'The opposite of -7 is ___.',
  NULL,
  '["7"]',
  5, false, 'Algebra', 'Integers', 'recall', 'easy', 6, false, NOW(), NOW()),

('q_prac_007', 'exam_algebra_practice_001', 'true_false',
  '-5 + (-3) = -8',
  '[{"id": "true", "text": "True"}, {"id": "false", "text": "False"}]',
  '"true"',
  5, false, 'Algebra', 'Integer Operations', 'application', 'easy', 7, false, NOW(), NOW()),

('q_prac_008', 'exam_algebra_practice_001', 'multiple_choice',
  'What is the value of |−12|?',
  '[{"id": "a", "text": "-12"}, {"id": "b", "text": "12"}, {"id": "c", "text": "0"}, {"id": "d", "text": "1/12"}]',
  '"b"',
  5, false, 'Algebra', 'Absolute Value', 'recall', 'easy', 8, false, NOW(), NOW());


-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'EXAM SEED DATA COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Created exams for teacher John Smith:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Algebra Midterm Examination (exam_algebra_mid_001)';
    RAISE NOTICE '   - Status: Scheduled';
    RAISE NOTICE '   - 18 questions, 150 points';
    RAISE NOTICE '   - Question types: Multiple Choice, True/False, Fill Blank, Short Answer, Essay';
    RAISE NOTICE '';
    RAISE NOTICE '2. Derivatives Pop Quiz (exam_calc_quiz_001)';
    RAISE NOTICE '   - Status: Active';
    RAISE NOTICE '   - 8 questions, 50 points';
    RAISE NOTICE '   - Question types: Multiple Choice, Fill Blank, Short Answer, True/False';
    RAISE NOTICE '';
    RAISE NOTICE '3. Algebra Final Examination (exam_algebra_final_001)';
    RAISE NOTICE '   - Status: Draft';
    RAISE NOTICE '   - 18 questions, 200 points';
    RAISE NOTICE '   - Question types: ALL types including Matching and Code';
    RAISE NOTICE '   - Organized into sections';
    RAISE NOTICE '';
    RAISE NOTICE '4. Algebra Warm-Up Practice (exam_algebra_practice_001)';
    RAISE NOTICE '   - Status: Active';
    RAISE NOTICE '   - 8 questions, 40 points';
    RAISE NOTICE '   - Unlimited attempts, immediate feedback';
    RAISE NOTICE '==============================================';
END $$;
