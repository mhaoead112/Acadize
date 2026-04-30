ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS zoom_meeting_uuid varchar(255),
  ADD COLUMN IF NOT EXISTS zoom_join_url text,
  ADD COLUMN IF NOT EXISTS zoom_start_url text,
  ADD COLUMN IF NOT EXISTS zoom_host_email varchar(255);

CREATE INDEX IF NOT EXISTS sessions_zoom_meeting_uuid_idx
  ON sessions (zoom_meeting_uuid);
