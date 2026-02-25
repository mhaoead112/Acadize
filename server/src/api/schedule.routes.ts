// server/src/api/schedule.routes.ts

import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import * as ScheduleService from '../services/schedule.service.js';

const router = express.Router();

/**
 * GET /api/schedule/me
 * Get the current user's schedule for a date range
 */
router.get('/me', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { startDate, endDate } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    // Parse dates or default to current week
    const start = startDate
      ? new Date(startDate as string)
      : getStartOfWeek(new Date());
    const end = endDate
      ? new Date(endDate as string)
      : getEndOfWeek(new Date());

    const scheduleEvents = await ScheduleService.getUserSchedule({
      userId,
      userRole,
      startDate: start,
      endDate: end,
      organizationId: orgId
    });

    // Group by date for easier frontend consumption
    const groupedSchedule = groupEventsByDate(scheduleEvents);

    res.json({
      schedule: scheduleEvents,
      grouped: groupedSchedule,
      dateRange: { start, end }
    });

  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      error: 'Failed to fetch schedule',
      details: error.message || 'Unknown error'
    });
  }
});

/**
 * GET /api/schedule/:userId
 * Get schedule for a specific user (admin/parent access)
 */
router.get('/:userId', ...requireAuth, async (req, res) => {
  try {
    const requesterId = req.user!.id;
    const requesterRole = req.user!.role;
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const start = startDate
      ? new Date(startDate as string)
      : getStartOfWeek(new Date());
    const end = endDate
      ? new Date(endDate as string)
      : getEndOfWeek(new Date());

    const scheduleEvents = await ScheduleService.getSpecificUserSchedule(
      requesterId,
      requesterRole,
      userId,
      start,
      end,
      orgId
    );

    res.json({
      schedule: scheduleEvents,
      grouped: groupEventsByDate(scheduleEvents),
      dateRange: { start, end }
    });

  } catch (error: any) {
    console.error('Error fetching user schedule:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({
      error: error.message || 'Failed to fetch schedule'
    });
  }
});

/**
 * POST /api/schedule/event
 * Create a new schedule event
 */
router.post('/event', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can create events' });
    }

    const { title, description, eventType, startTime, endTime, location, courseId, color, isPublic } = req.body;

    if (!title || !startTime || !endTime || !eventType) {
      return res.status(400).json({ error: 'Missing required fields: title, startTime, endTime, eventType' });
    }

    const newEvent = await ScheduleService.createScheduleEvent({
      title,
      description,
      eventType,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      courseId,
      createdBy: userId,
      color,
      isPublic,
      organizationId: orgId
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent
    });

  } catch (error: any) {
    console.error('Error creating event:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: error.message || 'Failed to create event'
    });
  }
});

/**
 * PUT /api/schedule/event/:id
 * Update an existing event
 */
router.put('/event/:id', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const eventId = req.params.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can update events' });
    }

    const { title, description, eventType, startTime, endTime, location, color } = req.body;

    const updatedEvent = await ScheduleService.updateScheduleEvent({
      eventId,
      userId,
      userRole,
      title,
      description,
      eventType,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      location,
      color,
      organizationId: orgId
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error: any) {
    console.error('Error updating event:', error);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('only edit') ? 403 : 500;
    res.status(statusCode).json({
      error: error.message || 'Failed to update event'
    });
  }
});

/**
 * DELETE /api/schedule/event/:id
 * Delete an event
 */
router.delete('/event/:id', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const eventId = req.params.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only teachers and admins can delete events' });
    }

    await ScheduleService.deleteScheduleEvent(eventId, userId, userRole, orgId);

    res.json({
      message: 'Event deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting event:', error);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('only delete') ? 403 : 500;
    res.status(statusCode).json({
      error: error.message || 'Failed to delete event'
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
