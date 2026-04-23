-- P2-T6: Drop legacy chatMessages stub table
-- The real messaging system uses `messages` + `conversations` tables.
-- The `chat_messages` table was never populated or referenced by any route/service.
-- Safe to drop unconditionally.

DROP TABLE IF EXISTS "chat_messages";
