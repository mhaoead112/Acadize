// server/src/services/skill-tree.service.ts
/**
 * Sprint C — Skill Tree Service
 *
 * Responsibilities:
 *  1. Seed a linear skill tree from a course's ordered lessons (if none exists).
 *  2. Return skill tree with each node's completion state for a given student.
 *  3. Mark a node's "unlocked" state based on prereq completion.
 */

import { db } from '../db/index.js';
import { skillTreeNodes, lessons, gamificationEvents } from '../db/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type NodeStatus = 'completed' | 'active' | 'locked';

export interface SkillTreeNodeDto {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lessonFileType: string | null;
  prereqNodeId: string | null;
  position: number;
  sectionLabel: string | null;
  posX: number;
  posY: number;
  status: NodeStatus;
}

export interface SkillTreeDto {
  courseId: string;
  nodes: SkillTreeNodeDto[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

// ─────────────────────────────────────────────────────────────
// Seed helper — builds a linear chain from course's ordered lessons
// ─────────────────────────────────────────────────────────────

async function seedLinearTree(
  courseId: string,
  organizationId: string,
): Promise<void> {
  // Get ordered lessons for course
  const courseLessons = await db
    .select({
      id: lessons.id,
      order: lessons.order,
    })
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(lessons.order);

  if (courseLessons.length === 0) return;

  // Auto-layout: snake path (zigzag) across canvas
  const COL_COUNT = 3;
  const X_STEP = 300;
  const Y_STEP = 160;
  const X_OFFSETS = [80, 400, 720]; // left, center, right columns

  const nodeRows: Array<{
    id: string;
    courseId: string;
    lessonId: string;
    organizationId: string;
    prereqNodeId: string | null;
    position: number;
    posX: number;
    posY: number;
  }> = [];

  let previousId: string | null = null;

  courseLessons.forEach((lesson, idx) => {
    const nodeId = createId();
    const row = Math.floor(idx / COL_COUNT);
    // Alternate direction per row for snake effect
    const colIdx = row % 2 === 0 ? idx % COL_COUNT : COL_COUNT - 1 - (idx % COL_COUNT);
    const posX = X_OFFSETS[colIdx];
    const posY = 80 + row * Y_STEP;

    nodeRows.push({
      id: nodeId,
      courseId,
      lessonId: lesson.id,
      organizationId,
      prereqNodeId: previousId,
      position: idx,
      posX,
      posY,
    });
    previousId = nodeId;
  });

  await db.insert(skillTreeNodes).values(nodeRows).onConflictDoNothing();
  logger.info('[SkillTree] Seeded linear skill tree', {
    courseId,
    nodeCount: nodeRows.length,
  });
}

// ─────────────────────────────────────────────────────────────
// Public: getSkillTree
// ─────────────────────────────────────────────────────────────

export async function getSkillTree(
  courseId: string,
  organizationId: string,
  userId: string,
): Promise<SkillTreeDto> {
  try {
    // 1. Check if tree exists; seed if not
    const existingNodes = await db
      .select({ id: skillTreeNodes.id })
      .from(skillTreeNodes)
      .where(eq(skillTreeNodes.courseId, courseId))
      .limit(1);

    if (existingNodes.length === 0) {
      await seedLinearTree(courseId, organizationId);
    }

    // 2. Fetch all nodes with lesson info
    const nodeRows = await db
      .select({
        id: skillTreeNodes.id,
        lessonId: skillTreeNodes.lessonId,
        lessonTitle: lessons.title,
        lessonFileType: lessons.fileType,
        prereqNodeId: skillTreeNodes.prereqNodeId,
        position: skillTreeNodes.position,
        sectionLabel: skillTreeNodes.sectionLabel,
        posX: skillTreeNodes.posX,
        posY: skillTreeNodes.posY,
      })
      .from(skillTreeNodes)
      .innerJoin(lessons, eq(skillTreeNodes.lessonId, lessons.id))
      .where(eq(skillTreeNodes.courseId, courseId))
      .orderBy(skillTreeNodes.position);

    if (nodeRows.length === 0) {
      return { courseId, nodes: [], completedCount: 0, totalCount: 0, progressPercent: 0 };
    }

    // 3. Fetch which lessons this user has completed (lesson_completion events)
    const lessonIds = nodeRows.map((n) => n.lessonId);
    const completionRows = await db
      .select({ entityId: gamificationEvents.entityId })
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.eventType, 'lesson_completion'),
          inArray(gamificationEvents.entityId, lessonIds),
        ),
      );

    const completedLessonIds = new Set(completionRows.map((r) => r.entityId));

    // 4. Build node map for prereq resolution
    const nodeMap = new Map(nodeRows.map((n) => [n.id, n]));
    const completedNodeIds = new Set<string>();

    nodeRows.forEach((n) => {
      if (completedLessonIds.has(n.lessonId)) completedNodeIds.add(n.id);
    });

    // 5. Resolve status: completed > active > locked
    //    A node is ACTIVE if its prereq is completed (or it has no prereq).
    const nodes: SkillTreeNodeDto[] = nodeRows.map((n) => {
      const isCompleted = completedNodeIds.has(n.id);
      const prereqDone = !n.prereqNodeId || completedNodeIds.has(n.prereqNodeId);
      let status: NodeStatus = 'locked';
      if (isCompleted) status = 'completed';
      else if (prereqDone) status = 'active';

      return {
        id: n.id,
        lessonId: n.lessonId,
        lessonTitle: n.lessonTitle,
        lessonFileType: n.lessonFileType ?? null,
        prereqNodeId: n.prereqNodeId,
        position: n.position,
        sectionLabel: n.sectionLabel ?? null,
        posX: n.posX,
        posY: n.posY,
        status,
      };
    });

    const completedCount = nodes.filter((n) => n.status === 'completed').length;
    const totalCount = nodes.length;
    const progressPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

    return { courseId, nodes, completedCount, totalCount, progressPercent };
  } catch (err) {
    logger.error('[SkillTree] getSkillTree failed', { courseId, userId, error: String(err) });
    return { courseId, nodes: [], completedCount: 0, totalCount: 0, progressPercent: 0 };
  }
}
