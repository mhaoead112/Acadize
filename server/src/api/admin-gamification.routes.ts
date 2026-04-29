/**
 * Admin Gamification Routes
 *
 * All routes are scoped to req.tenant.organizationId.
 * Router-level middleware enforces authentication + admin role for every endpoint.
 *
 * Mounted at: /api/admin/gamification
 *
 * Endpoints:
 *   GET  /settings          — fetch (or return defaults)
 *   PUT  /settings          — upsert; seeds default rules on first enable
 *   GET  /rules             — all 6 event-type rules (seeds defaults if absent)
 *   PUT  /rules             — batch upsert point rules
 *   GET  /badges            — list org badges (?includeArchived=false)
 *   POST /badges            — create new badge
 *   PUT  /badges/:id        — update / archive a badge
 *   GET  /reports           — analytics summary (?courseId, ?startDate, ?endDate)
 */

import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';
import { pool } from '../db/index.js';
import { db } from '../db/index.js';
import {
  gamificationSettings,
  gamificationPointRules,
  gamificationBadges,
  questTemplates,
} from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import * as gamificationService from '../services/gamification.service.js';
import * as reportService from '../services/gamification-report.service.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES = [
  'lesson_complete',
  'quiz_complete',
  'exam_complete',
  'assignment_submit',
  'assignment_graded_pass',
  'course_complete',
] as const;

type ValidEventType = (typeof VALID_EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// Router — admin role enforced at router level
// ---------------------------------------------------------------------------

const router = Router();

// Every route in this file requires:
//   1. Valid JWT session
//   2. user.role === 'admin'
router.use(isAuthenticated);
router.use(isAdmin);

// Helper — same pattern as analytics.routes.ts
const getOrgId = (req: any): string | undefined =>
  req.tenant?.organizationId ?? req.user?.organizationId;

// ---------------------------------------------------------------------------
// GET /api/admin/gamification/settings
// ---------------------------------------------------------------------------

router.get('/settings', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const settings = await gamificationService.getOrgSettings(orgId);
    return res.status(200).json(settings);
  } catch (err) {
    console.error('[GET /admin/gamification/settings]', err);
    return res.status(500).json({ message: 'Failed to fetch gamification settings.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/gamification/settings
// ---------------------------------------------------------------------------

router.put('/settings', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const body = req.body as Record<string, unknown>;

    // ── Validation ──────────────────────────────────────────────────────────
    const boolFields = [
      'enabled', 'pointsEnabled', 'levelsEnabled', 'badgesEnabled', 'leaderboardEnabled',
    ] as const;
    for (const field of boolFields) {
      if (field in body && typeof body[field] !== 'boolean') {
        return res.status(400).json({ message: `Field '${field}' must be a boolean.` });
      }
    }

    const strFields = ['levelNaming', 'pointNaming'] as const;
    for (const field of strFields) {
      if (field in body) {
        if (typeof body[field] !== 'string') {
          return res.status(400).json({ message: `Field '${field}' must be a string.` });
        }
        if ((body[field] as string).length > 50) {
          return res.status(400).json({
            message: `Field '${field}' must be at most 50 characters.`,
          });
        }
      }
    }

    // ── Determine if this is the FIRST enable ────────────────────────────────
    const currentSettings = await gamificationService.getOrgSettings(orgId);
    const isFirstEnable = !currentSettings.enabled && body.enabled === true;

    // ── Upsert via raw SQL (Drizzle v0.39 INSERT … ON CONFLICT workaround) ──
    const now = new Date();
    await pool.query(
      `INSERT INTO gamification_settings (
         organization_id, enabled, points_enabled, levels_enabled,
         badges_enabled, leaderboard_enabled, level_naming, point_naming,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (organization_id) DO UPDATE SET
         enabled              = EXCLUDED.enabled,
         points_enabled       = EXCLUDED.points_enabled,
         levels_enabled       = EXCLUDED.levels_enabled,
         badges_enabled       = EXCLUDED.badges_enabled,
         leaderboard_enabled  = EXCLUDED.leaderboard_enabled,
         level_naming         = EXCLUDED.level_naming,
         point_naming         = EXCLUDED.point_naming,
         updated_at           = EXCLUDED.updated_at`,
      [
        orgId,
        body.enabled            ?? currentSettings.enabled,
        body.pointsEnabled      ?? currentSettings.pointsEnabled,
        body.levelsEnabled      ?? currentSettings.levelsEnabled,
        body.badgesEnabled      ?? currentSettings.badgesEnabled,
        body.leaderboardEnabled ?? currentSettings.leaderboardEnabled,
        body.levelNaming        ?? currentSettings.levelNaming,
        body.pointNaming        ?? currentSettings.pointNaming,
        now,
      ],
    );

    // ── Seed default rules on first enable ───────────────────────────────────
    if (isFirstEnable) {
      await gamificationService.ensureDefaultRules(orgId);
    }

    const updated = await gamificationService.getOrgSettings(orgId);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('[PUT /admin/gamification/settings]', err);
    return res.status(500).json({ message: 'Failed to update gamification settings.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/gamification/rules
// ---------------------------------------------------------------------------

router.get('/rules', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    // Seed defaults if absent, then return all rules
    await gamificationService.ensureDefaultRules(orgId);

    const rules = await db
      .select()
      .from(gamificationPointRules)
      .where(eq(gamificationPointRules.organizationId, orgId))
      .orderBy(gamificationPointRules.eventType);

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    return res.status(200).json(
      rules.map(r => ({
        id: r.id,
        organizationId: r.organizationId,
        eventType: r.eventType,
        points: r.points,
        isActive: r.isActive,
        createdAt: toISO(r.createdAt)!,
        updatedAt: toISO(r.updatedAt),
      })),
    );
  } catch (err) {
    console.error('[GET /admin/gamification/rules]', err);
    return res.status(500).json({ message: 'Failed to fetch point rules.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/gamification/rules
// ---------------------------------------------------------------------------

router.put('/rules', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const { rules } = req.body as {
      rules?: { eventType: string; points: number; isActive: boolean }[];
    };

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ message: "'rules' must be a non-empty array." });
    }

    // ── Validate each rule ───────────────────────────────────────────────────
    const validSet = new Set<string>(VALID_EVENT_TYPES);
    for (const rule of rules) {
      if (!validSet.has(rule.eventType)) {
        return res.status(400).json({
          message: `Invalid eventType '${rule.eventType}'. Valid types: ${VALID_EVENT_TYPES.join(', ')}.`,
        });
      }
      if (typeof rule.points !== 'number' || rule.points < 0 || rule.points > 10_000) {
        return res.status(400).json({
          message: `points for '${rule.eventType}' must be a number between 0 and 10 000.`,
        });
      }
      if (typeof rule.isActive !== 'boolean') {
        return res.status(400).json({
          message: `isActive for '${rule.eventType}' must be a boolean.`,
        });
      }
    }

    // ── Upsert each rule using raw SQL ON CONFLICT ───────────────────────────
    const now = new Date();
    for (const rule of rules) {
      await pool.query(
        `INSERT INTO gamification_point_rules
           (id, organization_id, event_type, points, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)
         ON CONFLICT (organization_id, event_type) DO UPDATE SET
           points     = EXCLUDED.points,
           is_active  = EXCLUDED.is_active,
           updated_at = EXCLUDED.updated_at`,
        [createId(), orgId, rule.eventType, rule.points, rule.isActive, now],
      );
    }

    // Return full updated ruleset
    const updatedRules = await db
      .select()
      .from(gamificationPointRules)
      .where(eq(gamificationPointRules.organizationId, orgId))
      .orderBy(gamificationPointRules.eventType);

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    return res.status(200).json(
      updatedRules.map(r => ({
        id: r.id,
        organizationId: r.organizationId,
        eventType: r.eventType,
        points: r.points,
        isActive: r.isActive,
        createdAt: toISO(r.createdAt)!,
        updatedAt: toISO(r.updatedAt),
      })),
    );
  } catch (err) {
    console.error('[PUT /admin/gamification/rules]', err);
    return res.status(500).json({ message: 'Failed to update point rules.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/gamification/badges
// ---------------------------------------------------------------------------

router.get('/badges', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const includeArchived = req.query.includeArchived === 'true';

    const rows = await db
      .select()
      .from(gamificationBadges)
      .where(
        includeArchived
          ? eq(gamificationBadges.organizationId, orgId)
          : and(
              eq(gamificationBadges.organizationId, orgId),
              sql`${gamificationBadges.archivedAt} IS NULL`,
            ),
      )
      .orderBy(gamificationBadges.createdAt);

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    return res.status(200).json(
      rows.map(b => ({
        id: b.id,
        organizationId: b.organizationId,
        name: b.name,
        description: b.description,
        emoji: b.emoji,
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue,
        courseId: b.courseId,
        isActive: b.isActive,
        archivedAt: toISO(b.archivedAt),
        createdAt: toISO(b.createdAt)!,
        updatedAt: toISO(b.updatedAt),
      })),
    );
  } catch (err) {
    console.error('[GET /admin/gamification/badges]', err);
    return res.status(500).json({ message: 'Failed to fetch badges.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/admin/gamification/badges
// ---------------------------------------------------------------------------

router.post('/badges', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const {
      name,
      description,
      emoji,
      criteriaType,
      criteriaValue,
      courseId,
    } = req.body as {
      name?: string;
      description?: string;
      emoji?: string;
      criteriaType?: string;
      criteriaValue?: number;
      courseId?: string;
    };

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name?.trim()) {
      return res.status(400).json({ message: "'name' is required." });
    }
    if (!description?.trim()) {
      return res.status(400).json({ message: "'description' is required." });
    }
    if (!criteriaType?.trim()) {
      return res.status(400).json({ message: "'criteriaType' is required." });
    }
    if (typeof criteriaValue !== 'number' || criteriaValue < 1) {
      return res.status(400).json({ message: "'criteriaValue' must be a number >= 1." });
    }

    const [created] = await db
      .insert(gamificationBadges)
      .values({
        id: createId(),
        organizationId: orgId,
        name: name.trim(),
        description: description.trim(),
        emoji: emoji?.trim() ?? null,
        criteriaType: criteriaType.trim(),
        criteriaValue,
        courseId: courseId ?? null,
        isActive: true,
      } as any)
      .returning();

    if (!created) throw new Error('Insert returned no row.');

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    return res.status(201).json({
      id: created.id,
      organizationId: created.organizationId,
      name: created.name,
      description: created.description,
      emoji: created.emoji,
      criteriaType: created.criteriaType,
      criteriaValue: created.criteriaValue,
      courseId: created.courseId,
      isActive: created.isActive,
      archivedAt: toISO(created.archivedAt),
      createdAt: toISO(created.createdAt)!,
      updatedAt: toISO(created.updatedAt),
    });
  } catch (err) {
    console.error('[POST /admin/gamification/badges]', err);
    return res.status(500).json({ message: 'Failed to create badge.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/admin/gamification/badges/:id
// ---------------------------------------------------------------------------

router.put('/badges/:id', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const { id } = req.params;

    // Verify badge belongs to this org
    const [existing] = await db
      .select({ id: gamificationBadges.id })
      .from(gamificationBadges)
      .where(
        and(
          eq(gamificationBadges.id, id),
          eq(gamificationBadges.organizationId, orgId),
        ),
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: 'Badge not found or does not belong to your organization.' });
    }

    const body = req.body as Record<string, unknown>;

    // ── Validation ──────────────────────────────────────────────────────────
    if ('criteriaValue' in body) {
      const cv = body.criteriaValue;
      if (typeof cv !== 'number' || cv < 1) {
        return res.status(400).json({ message: "'criteriaValue' must be a number >= 1." });
      }
    }
    if ('isActive' in body && typeof body.isActive !== 'boolean') {
      return res.status(400).json({ message: "'isActive' must be a boolean." });
    }

    // Build a type-safe update object
    const updateFields: Record<string, unknown> = {};
    if ('name'          in body) updateFields.name          = String(body.name).trim();
    if ('description'   in body) updateFields.description   = String(body.description).trim();
    if ('emoji'         in body) updateFields.emoji         = body.emoji ? String(body.emoji).trim() : null;
    if ('criteriaType'  in body) updateFields.criteriaType  = String(body.criteriaType).trim();
    if ('criteriaValue' in body) updateFields.criteriaValue = body.criteriaValue as number;
    if ('courseId'      in body) updateFields.courseId      = body.courseId ? String(body.courseId) : null;
    if ('isActive'      in body) updateFields.isActive      = body.isActive as boolean;
    if ('archivedAt'    in body) {
      updateFields.archivedAt = body.archivedAt ? new Date(body.archivedAt as string) : null;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update.' });
    }

    const [updated] = await db
      .update(gamificationBadges)
      .set(updateFields as any)
      .where(eq(gamificationBadges.id, id))
      .returning();

    if (!updated) throw new Error('Update returned no row.');

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    return res.status(200).json({
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      emoji: updated.emoji,
      criteriaType: updated.criteriaType,
      criteriaValue: updated.criteriaValue,
      courseId: updated.courseId,
      isActive: updated.isActive,
      archivedAt: toISO(updated.archivedAt),
      createdAt: toISO(updated.createdAt)!,
      updatedAt: toISO(updated.updatedAt),
    });
  } catch (err) {
    console.error('[PUT /admin/gamification/badges/:id]', err);
    return res.status(500).json({ message: 'Failed to update badge.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/gamification/quests
// ---------------------------------------------------------------------------

router.get('/quests', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const templates = await db
      .select()
      .from(questTemplates)
      .where(eq(questTemplates.organizationId, orgId))
      .orderBy(questTemplates.questType, questTemplates.id);

    return res.status(200).json(templates);
  } catch (err) {
    console.error('[GET /admin/gamification/quests]', err);
    return res.status(500).json({ message: 'Failed to fetch quest templates.' });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/gamification/quests/:id
// ---------------------------------------------------------------------------

router.patch('/quests/:id', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const { id } = req.params;
    const body = req.body;

    // Verify template belongs to org
    const [existing] = await db
      .select()
      .from(questTemplates)
      .where(and(eq(questTemplates.id, id), eq(questTemplates.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: 'Quest template not found.' });
    }

    const updateFields: Record<string, any> = {};
    if ('title' in body) updateFields.title = body.title;
    if ('description' in body) updateFields.description = body.description;
    if ('xpReward' in body) updateFields.xpReward = Number(body.xpReward);
    if ('conditionValue' in body) updateFields.conditionValue = Number(body.conditionValue);
    if ('isActive' in body) updateFields.isActive = !!body.isActive;

    await db
      .update(questTemplates)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(questTemplates.id, id));

    return res.status(200).json({ message: 'Quest template updated successfully.' });
  } catch (err) {
    console.error('[PATCH /admin/gamification/quests/:id]', err);
    return res.status(500).json({ message: 'Failed to update quest template.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/admin/gamification/reports
// ---------------------------------------------------------------------------

router.get('/reports', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

    const courseId   = req.query.courseId   as string | undefined;
    const startParam = req.query.startDate  as string | undefined;
    const endParam   = req.query.endDate    as string | undefined;

    // Parse optional date filters — silently ignore malformed dates
    let startDate: Date | undefined;
    let endDate:   Date | undefined;

    if (startParam) {
      const d = new Date(startParam);
      if (!isNaN(d.getTime())) startDate = d;
    }
    if (endParam) {
      const d = new Date(endParam);
      if (!isNaN(d.getTime())) endDate = d;
    }

    const summary = await reportService.getReportSummary(orgId, {
      courseId,
      startDate,
      endDate,
    });

    return res.status(200).json(summary);
  } catch (err) {
    console.error('[GET /admin/gamification/reports]', err);
    return res.status(500).json({ message: 'Failed to fetch gamification report.' });
  }
});

export default router;
