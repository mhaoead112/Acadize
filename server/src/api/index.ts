import express from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from './ai.routes.js';
import courseRoutes from './course.routes.js';
import teacherRoutes from './teacher.routes.js';
import analyticsRoutes from './analytics.routes.js';
import parentRoutes from './parent.routes.js';
import eventsRoutes from './events.routes.js';
import announcementRoutes from './announcement.routes.js';

export function registerRoutes(app: express.Application) {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/teacher', teacherRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/parent', parentRoutes);
  app.use('/api', eventsRoutes); // Events routes include /events prefix
  app.use('/api/announcements', announcementRoutes);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  });
}