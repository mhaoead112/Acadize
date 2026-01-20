import express from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from './ai.routes.js';
import courseRoutes from './course.routes.js';
import teacherRoutes from './teacher.routes.js';
import studentRoutes from './student.routes.js';
import analyticsRoutes from './analytics.routes.js';
import parentRoutes from './parent.routes.js';
import eventsRoutes from './events.routes.js';
import announcementRoutes from './announcement.routes.js';
import examRoutes from './exam.routes.js';
import examAttemptRoutes from './exam-attempt.routes.js';
import antiCheatRoutes from './anti-cheat.routes.js';
import mistakesRoutes from './mistakes.routes.js';
import riskScoringRoutes from './risk-scoring.routes.js';
import retakeRoutes from './retake.routes.js';
import retakeExamRoutes from './retake-exam.routes.js';
import retakeSubmissionRoutes from './retake-submission.routes.js';

export function registerRoutes(app: express.Application) {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/teacher', teacherRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/parent', parentRoutes);
  app.use('/api', eventsRoutes); // Events routes include /events prefix
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/exam-attempts', examAttemptRoutes);
  app.use('/api/anti-cheat', antiCheatRoutes);
  app.use('/api/mistakes', mistakesRoutes);
  app.use('/api/risk-scoring', riskScoringRoutes);
  app.use('/api', retakeRoutes); // Retake routes already have /api/retakes prefix
  app.use('/api/retake-exams', retakeExamRoutes);
  app.use('/api/retake-submissions', retakeSubmissionRoutes);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  });
}