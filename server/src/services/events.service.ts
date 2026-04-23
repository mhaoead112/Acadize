// server/src/services/events.service.ts

import { db } from '../db/index.js';
import { events, eventParticipants, users, courses } from '../db/schema.js';
import { eq, and, or, sql, desc, asc, gte, lte, inArray, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireTenantId } from '../utils/tenant-query.js';

// ==================== TYPE DEFINITIONS ====================

export interface CreateEventInput {
  title: string;
  description?: string;
  eventType: 'class' | 'meeting' | 'holiday' | 'exam' | 'announcement';
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  courseId?: string;
  isPublic?: boolean;
  maxParticipants?: string;
  createdBy: string;
  organizationId: string; // Required for tenant isolation
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  eventType?: 'class' | 'meeting' | 'holiday' | 'exam' | 'announcement';
  startTime?: Date;
  endTime?: Date;
  location?: string;
  meetingLink?: string;
  courseId?: string;
  isPublic?: boolean;
  maxParticipants?: string;
}

export interface EventFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  courseId?: string;
  organizationId: string;
  userRole?: string;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get all events with filters and participant counts
 * Enforces tenant isolation via organizationId
 */
export async function getEvents(filters: EventFilters) {
  const orgId = requireTenantId(filters.organizationId);

  let query = db.select({
    id: events.id,
    title: events.title,
    description: events.description,
    eventType: events.eventType,
    startTime: events.startTime,
    endTime: events.endTime,
    location: events.location,
    meetingLink: events.meetingLink,
    courseId: events.courseId,
    courseName: courses.title,
    isPublic: events.isPublic,
    maxParticipants: events.maxParticipants,
    createdAt: events.createdAt,
  })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id));

  // Build filter conditions
  const conditions: any[] = [];

  // TENANT ISOLATION: Filter by organization
  // Events linked to courses in this org, or events with no course
  conditions.push(
    or(
      eq(courses.organizationId, orgId),
      isNull(events.courseId)
    )!
  );

  // Filter by date range
  if (filters.startDate) {
    conditions.push(gte(events.startTime, new Date(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(events.endTime, new Date(filters.endDate)));
  }

  // Filter by event type
  if (filters.type) {
    conditions.push(eq(events.eventType, filters.type as any));
  }

  // Filter by course
  if (filters.courseId) {
    conditions.push(eq(events.courseId, filters.courseId));
  }

  // Apply visibility filter based on user role
  // Unauthenticated users and students only see public events
  if (!filters.userRole || filters.userRole === 'student') {
    conditions.push(eq(events.isPublic, true));
  }

  const allEvents = await query.where(conditions.length > 0 ? and(...conditions) : undefined);

  // Get participant counts
  const eventIds = allEvents.map(e => e.id);
  const participantCounts = eventIds.length > 0
    ? await db.select({
      eventId: eventParticipants.eventId,
      count: sql<number>`cast(count(${eventParticipants.id}) as integer)`,
    })
      .from(eventParticipants)
      .where(inArray(eventParticipants.eventId, eventIds))
      .groupBy(eventParticipants.eventId)
    : [];

  const participantMap = new Map(
    participantCounts.map(p => [p.eventId, p.count])
  );

  return allEvents.map(event => ({
    ...event,
    participants: participantMap.get(event.id) || 0,
  }));
}

/**
 * Get a single event by ID with participants
 * Enforces tenant isolation
 */
export async function getEventById(eventId: string, userId: string, organizationId: string) {
  const orgId = requireTenantId(organizationId);

  const [event] = await db.select({
    id: events.id,
    title: events.title,
    description: events.description,
    eventType: events.eventType,
    startTime: events.startTime,
    endTime: events.endTime,
    location: events.location,
    meetingLink: events.meetingLink,
    courseId: events.courseId,
    courseName: courses.title,
    isPublic: events.isPublic,
    maxParticipants: events.maxParticipants,
    createdAt: events.createdAt,
    courseOrgId: courses.organizationId,
  })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(eq(events.id, eventId));

  if (!event) {
    return null;
  }

  // TENANT ISOLATION: Verify event belongs to organization
  if (event.courseId && event.courseOrgId !== orgId) {
    return null; // Event belongs to different organization
  }

  // Get participants
  const participants = await db.select({
    userId: eventParticipants.userId,
    userName: users.fullName,
    status: eventParticipants.status,
    registeredAt: eventParticipants.createdAt,
  })
    .from(eventParticipants)
    .innerJoin(users, eq(eventParticipants.userId, users.id))
    .where(eq(eventParticipants.eventId, eventId));

  // Check if current user is registered
  const isRegistered = participants.some(p => p.userId === userId);

  return {
    ...event,
    participants,
    participantCount: participants.length,
    isRegistered,
  };
}

/**
 * Create a new event
 * Enforces tenant isolation
 */
export async function createEvent(input: CreateEventInput) {
  const orgId = requireTenantId(input.organizationId);

  // Validate dates
  if (input.startTime >= input.endTime) {
    throw new Error('End time must be after start time');
  }

  // If courseId is provided, verify it belongs to the organization
  if (input.courseId) {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, input.courseId),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!course) {
      throw new Error('Course not found or does not belong to this organization');
    }
  }

  const [newEvent] = await db.insert(events).values({
    title: input.title,
    description: input.description,
    eventType: input.eventType,
    startTime: input.startTime,
    endTime: input.endTime,
    location: input.location,
    meetingLink: input.meetingLink,
    courseId: input.courseId,
    createdBy: input.createdBy,
    isPublic: input.isPublic !== undefined ? input.isPublic : true,
    maxParticipants: input.maxParticipants,
  }).returning();

  return newEvent;
}

/**
 * Update an event
 * Enforces ownership and tenant isolation
 */
export async function updateEvent(
  eventId: string,
  userId: string,
  userRole: string,
  updates: UpdateEventInput,
  organizationId: string
) {
  const orgId = requireTenantId(organizationId);

  // Get the event with course info for tenant verification
  const [event] = await db
    .select({
      event: events,
      courseOrgId: courses.organizationId,
    })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new Error('Event not found');
  }

  // TENANT ISOLATION: Verify event belongs to organization
  if (event.event.courseId && event.courseOrgId !== orgId) {
    throw new Error('Event not found'); // Don't reveal it exists in another org
  }

  // Check permissions
  if (userRole !== 'admin' && event.event.createdBy !== userId) {
    throw new Error('You can only edit your own events');
  }

  // Validate dates if both are provided
  if (updates.startTime && updates.endTime && updates.startTime >= updates.endTime) {
    throw new Error('End time must be after start time');
  }

  const [updatedEvent] = await db.update(events)
    .set(updates)
    .where(eq(events.id, eventId))
    .returning();

  return updatedEvent;
}

/**
 * Delete an event
 * Enforces ownership and tenant isolation
 */
export async function deleteEvent(
  eventId: string,
  userId: string,
  userRole: string,
  organizationId: string
) {
  const orgId = requireTenantId(organizationId);

  // Get the event with course info for tenant verification
  const [event] = await db
    .select({
      event: events,
      courseOrgId: courses.organizationId,
    })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new Error('Event not found');
  }

  // TENANT ISOLATION: Verify event belongs to organization
  if (event.event.courseId && event.courseOrgId !== orgId) {
    throw new Error('Event not found');
  }

  // Check permissions
  if (userRole !== 'admin' && event.event.createdBy !== userId) {
    throw new Error('You can only delete your own events');
  }

  await db.delete(events).where(eq(events.id, eventId));

  return { success: true };
}

/**
 * Register for an event
 * Enforces tenant isolation
 */
export async function registerForEvent(
  eventId: string,
  userId: string,
  organizationId: string
) {
  const orgId = requireTenantId(organizationId);

  // Check if event exists and belongs to organization
  const [event] = await db
    .select({
      event: events,
      courseOrgId: courses.organizationId,
    })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new Error('Event not found');
  }

  // TENANT ISOLATION
  if (event.event.courseId && event.courseOrgId !== orgId) {
    throw new Error('Event not found');
  }

  // Check if already registered
  const [existing] = await db.select()
    .from(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )
    );

  if (existing) {
    throw new Error('Already registered for this event');
  }

  // Check max participants
  if (event.event.maxParticipants) {
    const countResult = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId));

    if (countResult[0].count >= parseInt(event.event.maxParticipants)) {
      throw new Error('Event is full');
    }
  }

  const [registration] = await db.insert(eventParticipants).values({
    eventId,
    userId,
    status: 'registered',
  }).returning();

  return registration;
}

/**
 * Unregister from an event
 */
export async function unregisterFromEvent(
  eventId: string,
  userId: string,
  organizationId: string
) {
  const orgId = requireTenantId(organizationId);

  // Verify event belongs to organization
  const [event] = await db
    .select({
      event: events,
      courseOrgId: courses.organizationId,
    })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.event.courseId && event.courseOrgId !== orgId) {
    throw new Error('Event not found');
  }

  const result = await db.delete(eventParticipants)
    .where(
      and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.userId, userId)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error('Registration not found');
  }

  return { success: true };
}
