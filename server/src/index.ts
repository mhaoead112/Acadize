// server/src/index.ts

// Load environment variables FIRST, before any other imports
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
// @ts-ignore - missing type definitions
import morgan from 'morgan';
// @ts-ignore - missing type definitions
import xss from 'xss-clean';
import { createServer } from 'http';
import { logger, morganStream } from './utils/logger.js';

// Import our API routes (with .js extensions)
import authRoutes from './api/auth.routes.js';
import aiRoutes from './api/ai.routes.js';
import aiChatRoutes from './api/ai-chat.routes.js';
import courseRoutes from './api/course.routes.js';
import lessonRoutes from './api/lesson.routes.js';
import announcementRoutes from './api/announcement.routes.js';
import enrollmentRoutes from './api/enrollment.routes.js';
import assignmentRoutes from './api/assignment.routes.js';
import reportCardRoutes from './api/report-cards.routes.js';
import usersRoutes from './api/users.routes.js';
import studyGroupRoutes from './api/study-groups.routes.js';
import conversationsRoutes from './api/conversations.routes.js';
import notificationsRoutes from './api/notifications.routes.js';
import progressRoutes from './api/progress.routes.js';
import gradesRoutes from './api/grades.routes.js';
import streakRoutes from './api/streak.routes.js';
import eventsRoutes from './api/events.routes.js';
import profileRoutes from './api/profile.routes.js';
import localeRoutes from './api/locale.routes.js';
import analyticsRoutes from './api/analytics.routes.js';
import adminRoutes from './api/admin.routes.js';
import parentRoutes from './api/parent.routes.js';
import scheduleRoutes from './api/schedule.routes.js';
import adminSettingsRoutes from './api/admin-settings.routes.js';
import pushRoutes from './api/push.routes.js';
import uploadRoutes from './api/upload.routes.js';
import contactsRoutes from './api/contacts.routes.js';
import studentRoutes from './api/student.routes.js';
import examRoutes from './api/exam.routes.js';
import examAttemptRoutes from './api/exam-attempt.routes.js';
import antiCheatRoutes from './api/anti-cheat.routes.js';
import mistakesRoutes from './api/mistakes.routes.js';
import riskScoringRoutes from './api/risk-scoring.routes.js';
import retakeExamRoutes from './api/retake-exam.routes.js';
import retakeSubmissionRoutes from './api/retake-submission.routes.js';
import retakeRoutes from './api/retake.routes.js';
import sessionRoutes from './api/session.routes.js';
import { attendanceRouter, sessionQrRouter } from './api/attendance.routes.js';
import teacherRoutes from './api/teacher.routes.js';
import recordingUploadRoutes from './api/recording-upload.routes.js';
import adminUsersRoutes from './api/admin-users.routes.js';
import passwordResetRoutes from './api/password-reset.routes.js';
import emailTestRoutes from './api/email-test.routes.js';
import subscriptionRoutes from './api/subscription.routes.js';
import webhookRoutes from './api/webhook.routes.js';
import zoomWebhookRoutes from './api/zoom-webhook.routes.js';
import registrationRoutes from './api/registration.routes.js';
import orgBrandingRoutes from './api/org-branding.routes.js';
import { gamificationRouter, teacherGamificationRouter } from './api/gamification.routes.js';
import adminGamificationRoutes from './api/admin-gamification.routes.js';
import { tenantMiddleware, validateUserTenant } from './middleware/tenant.middleware.js';
import { localeMiddleware } from './middleware/locale.middleware.js';
import { isAuthenticated } from './middleware/auth.middleware.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure client IPs are resolved correctly behind a single reverse proxy.
if (isProduction) {
  app.set('trust proxy', 1);
}

// Global variable for Sentry
let Sentry: any = null;

async function bootstrap() {
  // Load .env in non-production
  if (!isProduction) {
    const { default: dotenv } = await import('dotenv');
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
  }

  // Sentry Initialization
  if (process.env.SENTRY_DSN) {
    try {
      Sentry = await import('@sentry/node');
      const profilingModule = await import('@sentry/profiling-node');
      if (Sentry && profilingModule) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          integrations: [
            Sentry.httpIntegration({ tracing: true }),
            Sentry.expressIntegration({ app }),
            profilingModule.nodeProfilingIntegration(),
          ],
          tracesSampleRate: isProduction ? 0.1 : 1.0,
          profilesSampleRate: isProduction ? 0.1 : 1.0,
        });
        logger.info('✅ Sentry error tracking initialized');
      }
    } catch (error) {
      logger.error('Failed to load Sentry:', error);
    }
  }

  // Create Server
  const server = createServer(app);

  // HTTPS redirect in production
  if (isProduction) {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  // CORS
  const envOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  const allowedOrigins = isProduction ? envOrigins : [...envOrigins, 'http://localhost:5173', 'http://localhost:5174'];

  const corsConfig = cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Subdomain', 'X-Organization-Subdomain', 'X-Locale'],
  });

  app.use(corsConfig);
  app.options('*', corsConfig);

  // Security
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", ...allowedOrigins, "wss:", "ws:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      }
    } : false,
    crossOriginEmbedderPolicy: false
  }));

  app.use(xss());

  const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'fallback_secret';
  
  // Body parsing
  app.use((req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) return next();
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        if (req.originalUrl?.includes('/api/webhooks/zoom')) {
          req.rawBody = buf.toString('utf8');
        }
      }
    })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser(cookieSecret));

  app.use(morgan(isProduction ? 'combined' : 'dev', { stream: morganStream }));

  // Static files
  app.use('/uploads', express.static('uploads'));

  // Rate Limiting (P3-T10)
  const { getRedisClient } = await import('./db/redis.js');
  const { RedisStore } = await import('rate-limit-redis');
  
  const redisClient = getRedisClient();
  const store = redisClient ? new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(...(args as [string, ...string[]])) as Promise<any>,
  }) : undefined;

  const keyGenerator = (req: any) => {
    // If it's a tenant route (has organizationId), group by the organization.
    // Otherwise fallback to IP for public routes.
    return req.tenant?.organizationId || ipKeyGenerator(req) || 'unknown';
  };

  const apiLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,                // 2,000 requests per 15 minutes per organization
    store,
    keyGenerator
  });
  
  const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 200, // Increased auth limit to accommodate an entire school logging in over a shared boundary if fallback to IP happens or if grouped by org
    store,
    keyGenerator
  });

  // Middleware
  app.use('/api', tenantMiddleware);
  app.use('/api', validateUserTenant);
  app.use('/api', localeMiddleware);

  // Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/registration', apiLimiter, registrationRoutes);
  app.use('/api/ai', apiLimiter, aiRoutes);
  app.use('/api/ai-chat', apiLimiter, aiChatRoutes);
  app.use('/api/courses', apiLimiter, courseRoutes);
  app.use('/api/lessons', apiLimiter, lessonRoutes);
  app.use('/api/announcements', apiLimiter, announcementRoutes);
  app.use('/api/enrollments', apiLimiter, enrollmentRoutes);
  app.use('/api/assignments', apiLimiter, assignmentRoutes);
  app.use('/api/report-cards', apiLimiter, reportCardRoutes);
  app.use('/api/users', apiLimiter, usersRoutes);
  app.use('/api/study-groups', apiLimiter, studyGroupRoutes);
  app.use('/api/conversations', apiLimiter, conversationsRoutes);
  app.use('/api/notifications', apiLimiter, notificationsRoutes);
  app.use('/api/progress', apiLimiter, progressRoutes);
  app.use('/api/grades', apiLimiter, gradesRoutes);
  app.use('/api/streaks', apiLimiter, streakRoutes);
  app.use('/api', apiLimiter, eventsRoutes);
  app.use('/api/profile', apiLimiter, profileRoutes);
  app.use('/api/locale', localeRoutes);
  app.use('/api/analytics', apiLimiter, analyticsRoutes);
  app.use('/api/admin-users', adminUsersRoutes);
  app.use('/api/subscription', apiLimiter, subscriptionRoutes);
  app.use('/api/webhooks', webhookRoutes);
  app.use('/api/webhooks/zoom', zoomWebhookRoutes);
  app.use('/api/admin', apiLimiter, adminRoutes);
  app.use('/api/admin/settings', apiLimiter, adminSettingsRoutes);
  app.use('/api/password-reset', authLimiter, passwordResetRoutes);
  app.use('/api/email-test', apiLimiter, emailTestRoutes);
  app.use('/api/parent', apiLimiter, parentRoutes);
  app.use('/api/schedule', apiLimiter, scheduleRoutes);
  app.use('/api/push', apiLimiter, pushRoutes);
  app.use('/api/upload', apiLimiter, uploadRoutes);
  app.use('/api/contacts', apiLimiter, contactsRoutes);
  app.use('/api/student', apiLimiter, studentRoutes);
  app.use('/api/gamification', apiLimiter, gamificationRouter);
  app.use('/api/teacher/gamification', apiLimiter, teacherGamificationRouter);
  app.use('/api/admin/gamification', apiLimiter, adminGamificationRoutes);
  app.use('/api/exams', apiLimiter, examRoutes);
  app.use('/api/exam-attempts', apiLimiter, examAttemptRoutes);
  app.use('/api/anti-cheat', apiLimiter, antiCheatRoutes);
  app.use('/api/mistakes', apiLimiter, mistakesRoutes);
  app.use('/api/risk-scoring', apiLimiter, riskScoringRoutes);
  app.use('/api/retake-exams', apiLimiter, retakeExamRoutes);
  app.use('/api/retake-submissions', apiLimiter, retakeSubmissionRoutes);
  app.use('/api/retakes', apiLimiter, retakeRoutes);
  app.use('/api/sessions', apiLimiter, sessionRoutes);
  app.use('/api/attendance', apiLimiter, attendanceRouter);
  app.use('/api/sessions/:id/qr', apiLimiter, sessionQrRouter);
  app.use('/api/teacher', apiLimiter, teacherRoutes);
  app.use('/api/recordings', apiLimiter, recordingUploadRoutes);
  app.use('/api/org/branding', apiLimiter, orgBrandingRoutes);

  // Admin Org Dynamic Import
  try {
    const { default: adminOrganizationsRoutes } = await import('./api/admin-organizations.routes.js');
    app.use('/api/admin/organizations', apiLimiter, adminOrganizationsRoutes);
  } catch (e) {
    logger.warn('admin-organizations routes not found');
  }

  const { default: compression } = await import('compression');
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024
  }));

  app.get('/api/health', async (req, res) => {
    let dbStatus = 'ok';
    let wsStatus = 'ok';
    let redisStatus = process.env.REDIS_URL ? 'ok' : 'disabled';

    try {
      const { db } = await import('./db/index.js');
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`SELECT 1`);
    } catch (e) {
      dbStatus = 'down';
    }

    try {
      const { WebSocketService } = await import('./services/websocket.service.js');
      if (!WebSocketService) {
        wsStatus = 'down';
      }
    } catch (e) {
      wsStatus = 'down';
    }

    try {
      const { getRedisClient } = await import('./db/redis.js');
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
      } else if (process.env.REDIS_URL) {
        redisStatus = 'down';
      }
    } catch (e) {
      if (process.env.REDIS_URL) {
        redisStatus = 'down';
      }
    }

    const isHealthy = dbStatus === 'ok' && wsStatus === 'ok' && redisStatus !== 'down';
    const response = { status: isHealthy ? 'ok' : 'error', db: dbStatus, ws: wsStatus, redis: redisStatus };
    
    if (isHealthy) {
      res.json(response);
    } else {
      res.status(503).json(response);
    }
  });

  // Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Error:', { message: err.message, url: req.url });
    res.status(err.status || 500).json({ error: isProduction ? 'Server error' : err.message });
  });

  // Realtime
  const { WS_CHAT_PATH, SOCKETIO_ATTENDANCE_NAMESPACE } = await import('./realtime.config.js');
  const { WebSocketService } = await import('./services/websocket.service.js');
  const { initializeSocket } = await import('./services/realtime.service.js');
  const { initLessonDigestion } = await import('./services/lesson-digestion.service.js');

  WebSocketService.initialize(server);
  const _io = await initializeSocket(server).catch(() => null);

  server.listen(PORT, () => {
    logger.info(`✅ Server listening on port ${PORT}`);
    initLessonDigestion().catch(() => {});
    import('./jobs/index.js').then(({ initJobsQueue }) => initJobsQueue()).catch(() => {});
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  setTimeout(() => process.exit(1), 1000).unref();
});
