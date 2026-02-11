-- Migration: Add Multi-Tenant Organizations
-- This migration adds the organizations table and organization_id columns
-- to existing tables for multi-tenant support.

-- =====================================================
-- STEP 1: Create organization_plan enum
-- =====================================================
CREATE TYPE organization_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');

-- =====================================================
-- STEP 2: Create organizations table
-- =====================================================
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(63) NOT NULL UNIQUE,
  custom_domain VARCHAR(255) UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
  plan organization_plan DEFAULT 'free' NOT NULL,
  max_users INTEGER DEFAULT 50,
  max_storage_gb INTEGER DEFAULT 5,
  config JSONB DEFAULT '{}',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  suspended_at TIMESTAMP,
  suspension_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX org_subdomain_idx ON organizations(subdomain);
CREATE INDEX org_custom_domain_idx ON organizations(custom_domain);
CREATE INDEX org_plan_idx ON organizations(plan);
CREATE INDEX org_active_idx ON organizations(is_active);

-- =====================================================
-- STEP 3: Create organization_invites table
-- =====================================================
CREATE TABLE organization_invites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'student' NOT NULL,
  invited_by TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX org_invite_org_idx ON organization_invites(organization_id);
CREATE INDEX org_invite_email_idx ON organization_invites(email);
CREATE UNIQUE INDEX org_invite_token_idx ON organization_invites(token);

-- =====================================================
-- STEP 4: Create default organization for existing data
-- =====================================================
INSERT INTO organizations (id, name, subdomain, primary_color, plan, is_active, created_at)
VALUES (
  'org_default_system',
  'Default Organization',
  'default',
  '#6366f1',
  'enterprise',
  true,
  NOW()
);

-- =====================================================
-- STEP 5: Add organization_id to users table
-- =====================================================
ALTER TABLE users ADD COLUMN organization_id TEXT;

-- Backfill existing users with default org
UPDATE users SET organization_id = 'org_default_system' WHERE organization_id IS NULL;

-- Make organization_id NOT NULL and add foreign key
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Drop old unique constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Create composite unique indexes (per-organization)
CREATE INDEX users_org_idx ON users(organization_id);
CREATE UNIQUE INDEX users_org_email_idx ON users(organization_id, email);
CREATE UNIQUE INDEX users_org_username_idx ON users(organization_id, username);

-- =====================================================
-- STEP 6: Add organization_id to courses table
-- =====================================================
ALTER TABLE courses ADD COLUMN organization_id TEXT;

-- Backfill existing courses with default org
UPDATE courses SET organization_id = 'org_default_system' WHERE organization_id IS NULL;

-- Make organization_id NOT NULL and add foreign key
ALTER TABLE courses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE courses ADD CONSTRAINT courses_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX courses_org_idx ON courses(organization_id);
CREATE INDEX courses_teacher_idx ON courses(teacher_id);

-- =====================================================
-- STEP 7: Add organization_id to exams table
-- =====================================================
ALTER TABLE exams ADD COLUMN organization_id TEXT;

-- Backfill existing exams with default org
UPDATE exams SET organization_id = 'org_default_system' WHERE organization_id IS NULL;

-- Make organization_id NOT NULL and add foreign key
ALTER TABLE exams ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE exams ADD CONSTRAINT exams_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX exams_org_idx ON exams(organization_id);
