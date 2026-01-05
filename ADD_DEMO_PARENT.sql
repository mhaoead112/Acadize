-- Add demo parent user
-- Password: "password123"
-- Hash (bcrypt with 12 rounds): $2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu

-- Step 1: Add demo parent user
INSERT INTO users (id, username, full_name, email, password_hash, role, is_active, created_at, updated_at) 
VALUES (
  'demo_parent_001', 
  'parent1', 
  'Mary Parent', 
  'parent@demo.com', 
  '$2a$12$0hdp8.JA.yTfsBuYSlLObONzPVRGxMeBncg3tZzgwL91NRTyNYjQu', 
  'parent', 
  true,
  NOW(),
  NOW()
);

-- Step 2: Link demo parent to demo students (student1 and student2)
-- This creates the parent-child relationship

-- First, delete any existing links to avoid conflicts
DELETE FROM parent_children WHERE parent_id = 'demo_parent_001';

-- Now insert the new links
INSERT INTO parent_children (id, parent_id, child_id, linked_at)
VALUES 
  ('pc_link_001', 'demo_parent_001', 'demo_student_001', NOW()),
  ('pc_link_002', 'demo_parent_001', 'demo_student_002', NOW());

-- Verify the links were created
SELECT 
  pc.id,
  p.username as parent_username,
  p.full_name as parent_name,
  s.username as child_username,
  s.full_name as child_name,
  pc.linked_at
FROM parent_children pc
JOIN users p ON pc.parent_id = p.id
JOIN users s ON pc.child_id = s.id
WHERE pc.parent_id = 'demo_parent_001';
