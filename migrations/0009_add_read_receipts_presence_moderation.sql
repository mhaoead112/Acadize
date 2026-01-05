-- Add deliveredAt to messages
ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMP;

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX idx_read_receipts_user ON message_read_receipts(user_id);

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' NOT NULL,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_presence_status ON user_presence(status);

-- Add moderation fields to group_members
ALTER TABLE group_members ADD COLUMN is_muted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE group_members ADD COLUMN is_restricted BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE group_members ADD COLUMN muted_until TIMESTAMP;

-- Add auto_generated to study_groups
ALTER TABLE study_groups ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX idx_study_groups_auto_generated ON study_groups(auto_generated);
CREATE INDEX idx_study_groups_course ON study_groups(course_id);
