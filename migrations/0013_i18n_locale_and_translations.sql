-- i18n: organization and user locale columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_locale varchar(5) DEFAULT 'en' NOT NULL,
  ADD COLUMN IF NOT EXISTS enabled_locales jsonb DEFAULT '["en"]'::jsonb NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_locale varchar(5);

-- Reference table for supported locales
CREATE TABLE IF NOT EXISTS locales (
  code varchar(5) PRIMARY KEY,
  name varchar(100) NOT NULL,
  native_name varchar(100) NOT NULL,
  dir varchar(3) DEFAULT 'ltr' NOT NULL,
  is_default boolean DEFAULT false NOT NULL
);

INSERT INTO locales (code, name, native_name, dir, is_default) VALUES
  ('en', 'English', 'English', 'ltr', true),
  ('ar', 'Arabic', 'العربية', 'rtl', false)
ON CONFLICT (code) DO NOTHING;

-- Translation tables
CREATE TABLE IF NOT EXISTS course_translations (
  id text PRIMARY KEY,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  locale varchar(5) NOT NULL,
  title text NOT NULL,
  description text,
  updated_at timestamp DEFAULT now(),
  UNIQUE(course_id, locale)
);
CREATE INDEX IF NOT EXISTS course_translations_course_locale_idx ON course_translations(course_id, locale);

CREATE TABLE IF NOT EXISTS lesson_translations (
  id text PRIMARY KEY,
  lesson_id text NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  locale varchar(5) NOT NULL,
  title text NOT NULL,
  content text,
  updated_at timestamp DEFAULT now(),
  UNIQUE(lesson_id, locale)
);
CREATE INDEX IF NOT EXISTS lesson_translations_lesson_locale_idx ON lesson_translations(lesson_id, locale);

CREATE TABLE IF NOT EXISTS announcement_translations (
  id text PRIMARY KEY,
  announcement_id text NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  locale varchar(5) NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  updated_at timestamp DEFAULT now(),
  UNIQUE(announcement_id, locale)
);
CREATE INDEX IF NOT EXISTS announcement_translations_announcement_locale_idx ON announcement_translations(announcement_id, locale);

CREATE TABLE IF NOT EXISTS exam_translations (
  id text PRIMARY KEY,
  exam_id text NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  locale varchar(5) NOT NULL,
  title varchar(500) NOT NULL,
  instructions text,
  updated_at timestamp DEFAULT now(),
  UNIQUE(exam_id, locale)
);
CREATE INDEX IF NOT EXISTS exam_translations_exam_locale_idx ON exam_translations(exam_id, locale);

-- Backfill en from existing data (use cuid2-like id; PostgreSQL gen_random_uuid() or simple id)
-- Course translations backfill
INSERT INTO course_translations (id, course_id, locale, title, description, updated_at)
SELECT
  'ct_' || c.id || '_en',
  c.id,
  'en',
  c.title,
  c.description,
  COALESCE(c.updated_at, c.created_at)
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM course_translations ct WHERE ct.course_id = c.id AND ct.locale = 'en');

-- Lesson translations backfill
INSERT INTO lesson_translations (id, lesson_id, locale, title, content, updated_at)
SELECT
  'lt_' || l.id || '_en',
  l.id,
  'en',
  l.title,
  NULL,
  COALESCE(l.updated_at, l.created_at)
FROM lessons l
WHERE NOT EXISTS (SELECT 1 FROM lesson_translations lt WHERE lt.lesson_id = l.id AND lt.locale = 'en');

-- Announcement translations backfill (body = content)
INSERT INTO announcement_translations (id, announcement_id, locale, title, body, updated_at)
SELECT
  'at_' || a.id || '_en',
  a.id,
  'en',
  a.title,
  a.content,
  COALESCE(a.updated_at, a.created_at)
FROM announcements a
WHERE NOT EXISTS (SELECT 1 FROM announcement_translations at WHERE at.announcement_id = a.id AND at.locale = 'en');

-- Exam translations backfill
INSERT INTO exam_translations (id, exam_id, locale, title, instructions, updated_at)
SELECT
  'et_' || e.id || '_en',
  e.id,
  'en',
  e.title,
  e.instructions,
  COALESCE(e.updated_at, e.created_at)
FROM exams e
WHERE NOT EXISTS (SELECT 1 FROM exam_translations et WHERE et.exam_id = e.id AND et.locale = 'en');
