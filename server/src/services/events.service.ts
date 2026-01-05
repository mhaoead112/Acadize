import { db } from '../db/index.js';
import { events, eventParticipants, users, courses } from '../db/schema.js';
import { eq, and, or, sql, desc, asc, gte, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface CreateEventInput {
  title: string;
  description?: string;
  eventType: 'class' | 'meeting' | 'holiday' | 'exam' | 'announcement';
  startTime: Date;
  endTime: Date;
  location?: string;
  courseId?: string;
  isAllDay?: boolean;
  recurrence?: string;
  color?: string;
  participantIds?: string[];
}

/**
 * Create a new event
 */
export async function createEvent(userId: string, input: CreateEventInput) {
  const [event] = await db
    .insert(events)
    .values({
      id: createId(),
      title: input.title,
      description: input.description,
      eventType: input.eventType,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      courseId: input.courseId,
      createdBy: userId,
      isAllDay: input.isAllDay || false,
      recurrence: input.recurrence || 'none',
      color: input.color
    })
    .returning();

  // Add participants if provided
  if (input.participantIds && input.participantIds.length > 0) {
    await db.insert(eventParticipants).values(
      input.participantIds.map(userId => ({
        id: createId(),
        eventId: event.id,
        userId,
        status: 'pending'
      }))
    );
  }

  return event;
}

/**
 * Get events for a user within a date range
 */
export async function getUserEvents(userId: string, startDate?: Date, endDate?: Date) {
  let query = db
    .select({
      event: events,
      creator: users,
      course: courses
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(
      or(
        eq(events.createdBy, userId),
        sql`${events.id} IN (SELECT event_id FROM event_participants WHERE user_id = ${userId})`
      )!
    );

  // Apply date filters
  const conditions = [];
  if (startDate) {
    conditions.push(gte(events.startTime, startDate));
  }
  if (endDate) {
    conditions.push(lte(events.endTime, endDate));
  }

  if (conditions.length > 0) {
    const whereCondition = and(...conditions);
    if (whereCondition) {
      query = query.where(whereCondition) as any;
    }
  }

  const result = await query.orderBy(asc(events.startTime));

  return result.map(row => ({
    ...row.event,
    creator: row.creator ? {
      id: row.creator.id,
      fullName: row.creator.fullName
    } : null,
    course: row.course ? {
      id: row.course.id,
      title: row.course.title
    } : null
  }));
}

/**
 * Get all events (admin only)
 */
export async function getAllEvents(filters?: {
  eventType?: string;
  courseId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const conditions = [];

  if (filters?.eventType) {
    conditions.push(eq(events.eventType, filters.eventType as any));
  }

  if (filters?.courseId) {
    conditions.push(eq(events.courseId, filters.courseId));
  }

  if (filters?.startDate) {
    conditions.push(gte(events.startTime, filters.startDate));
  }

  if (filters?.endDate) {
    conditions.push(lte(events.endTime, filters.endDate));
  }

  const query = db
    .select({
      event: events,
      creator: users,
      course: courses
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .leftJoin(courses, eq(events.courseId, courses.id));

  const result = conditions.length > 0
    ? await (query.where(and(...conditions)!) as any).orderBy(asc(events.startTime))
    : await query.orderBy(asc(events.startTime));

  return result.map(row => ({
    ...row.event,
    creator: row.creator ? {
      id: row.creator.id,
      fullName: row.creator.fullName
    } : null,
    course: row.course ? {
      id: row.course.id,
      title: row.course.title
    } : null
  }));
}

/**
 * Update an event
 */
export async function updateEvent(eventId: string, userId: string, updates: Partial<CreateEventInput>) {
  // Check if user is creator or admin
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new Error('Event not found');
  }

  // Get user role
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (event.createdBy !== userId && user?.role !== 'admin') {
    throw new Error('Unauthorized to update this event');
  }

  const [updatedEvent] = await db
    .update(events)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(events.id, eventId))
    .returning();

  return updatedEvent;
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string, userId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new Error('Event not found');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (event.createdBy !== userId && user?.role !== 'admin') {
    throw new Error('Unauthorized to delete this event');
  }

  await db
    .delete(events)
    .where(eq(events.id, eventId));

  return { success: true };
}

/**
 * Respond to event invitation
 */
export async function respondToEvent(eventId: string, userId: string, status: 'accepted' | 'declined') {
  const [updated] = await db
    .update(eventParticipants)
    .set({ status })
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )!
    )
    .returning();

  if (!updated) {
    throw new Error('Event invitation not found');
  }

  return updated;
}
