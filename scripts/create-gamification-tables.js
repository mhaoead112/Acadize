/**
 * Creates all gamification tables in PostgreSQL.
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 *
 * Tables created:
 *   gamification_settings
 *   gamification_point_rules
 *   gamification_levels
 *   gamification_badges
 *   user_gamification_profiles
 *   gamification_events
 *   user_badges
 *
 * Also seeds default point rules for any organization that doesn't already have them.
 *
 * Usage:  node scripts/create-gamification-tables.js
 * Or:     npm run db:gamification  (from root)
 */

import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from root first, then server/ (server/ wins on conflict)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is required. Set it in .env or server/.env');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function exec(client, label, sql) {
  try {
    await client.query(sql);
    console.log(`  ✅  ${label}`);
  } catch (err) {
    console.error(`  ❌  ${label}: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

async function run() {
  const client = await pool.connect();
  console.log('\n🎮  Starting gamification schema migration…\n');

  try {
    await client.query('BEGIN');

    // ------------------------------------------------------------------
    // 1. gamification_settings
    //    PK = organization_id (one row per org)
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE gamification_settings', `
      CREATE TABLE IF NOT EXISTS gamification_settings (
        organization_id   TEXT        PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
        enabled           BOOLEAN     NOT NULL DEFAULT FALSE,
        points_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
        levels_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
        badges_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
        leaderboard_enabled BOOLEAN   NOT NULL DEFAULT FALSE,
        level_naming      VARCHAR(50) NOT NULL DEFAULT 'Level',
        point_naming      VARCHAR(50) NOT NULL DEFAULT 'XP',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ          DEFAULT NOW()
      );
    `);

    // ------------------------------------------------------------------
    // 2. gamification_point_rules
    //    One row per (org, event_type) — idempotent upsert-able
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE gamification_point_rules', `
      CREATE TABLE IF NOT EXISTS gamification_point_rules (
        id              TEXT        PRIMARY KEY,
        organization_id TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        event_type      VARCHAR(50) NOT NULL,
        points          INTEGER     NOT NULL DEFAULT 0 CHECK (points >= 0),
        is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ          DEFAULT NOW()
      );
    `);

    await exec(client, 'UNIQUE INDEX gamification_point_rules (org + event_type)', `
      CREATE UNIQUE INDEX IF NOT EXISTS gamification_point_rules_org_event_unique_idx
        ON gamification_point_rules (organization_id, event_type);
    `);

    await exec(client, 'INDEX gamification_point_rules (org, event_type)', `
      CREATE INDEX IF NOT EXISTS gamification_point_rules_org_event_idx
        ON gamification_point_rules (organization_id, event_type);
    `);

    // ------------------------------------------------------------------
    // 3. gamification_levels
    //    Admin-managed XP thresholds per org
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE gamification_levels', `
      CREATE TABLE IF NOT EXISTS gamification_levels (
        id              TEXT         PRIMARY KEY,
        organization_id TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        level_number    INTEGER      NOT NULL,
        name            VARCHAR(100) NOT NULL,
        min_points      INTEGER      NOT NULL,
        max_points      INTEGER,
        badge_emoji     VARCHAR(10),
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await exec(client, 'UNIQUE INDEX gamification_levels (org + level_number)', `
      CREATE UNIQUE INDEX IF NOT EXISTS gamification_levels_org_level_unique_idx
        ON gamification_levels (organization_id, level_number);
    `);

    // ------------------------------------------------------------------
    // 4. gamification_badges
    //    Badge definitions (org-scoped, optionally course-scoped)
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE gamification_badges', `
      CREATE TABLE IF NOT EXISTS gamification_badges (
        id              TEXT         PRIMARY KEY,
        organization_id TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name            VARCHAR(100) NOT NULL,
        description     TEXT         NOT NULL,
        emoji           VARCHAR(10),
        criteria_type   VARCHAR(50)  NOT NULL,
        criteria_value  INTEGER      NOT NULL CHECK (criteria_value >= 1),
        course_id       TEXT         REFERENCES courses(id) ON DELETE CASCADE,
        is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
        archived_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ           DEFAULT NOW()
      );
    `);

    await exec(client, 'INDEX gamification_badges (org)', `
      CREATE INDEX IF NOT EXISTS gamification_badges_org_idx
        ON gamification_badges (organization_id);
    `);

    await exec(client, 'INDEX gamification_badges (course_id)', `
      CREATE INDEX IF NOT EXISTS gamification_badges_course_idx
        ON gamification_badges (course_id);
    `);

    // ------------------------------------------------------------------
    // 5. user_gamification_profiles
    //    One row per (user, org) — running totals
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE user_gamification_profiles', `
      CREATE TABLE IF NOT EXISTS user_gamification_profiles (
        id                   TEXT        PRIMARY KEY,
        user_id              TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id      TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        total_points         INTEGER     NOT NULL DEFAULT 0,
        current_level_id     TEXT        REFERENCES gamification_levels(id) ON DELETE SET NULL,
        current_level_number INTEGER     NOT NULL DEFAULT 0,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ          DEFAULT NOW()
      );
    `);

    await exec(client, 'UNIQUE INDEX user_gamification_profiles (user + org)', `
      CREATE UNIQUE INDEX IF NOT EXISTS user_gamification_profiles_user_org_unique_idx
        ON user_gamification_profiles (user_id, organization_id);
    `);

    await exec(client, 'INDEX user_gamification_profiles (org, total_points DESC) — leaderboard', `
      CREATE INDEX IF NOT EXISTS user_gamification_profiles_org_total_points_idx
        ON user_gamification_profiles (organization_id, total_points DESC);
    `);

    // ------------------------------------------------------------------
    // 6. gamification_events
    //    Immutable event ledger — idempotency via UNIQUE on (user, event, entity)
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE gamification_events', `
      CREATE TABLE IF NOT EXISTS gamification_events (
        id              TEXT         PRIMARY KEY,
        organization_id TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id         TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type      VARCHAR(50)  NOT NULL,
        entity_id       VARCHAR(255) NOT NULL,
        entity_type     VARCHAR(50)  NOT NULL,
        points_awarded  INTEGER      NOT NULL DEFAULT 0,
        metadata        JSONB,
        occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    await exec(client, 'UNIQUE INDEX gamification_events (user + event_type + entity_id) — idempotency', `
      CREATE UNIQUE INDEX IF NOT EXISTS gamification_events_user_event_entity_unique_idx
        ON gamification_events (user_id, event_type, entity_id);
    `);

    await exec(client, 'INDEX gamification_events (org, user_id)', `
      CREATE INDEX IF NOT EXISTS gamification_events_org_user_idx
        ON gamification_events (organization_id, user_id);
    `);

    await exec(client, 'INDEX gamification_events (user_id, occurred_at DESC)', `
      CREATE INDEX IF NOT EXISTS gamification_events_user_occurred_at_idx
        ON gamification_events (user_id, occurred_at DESC);
    `);

    // ------------------------------------------------------------------
    // 7. user_badges
    //    Award records — one per (user, badge)
    // ------------------------------------------------------------------
    await exec(client, 'CREATE TABLE user_badges', `
      CREATE TABLE IF NOT EXISTS user_badges (
        id              TEXT        PRIMARY KEY,
        organization_id TEXT        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id         TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id        TEXT        NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
        awarded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await exec(client, 'UNIQUE INDEX user_badges (user + badge)', `
      CREATE UNIQUE INDEX IF NOT EXISTS user_badges_user_badge_unique_idx
        ON user_badges (user_id, badge_id);
    `);

    await exec(client, 'INDEX user_badges (user_id, org)', `
      CREATE INDEX IF NOT EXISTS user_badges_user_org_idx
        ON user_badges (user_id, organization_id);
    `);

    // ------------------------------------------------------------------
    // Seed default level thresholds for any org that has enabled
    // gamification settings but has no levels yet.
    // We insert into gamification_settings first has a no-op row so we
    // can reference it — actual enabling is done via the admin UI.
    // ------------------------------------------------------------------
    console.log('\n📦  Seeding default levels for existing organizations…');

    const orgsResult = await client.query(`
      SELECT id FROM organizations WHERE is_active = TRUE
    `);

    const DEFAULT_LEVELS = [
      { number: 1, name: 'Beginner',   min: 0,    max: 99,   emoji: '🌱' },
      { number: 2, name: 'Explorer',   min: 100,  max: 249,  emoji: '🔍' },
      { number: 3, name: 'Scholar',    min: 250,  max: 499,  emoji: '📚' },
      { number: 4, name: 'Expert',     min: 500,  max: 999,  emoji: '🎯' },
      { number: 5, name: 'Master',     min: 1000, max: 1999, emoji: '🏆' },
      { number: 6, name: 'Legend',     min: 2000, max: null,  emoji: '🌟' },
    ];

    const DEFAULT_RULES = [
      { eventType: 'lesson_completion',       points: 10  },
      { eventType: 'quiz_completion',         points: 25  },
      { eventType: 'exam_completion',         points: 50  },
      { eventType: 'assignment_submission',   points: 15  },
      { eventType: 'assignment_graded_pass',  points: 20  },
      { eventType: 'course_completion',       points: 100 },
    ];

    // Generate a simple CUID-like unique ID (timestamp + random)
    function makeId() {
      return `gam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    for (const org of orgsResult.rows) {
      const orgId = org.id;

      // ---- Levels -------------------------------------------------------
      const existingLevels = await client.query(
        'SELECT COUNT(*) FROM gamification_levels WHERE organization_id = $1',
        [orgId]
      );
      if (parseInt(existingLevels.rows[0].count) === 0) {
        for (const lvl of DEFAULT_LEVELS) {
          await client.query(
            `INSERT INTO gamification_levels
               (id, organization_id, level_number, name, min_points, max_points, badge_emoji)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [makeId(), orgId, lvl.number, lvl.name, lvl.min, lvl.max, lvl.emoji]
          );
        }
        console.log(`  ✅  Seeded 6 default levels for org ${orgId}`);
      } else {
        console.log(`  ⏭️   Levels already exist for org ${orgId} — skipped`);
      }

      // ---- Point rules --------------------------------------------------
      const existingRules = await client.query(
        'SELECT COUNT(*) FROM gamification_point_rules WHERE organization_id = $1',
        [orgId]
      );
      if (parseInt(existingRules.rows[0].count) === 0) {
        for (const rule of DEFAULT_RULES) {
          await client.query(
            `INSERT INTO gamification_point_rules
               (id, organization_id, event_type, points, is_active)
             VALUES ($1, $2, $3, $4, TRUE)
             ON CONFLICT DO NOTHING`,
            [makeId(), orgId, rule.eventType, rule.points]
          );
        }
        console.log(`  ✅  Seeded 6 default point rules for org ${orgId}`);
      } else {
        console.log(`  ⏭️   Point rules already exist for org ${orgId} — skipped`);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉  Gamification migration completed successfully!\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n💥  Migration rolled back due to error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
