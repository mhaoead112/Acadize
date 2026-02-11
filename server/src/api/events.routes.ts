import express from 'express';
import { db } from '../db/index.js';
import { events, eventParticipants, users, courses } from '../db/schema.js';
import { eq, and, gte, lte, or, inArray, sql, isNull } from 'drizzle-orm';
import { isAuthenticated, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all events (with filters) - PUBLIC endpoint, no auth required
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { startDate, endDate, type, courseId } = req.query;
    const orgId = (req as any).tenant?.organizationId;

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

    // Filter by tenant organization (events linked to courses in this org,
    // or events with no course that were created by users in this org)
    if (orgId) {
      conditions.push(
        or(
          eq(courses.organizationId, orgId),
          isNull(events.courseId)
        )!
      );
    }

    // Filter by date range
    if (startDate) {
      conditions.push(gte(events.startTime, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(events.endTime, new Date(endDate as string)));
    }

    // Filter by event type
    if (type) {
      conditions.push(eq(events.eventType, type as any));
    }

    // Filter by course
    if (courseId) {
      conditions.push(eq(events.courseId, courseId as string));
    }

    // Apply visibility filter based on user role
    // Unauthenticated users and students only see public events
    if (!userRole || userRole === 'student') {
      conditions.push(eq(events.isPublic, true));
    }
    // Admins and teachers can see all events

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

    const eventsWithParticipants = allEvents.map(event => ({
      ...event,
      participants: participantMap.get(event.id) || 0,
    }));

    res.json(eventsWithParticipants);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get a single event by ID
router.get('/events/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

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
    })
      .from(events)
      .leftJoin(courses, eq(events.courseId, courses.id))
      .where(eq(events.id, id));

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get participants
    const participants = await db.select({
      userId: eventParticipants.userId,
      userName: users.fullName,
      status: eventParticipants.status,
      registeredAt: eventParticipants.registeredAt,
    })
      .from(eventParticipants)
      .innerJoin(users, eq(eventParticipants.userId, users.id))
      .where(eq(eventParticipants.eventId, id));

    // Check if current user is registered
    const isRegistered = participants.some(p => p.userId === userId);

    res.json({
      ...event,
      participants,
      participantCount: participants.length,
      isRegistered,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create a new event (admin/teacher only)
router.post('/events', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'admin' && userRole !== 'teacher') {
      return res.status(403).json({ error: 'Only admins and teachers can create events' });
    }

    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      location,
      meetingLink,
      courseId,
      isPublic,
      maxParticipants,
    } = req.body;

    // Validate required fields
    if (!title || !eventType || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const [newEvent] = await db.insert(events).values({
      title,
      description,
      eventType,
      startTime: start,
      endTime: end,
      location,
      meetingLink,
      courseId,
      createdBy: userId,
      isPublic: isPublic !== undefined ? isPublic : true,
      maxParticipants,
    }).returning();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update an event (admin/teacher who created it)
router.put('/events/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get the event
    const [event] = await db.select().from(events).where(eq(events.id, id));

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (userRole !== 'admin' && event.createdBy !== userId) {
      return res.status(403).json({ error: 'You can only edit your own events' });
    }

    const {
      title,
      description,
      eventType,
      startTime,
      endTime,
      location,
      meetingLink,
      courseId,
      isPublic,
      maxParticipants,
    } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (eventType) updateData.eventType = eventType;
    if (location !== undefined) updateData.location = location;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;

    if (startTime) {
      updateData.startTime = new Date(startTime);
    }
    if (endTime) {
      updateData.endTime = new Date(endTime);
    }

    // Validate dates if both are provided
    if (updateData.startTime && updateData.endTime && updateData.startTime >= updateData.endTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const [updatedEvent] = await db.update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete an event (admin/teacher who created it)
router.delete('/events/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get the event
    const [event] = await db.select().from(events).where(eq(events.id, id));

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (userRole !== 'admin' && event.createdBy !== userId) {
      return res.status(403).json({ error: 'You can only delete your own events' });
    }

    await db.delete(events).where(eq(events.id, id));

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Register for an event
router.post('/events/:id/register', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if event exists
    const [event] = await db.select().from(events).where(eq(events.id, id));

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if already registered
    const [existing] = await db.select()
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, id),
          eq(eventParticipants.userId, userId)
        )
      );

    if (existing) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Check max participants
    if (event.maxParticipants) {
      const countResult = await db.select({ count: sql<number>`cast(count(*) as integer)` })
        .from(eventParticipants)
        .where(eq(eventParticipants.eventId, id));

      if (countResult[0].count >= parseInt(event.maxParticipants)) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    const [registration] = await db.insert(eventParticipants).values({
      eventId: id,
      userId,
      status: 'registered',
    }).returning();

    res.status(201).json(registration);
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Unregister from an event
router.delete('/events/:id/register', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await db.delete(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, id),
          eq(eventParticipants.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({ message: 'Unregistered successfully' });
  } catch (error) {
    console.error('Error unregistering from event:', error);
    res.status(500).json({ error: 'Failed to unregister' });
  }
});

export default router;
