// server/src/services/schedule.service.ts

import { db } from '../db/index.js';
import { events, enrollments, courses, assignments, users, parentChildren } from '../db/schema.js';
import { eq, and, gte, lte, inArray, or } from 'drizzle-orm';
import { requireTenantId } from '../utils/tenant-query.js';
import { createId } from '@paralleldrive/cuid2';

// ==================== TYPE DEFINITIONS ====================

export interface GetScheduleInput {
    userId: string;
    userRole: string;
    startDate: Date;
    endDate: Date;
    organizationId: string;
}

export interface CreateEventInput {
    title: string;
    description?: string;
    eventType: 'class' | 'meeting' | 'holiday' | 'exam' | 'announcement';
    startTime: Date;
    endTime: Date;
    location?: string;
    courseId?: string;
    createdBy: string;
    color?: string;
    isPublic?: boolean;
    organizationId: string;
}

export interface UpdateEventInput {
    eventId: string;
    userId: string;
    userRole: string;
    title?: string;
    description?: string;
    eventType?: 'class' | 'meeting' | 'holiday' | 'exam' | 'announcement';
    startTime?: Date;
    endTime?: Date;
    location?: string;
    color?: string;
    organizationId: string;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get user's schedule for a date range
 * Enforces tenant isolation
 */
export async function getUserSchedule(input: GetScheduleInput) {
    const orgId = requireTenantId(input.organizationId);
    let scheduleEvents: any[] = [];

    if (input.userRole === 'student') {
        // Get student's enrolled courses (scoped to organization)
        const studentEnrollments = await db
            .select({ courseId: enrollments.courseId })
            .from(enrollments)
            .innerJoin(courses, eq(enrollments.courseId, courses.id))
            .where(and(
                eq(enrollments.studentId, input.userId),
                eq(courses.organizationId, orgId)
            ));

        const courseIds = studentEnrollments.map(e => e.courseId);

        if (courseIds.length > 0) {
            // Get events for enrolled courses
            const courseEvents = await db
                .select({
                    id: events.id,
                    title: events.title,
                    description: events.description,
                    eventType: events.eventType,
                    startTime: events.startTime,
                    endTime: events.endTime,
                    location: events.location,
                    courseId: events.courseId,
                    courseName: courses.title,
                    color: events.color
                })
                .from(events)
                .leftJoin(courses, eq(events.courseId, courses.id))
                .where(and(
                    inArray(events.courseId, courseIds),
                    gte(events.startTime, input.startDate),
                    lte(events.endTime, input.endDate)
                ));

            // Get assignments due in this period
            const assignmentsDue = await db
                .select({
                    id: assignments.id,
                    title: assignments.title,
                    description: assignments.description,
                    dueDate: assignments.dueDate,
                    courseId: assignments.courseId,
                    courseName: courses.title,
                    maxScore: assignments.maxScore
                })
                .from(assignments)
                .leftJoin(courses, eq(assignments.courseId, courses.id))
                .where(and(
                    inArray(assignments.courseId, courseIds),
                    eq(assignments.isPublished, true),
                    gte(assignments.dueDate, input.startDate),
                    lte(assignments.dueDate, input.endDate)
                ));

            // Convert assignments to schedule events
            const assignmentEvents = assignmentsDue.map(a => ({
                id: `assignment-${a.id}`,
                title: `Due: ${a.title}`,
                description: a.description,
                eventType: 'assignment-due',
                startTime: a.dueDate,
                endTime: a.dueDate,
                location: 'Online Submission',
                courseId: a.courseId,
                courseName: a.courseName,
                isOnline: true,
                color: 'orange',
                maxScore: a.maxScore
            }));

            scheduleEvents = [...courseEvents, ...assignmentEvents];
        }

        // Also get public events (scoped to organization via creator)
        const publicEvents = await db
            .select({
                id: events.id,
                title: events.title,
                description: events.description,
                eventType: events.eventType,
                startTime: events.startTime,
                endTime: events.endTime,
                location: events.location,
                color: events.color,
                createdBy: events.createdBy
            })
            .from(events)
            .innerJoin(users, eq(events.createdBy, users.id))
            .where(and(
                eq(events.courseId, null as any),
                eq(users.organizationId, orgId),
                gte(events.startTime, input.startDate),
                lte(events.endTime, input.endDate)
            ));

        scheduleEvents = [...scheduleEvents, ...publicEvents.map(e => ({
            ...e,
            courseId: null,
            courseName: 'School Event'
        }))];

    } else if (input.userRole === 'teacher') {
        // Get teacher's courses (scoped to organization)
        const teacherCourses = await db
            .select({ id: courses.id, title: courses.title })
            .from(courses)
            .where(and(
                eq(courses.teacherId, input.userId),
                eq(courses.organizationId, orgId)
            ));

        const courseIds = teacherCourses.map(c => c.id);

        if (courseIds.length > 0) {
            // Get events for teacher's courses
            const courseEvents = await db
                .select({
                    id: events.id,
                    title: events.title,
                    description: events.description,
                    eventType: events.eventType,
                    startTime: events.startTime,
                    endTime: events.endTime,
                    location: events.location,
                    courseId: events.courseId,
                    courseName: courses.title,
                    color: events.color
                })
                .from(events)
                .leftJoin(courses, eq(events.courseId, courses.id))
                .where(and(
                    inArray(events.courseId, courseIds),
                    gte(events.startTime, input.startDate),
                    lte(events.endTime, input.endDate)
                ));

            scheduleEvents = courseEvents;
        }

        // Also get events created by teacher
        const teacherEvents = await db
            .select({
                id: events.id,
                title: events.title,
                description: events.description,
                eventType: events.eventType,
                startTime: events.startTime,
                endTime: events.endTime,
                location: events.location,
                courseId: events.courseId,
                color: events.color
            })
            .from(events)
            .where(and(
                eq(events.createdBy, input.userId),
                gte(events.startTime, input.startDate),
                lte(events.endTime, input.endDate)
            ));

        // Merge without duplicates
        const existingIds = new Set(scheduleEvents.map(e => e.id));
        teacherEvents.forEach(e => {
            if (!existingIds.has(e.id)) {
                scheduleEvents.push({ ...e, courseName: 'Personal Event' });
            }
        });

    } else {
        // Admin or other roles - get all events in organization
        const allEvents = await db
            .select({
                id: events.id,
                title: events.title,
                description: events.description,
                eventType: events.eventType,
                startTime: events.startTime,
                endTime: events.endTime,
                location: events.location,
                courseId: events.courseId,
                courseName: courses.title,
                color: events.color
            })
            .from(events)
            .leftJoin(courses, eq(events.courseId, courses.id))
            .leftJoin(users, eq(events.createdBy, users.id))
            .where(and(
                eq(users.organizationId, orgId),
                gte(events.startTime, input.startDate),
                lte(events.endTime, input.endDate)
            ));

        scheduleEvents = allEvents;
    }

    return scheduleEvents;
}

/**
 * Get schedule for a specific user (admin/parent access)
 * Enforces tenant isolation and authorization
 */
export async function getSpecificUserSchedule(
    requesterId: string,
    requesterRole: string,
    targetUserId: string,
    startDate: Date,
    endDate: Date,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Authorization check
    if (requesterRole !== 'admin' && requesterRole !== 'parent' && requesterId !== targetUserId) {
        throw new Error('Not authorized to view this schedule');
    }

    // If parent, verify they have access to this child
    if (requesterRole === 'parent') {
        const [link] = await db
            .select()
            .from(parentChildren)
            .where(and(
                eq(parentChildren.parentId, requesterId),
                eq(parentChildren.childId, targetUserId)
            ))
            .limit(1);

        if (!link) {
            throw new Error('Not authorized to view this child\'s schedule');
        }
    }

    // Get student's enrolled courses (scoped to organization)
    const studentEnrollments = await db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(and(
            eq(enrollments.studentId, targetUserId),
            eq(courses.organizationId, orgId)
        ));

    const courseIds = studentEnrollments.map(e => e.courseId);
    let scheduleEvents: any[] = [];

    if (courseIds.length > 0) {
        // Get events for enrolled courses
        const courseEvents = await db
            .select({
                id: events.id,
                title: events.title,
                description: events.description,
                eventType: events.eventType,
                startTime: events.startTime,
                endTime: events.endTime,
                location: events.location,
                courseId: events.courseId,
                courseName: courses.title,
                color: events.color
            })
            .from(events)
            .leftJoin(courses, eq(events.courseId, courses.id))
            .where(and(
                inArray(events.courseId, courseIds),
                gte(events.startTime, startDate),
                lte(events.endTime, endDate)
            ));

        // Get assignments due
        const assignmentsDue = await db
            .select({
                id: assignments.id,
                title: assignments.title,
                description: assignments.description,
                dueDate: assignments.dueDate,
                courseId: assignments.courseId,
                courseName: courses.title
            })
            .from(assignments)
            .leftJoin(courses, eq(assignments.courseId, courses.id))
            .where(and(
                inArray(assignments.courseId, courseIds),
                eq(assignments.isPublished, true),
                gte(assignments.dueDate, startDate),
                lte(assignments.dueDate, endDate)
            ));

        const assignmentEvents = assignmentsDue.map(a => ({
            id: `assignment-${a.id}`,
            title: `Due: ${a.title}`,
            description: a.description,
            eventType: 'assignment-due',
            startTime: a.dueDate,
            endTime: a.dueDate,
            location: 'Online Submission',
            courseId: a.courseId,
            courseName: a.courseName,
            isOnline: true,
            color: 'orange'
        }));

        scheduleEvents = [...courseEvents, ...assignmentEvents];
    }

    return scheduleEvents;
}

/**
 * Create a new schedule event
 * Enforces tenant isolation
 */
export async function createScheduleEvent(input: CreateEventInput) {
    const orgId = requireTenantId(input.organizationId);

    // Verify creator belongs to organization
    const [creator] = await db
        .select()
        .from(users)
        .where(and(
            eq(users.id, input.createdBy),
            eq(users.organizationId, orgId)
        ))
        .limit(1);

    if (!creator) {
        throw new Error('User not found in organization');
    }

    // If courseId provided, verify it belongs to organization
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
            throw new Error('Course not found in organization');
        }
    }

    const [newEvent] = await db
        .insert(events)
        .values({
            id: createId(),
            title: input.title,
            description: input.description,
            eventType: input.eventType,
            startTime: input.startTime,
            endTime: input.endTime,
            location: input.location,
            courseId: input.courseId || null,
            createdBy: input.createdBy,
            color: input.color || null,
            isPublic: input.isPublic === true
        })
        .returning();

    return newEvent;
}

/**
 * Update an existing event
 * Enforces ownership and tenant isolation
 */
export async function updateScheduleEvent(input: UpdateEventInput) {
    const orgId = requireTenantId(input.organizationId);

    // Check if event exists and verify ownership via creator's org
    const [existingEvent] = await db
        .select({
            id: events.id,
            createdBy: events.createdBy,
            title: events.title,
            description: events.description,
            eventType: events.eventType,
            startTime: events.startTime,
            endTime: events.endTime,
            location: events.location,
            color: events.color,
            creatorOrgId: users.organizationId
        })
        .from(events)
        .innerJoin(users, eq(events.createdBy, users.id))
        .where(eq(events.id, input.eventId))
        .limit(1);

    if (!existingEvent) {
        throw new Error('Event not found');
    }

    // Verify event belongs to organization
    if (existingEvent.creatorOrgId !== orgId) {
        throw new Error('Event not found in organization');
    }

    // Only allow editing own events (or admin can edit all)
    if (existingEvent.createdBy !== input.userId && input.userRole !== 'admin') {
        throw new Error('You can only edit your own events');
    }

    const [updatedEvent] = await db
        .update(events)
        .set({
            title: input.title || existingEvent.title,
            description: input.description !== undefined ? input.description : existingEvent.description,
            eventType: input.eventType || existingEvent.eventType,
            startTime: input.startTime || existingEvent.startTime,
            endTime: input.endTime || existingEvent.endTime,
            location: input.location !== undefined ? input.location : existingEvent.location,
            color: input.color !== undefined ? input.color : existingEvent.color,
            updatedAt: new Date()
        })
        .where(eq(events.id, input.eventId))
        .returning();

    return updatedEvent;
}

/**
 * Delete an event
 * Enforces ownership and tenant isolation
 */
export async function deleteScheduleEvent(
    eventId: string,
    userId: string,
    userRole: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Check if event exists and verify ownership
    const [existingEvent] = await db
        .select({
            id: events.id,
            createdBy: events.createdBy,
            creatorOrgId: users.organizationId
        })
        .from(events)
        .innerJoin(users, eq(events.createdBy, users.id))
        .where(eq(events.id, eventId))
        .limit(1);

    if (!existingEvent) {
        throw new Error('Event not found');
    }

    // Verify event belongs to organization
    if (existingEvent.creatorOrgId !== orgId) {
        throw new Error('Event not found in organization');
    }

    // Only allow deleting own events (or admin can delete all)
    if (existingEvent.createdBy !== userId && userRole !== 'admin') {
        throw new Error('You can only delete your own events');
    }

    await db.delete(events).where(eq(events.id, eventId));

    return { success: true };
}
