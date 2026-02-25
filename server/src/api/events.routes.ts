// server/src/api/events.routes.ts

import express from 'express';
import { isAuthenticated, optionalAuth } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

const requireAuth = [isAuthenticated, requireSubscription];
import * as EventsService from '../services/events.service.js';

const router = express.Router();

/**
 * PUBLIC/AUTHENTICATED
 * GET /api/events
 * Returns all events with filters
 */
router.get('/events', optionalAuth, async (req, res) => {
  try {
    const userRole = req.user?.role;
    const { startDate, endDate, type, courseId } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const events = await EventsService.getEvents({
      startDate: startDate as string,
      endDate: endDate as string,
      type: type as string,
      courseId: courseId as string,
      organizationId: orgId,
      userRole,
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * AUTHENTICATED
 * GET /api/events/:id
 * Get a single event by ID
 */
router.get('/events/:id', ...requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const event = await EventsService.getEventById(id, userId, orgId);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * AUTHENTICATED (ADMIN/TEACHER)
 * POST /api/events
 * Create a new event
 */
router.post('/events', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

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

    const newEvent = await EventsService.createEvent({
      title,
      description,
      eventType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      meetingLink,
      courseId,
      isPublic,
      maxParticipants,
      createdBy: userId,
      organizationId: orgId,
    });

    res.status(201).json(newEvent);
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(400).json({ error: error.message || 'Failed to create event' });
  }
});

/**
 * AUTHENTICATED (ADMIN/CREATOR)
 * PUT /api/events/:id
 * Update an event
 */
router.put('/events/:id', ...requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
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

    const updatedEvent = await EventsService.updateEvent(
      id,
      userId,
      userRole,
      updateData,
      orgId
    );

    res.json(updatedEvent);
  } catch (error: any) {
    console.error('Error updating event:', error);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('permission') || error.message.includes('own events') ? 403 : 400;
    res.status(statusCode).json({ error: error.message || 'Failed to update event' });
  }
});

/**
 * AUTHENTICATED (ADMIN/CREATOR)
 * DELETE /api/events/:id
 * Delete an event
 */
router.delete('/events/:id', ...requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await EventsService.deleteEvent(id, userId, userRole, orgId);

    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('permission') || error.message.includes('own events') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to delete event' });
  }
});

/**
 * AUTHENTICATED
 * POST /api/events/:id/register
 * Register for an event
 */
router.post('/events/:id/register', ...requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const registration = await EventsService.registerForEvent(id, userId, orgId);

    res.status(201).json(registration);
  } catch (error: any) {
    console.error('Error registering for event:', error);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('Already registered') || error.message.includes('full') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to register for event' });
  }
});

/**
 * AUTHENTICATED
 * DELETE /api/events/:id/register
 * Unregister from an event
 */
router.delete('/events/:id/register', ...requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await EventsService.unregisterFromEvent(id, userId, orgId);

    res.json({ message: 'Unregistered successfully' });
  } catch (error: any) {
    console.error('Error unregistering from event:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to unregister' });
  }
});

export default router;
