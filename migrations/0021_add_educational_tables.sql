-- Educational Metadata Tables

CREATE TABLE learning_objectives (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  blooms_taxonomy_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX learning_objectives_lesson_id_idx ON learning_objectives(lesson_id);

CREATE TABLE prerequisite_concepts (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prerequisite_lesson_id TEXT REFERENCES lessons(id),
  concept_description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX prerequisite_concepts_lesson_id_idx ON prerequisite_concepts(lesson_id);

CREATE TABLE academic_standards (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  standard_code VARCHAR(100) NOT NULL,
  standard_description TEXT NOT NULL,
  subject_area VARCHAR(50),
  grade_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX academic_standards_lesson_id_idx ON academic_standards(lesson_id);

CREATE TABLE lesson_metadata (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  common_misconceptions TEXT, -- JSON array of common student misconceptions
  topic_sequence INTEGER,
  difficulty_level VARCHAR(20),
  estimated_duration_minutes INTEGER,
  keywords TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX lesson_metadata_lesson_id_idx ON lesson_metadata(lesson_id);

CREATE TABLE student_model (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id),
  concept_mastery TEXT,
  learning_preferences TEXT,
  engagement_score REAL,
  struggle_areas TEXT,
  breakthrough_moments TEXT,
  preferred_explanation_style VARCHAR(50),
  total_interactions INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX student_model_student_id_idx ON student_model(student_id);

CREATE TABLE teacher_custom_prompts (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id),
  title VARCHAR(255) NOT NULL,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX teacher_custom_prompts_teacher_id_idx ON teacher_custom_prompts(teacher_id);

CREATE TABLE ai_interaction_analytics (
  id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
  student_id TEXT REFERENCES users(id),
  lesson_id TEXT REFERENCES lessons(id),
  question TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  persona_used VARCHAR(50),
  teaching_strategy_used VARCHAR(50),
  helpfulness_rating INTEGER,
  follow_up_questions TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX ai_interaction_analytics_student_id_idx ON ai_interaction_analytics(student_id);