import express from 'express';
import { db } from '../db/index.js';
import { events, enrollments, courses, assignments, users } from '../db/schema.js';
import { eq, and, gte, lte, inArray, or } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/schedule/me
 * Get the current user's schedule for a date range
 */
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { startDate, endDate } = req.query;

    // Parse dates or default to current week
    const start = startDate 
      ? new Date(startDate as string) 
      : getStartOfWeek(new Date());
    const end = endDate 
      ? new Date(endDate as string) 
      : getEndOfWeek(new Date());

    let scheduleEvents: any[] = [];

    if (userRole === 'student') {
      // Get student's enrolled courses
      const studentEnrollments = await db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(eq(enrollments.studentId, userId));

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
          .where(
            and(
              inArray(events.courseId, courseIds),
              gte(events.startTime, start),
              lte(events.endTime, end)
            )
          );

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
          .where(
            and(
              inArray(assignments.courseId, courseIds),
              eq(assignments.isPublished, true),
              gte(assignments.dueDate, start),
              lte(assignments.dueDate, end)
            )
          );

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

      // Also get public events
      const publicEvents = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          eventType: events.eventType,
          startTime: events.startTime,
          endTime: events.endTime,
          location: events.location,
          color: events.color
        })
        .from(events)
        .where(
          and(
            eq(events.courseId, null as any),
            gte(events.startTime, start),
            lte(events.endTime, end)
          )
        );

      scheduleEvents = [...scheduleEvents, ...publicEvents.map(e => ({
        ...e,
        courseId: null,
        courseName: 'School Event'
      }))];

    } else if (userRole === 'teacher') {
      // Get teacher's courses
      const teacherCourses = await db
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .where(eq(courses.teacherId, userId));

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
          .where(
            and(
              inArray(events.courseId, courseIds),
              gte(events.startTime, start),
              lte(events.endTime, end)
            )
          );

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
        .where(
          and(
            eq(events.createdBy, userId),
            gte(events.startTime, start),
            lte(events.endTime, end)
          )
        );

      // Merge without duplicates
      const existingIds = new Set(scheduleEvents.map(e => e.id));
      teacherEvents.forEach(e => {
        if (!existingIds.has(e.id)) {
          scheduleEvents.push({ ...e, courseName: 'Personal Event' });
        }
      });

    } else {
      // Admin or other roles - get all events
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
        .where(
          and(
            gte(events.startTime, start),
            lte(events.endTime, end)
          )
        );

      scheduleEvents = allEvents;
    }

    // Group by date for easier frontend consumption
    const groupedSchedule = groupEventsByDate(scheduleEvents);

    res.json({
      schedule: scheduleEvents,
      grouped: groupedSchedule,
      dateRange: { start, end }
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      error: 'Failed to fetch schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/schedule/:userId
 * Get schedule for a specific user (admin/parent access)
 */
router.get('/:userId', isAuthenticated, async (req, res) => {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Authorization check
    if (requesterRole !== 'admin' && requesterRole !== 'parent' && requesterId !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this schedule' });
    }

    // If parent, verify they have access to this child
    if (requesterRole === 'parent') {
      const { parentChildren } = await import('../db/schema.js');
      const link = await db
        .select()
        .from(parentChildren)
        .where(
          and(
            eq(parentChildren.parentId, requesterId),
            eq(parentChildren.childId, userId)
          )
        )
        .limit(1);

      if (link.length === 0) {
        return res.status(403).json({ error: 'Not authorized to view this child\'s schedule' });
      }
    }

    const start = startDate 
      ? new Date(startDate as string) 
      : getStartOfWeek(new Date());
    const end = endDate 
      ? new Date(endDate as string) 
      : getEndOfWeek(new Date());

    // Get student's enrolled courses
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.studentId, userId));

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
        .where(
          and(
            inArray(events.courseId, courseIds),
            gte(events.startTime, start),
            lte(events.endTime, end)
          )
        );

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
        .where(
          and(
            inArray(assignments.courseId, courseIds),
            eq(assignments.isPublished, true),
            gte(assignments.dueDate, start),
            lte(assignments.dueDate, end)
          )
        );

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

    res.json({
      schedule: scheduleEvents,
      grouped: groupEventsByDate(scheduleEvents),
      dateRange: { start, end }
    });

  } catch (error) {
    console.error('Error fetching user schedule:', error);
    res.status(500).json({
      error: 'Failed to fetch schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/schedule/event
 * Create a new schedule event
 */
router.post('/event', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can create events' });
    }

    const { title, description, eventType, startTime, endTime, location, courseId, color, isPublic } = req.body;

    if (!title || !startTime || !endTime || !eventType) {
      return res.status(400).json({ error: 'Missing required fields: title, startTime, endTime, eventType' });
    }

    const { createId } = await import('@paralleldrive/cuid2');

    const [newEvent] = await db
      .insert(events)
      .values({
        id: createId(),
        title,
        description,
        eventType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        courseId: courseId || null,
        createdBy: userId,
        color: color || null,
        isPublic: isPublic === true
      })
      .returning();

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/schedule/event/:id
 * Update an existing event
 */
router.put('/event/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const eventId = req.params.id;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can update events' });
    }

    // Check if event exists and user owns it
    const [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only allow editing own events (or admin can edit all)
    if (existingEvent.createdBy !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own events' });
    }

    const { title, description, eventType, startTime, endTime, location, color } = req.body;

    const [updatedEvent] = await db
      .update(events)
      .set({
        title: title || existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        eventType: eventType || existingEvent.eventType,
        startTime: startTime ? new Date(startTime) : existingEvent.startTime,
        endTime: endTime ? new Date(endTime) : existingEvent.endTime,
        location: location !== undefined ? location : existingEvent.location,
        color: color !== undefined ? color : existingEvent.color,
        updatedAt: new Date()
      })
      .where(eq(events.id, eventId))
      .returning();

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/schedule/event/:id
 * Delete an event
 */
router.delete('/event/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const eventId = req.params.id;

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can delete events' });
    }

    // Check if event exists and user owns it
    const [existingEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only allow deleting own events (or admin can delete all)
    if (existingEvent.createdBy !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own events' });
    }

    await db.delete(events).where(eq(events.id, eventId));

    res.json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

function groupEventsByDate(events: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  events.forEach(event => {
    const dateKey = new Date(event.startTime).toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });

  // Sort events within each day by start time
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  });

  return grouped;
}

export default router;
