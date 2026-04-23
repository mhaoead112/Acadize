// server/src/services/announcement.service.ts

import { db } from '../db/index.js';
import { announcements, announcementTranslations, courses, users } from '../db/schema.js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { requireTenantId } from '../utils/tenant-query.js';

async function resolveAnnouncementTranslations<T extends { id: string; title: string; content: string }>(
  items: T[],
  locale: string
): Promise<T[]> {
  if (items.length === 0 || locale === 'en') return items;
  const ids = items.map((a) => a.id);
  const rows = await db
    .select()
    .from(announcementTranslations)
    .where(and(
      inArray(announcementTranslations.announcementId, ids),
      inArray(announcementTranslations.locale, [locale, 'en'])
    ));
  const byAnn: Record<string, { locale: string; title: string; body: string }[]> = {};
  for (const r of rows) {
    if (!byAnn[r.announcementId]) byAnn[r.announcementId] = [];
    byAnn[r.announcementId].push({ locale: r.locale, title: r.title, body: r.body });
  }
  return items.map((a) => {
    const tr = byAnn[a.id];
    if (!tr) return a;
    const forLocale = tr.find((t) => t.locale === locale);
    const forEn = tr.find((t) => t.locale === 'en');
    return {
      ...a,
      title: forLocale?.title ?? forEn?.title ?? a.title,
      content: forLocale?.body ?? forEn?.body ?? a.content,
    };
  });
}

export interface CreateAnnouncementDto {
    courseId: string;
    teacherId: string;
    title: string;
    content: string;
    isPinned?: boolean;
    organizationId: string;
}

export const createAnnouncement = async (announcementData: CreateAnnouncementDto) => {
    const orgId = requireTenantId(announcementData.organizationId);
    const { courseId, teacherId, title, content, isPinned = false } = announcementData;

    // Verify course exists AND belongs to organization
    const course = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.id, courseId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    if (!course[0]) {
        throw new Error("Course not found or access denied.");
    }

    const newAnnouncement = await db.insert(announcements).values({
        courseId,
        teacherId,
        title,
        content,
        isPinned,
    }).returning();

    if (!newAnnouncement[0]) {
        throw new Error("Failed to create announcement.");
    }

    await db.insert(announcementTranslations).values({
        announcementId: newAnnouncement[0].id,
        locale: 'en',
        title,
        body: content,
    });
    return newAnnouncement[0];
};

export const getAnnouncementsByCourse = async (
    courseId: string,
    organizationId: string,
    locale?: string,
    limit: number = 50,
    offset: number = 0
) => {
    const orgId = requireTenantId(organizationId);

    let query = db
        .select()
        .from(announcements)
        .innerJoin(courses, eq(announcements.courseId, courses.id))
        .where(and(
            eq(announcements.courseId, courseId),
            eq(courses.organizationId, orgId)
        ))
        .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
        
    if (limit !== undefined) {
        query = query.limit(limit) as any;
    }
    if (offset !== undefined) {
        query = query.offset(offset) as any;
    }

    const results = await query;

    const list = results.map(r => r.announcements);
    if (locale) return resolveAnnouncementTranslations(list, locale);
    return list;
};

export const getAnnouncementById = async (
    announcementId: string,
    organizationId: string,
    locale?: string
) => {
    const orgId = requireTenantId(organizationId);

    const results = await db
        .select()
        .from(announcements)
        .innerJoin(courses, eq(announcements.courseId, courses.id))
        .where(and(
            eq(announcements.id, announcementId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    const row = results[0]?.announcements || null;
    if (!row || !locale || locale === 'en') return row;
    const [resolved] = await resolveAnnouncementTranslations([row], locale);
    return resolved ?? row;
};

export const updateAnnouncement = async (announcementId: string, updates: Partial<CreateAnnouncementDto>, organizationId: string) => {
    const orgId = requireTenantId(organizationId);

    // Verify ownership first
    const existingAnnouncement = await getAnnouncementById(announcementId, orgId);
    if (!existingAnnouncement) {
        throw new Error("Announcement not found or access denied.");
    }

    const { organizationId: _, ...safeUpdates } = updates;

    const updatedAnnouncement = await db
        .update(announcements)
        .set(safeUpdates)
        .where(eq(announcements.id, announcementId))
        .returning();

    if (!updatedAnnouncement[0]) {
        throw new Error("Failed to update announcement.");
    }

    return updatedAnnouncement[0];
};

export const deleteAnnouncement = async (announcementId: string, organizationId: string) => {
    const orgId = requireTenantId(organizationId);

    // Verify ownership first
    const existingAnnouncement = await getAnnouncementById(announcementId, orgId);
    if (!existingAnnouncement) {
        throw new Error("Announcement not found or access denied.");
    }

    const deletedAnnouncement = await db
        .delete(announcements)
        .where(eq(announcements.id, announcementId))
        .returning();

    if (!deletedAnnouncement[0]) {
        throw new Error("Failed to delete announcement.");
    }

    return deletedAnnouncement[0];
};
