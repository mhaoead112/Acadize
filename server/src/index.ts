// server/src/index.ts

// Load environment variables FIRST, before any other imports
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In non-production environments, load .env from the server directory.
// In production (e.g. Render), environment variables should come from the
// platform configuration, so we avoid importing dotenv there to prevent
// module resolution issues.
if (process.env.NODE_ENV !== 'production') {
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// Sentry will be loaded dynamically so that missing runtime dependencies
// (e.g. on Render) do not crash the server process.
let Sentry: any = null;
let nodeProfilingIntegration: any = null;
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
// @ts-ignore - missing type definitions
import morgan from 'morgan';
// @ts-ignore - missing type definitions
import xss from 'xss-clean';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWebSocketServer } from './websocket.js';
import { logger, morganStream } from './utils/logger.js';

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Warn about optional but recommended environment variables
if (!process.env.OPENAI_API_KEY) {
  logger.warn('⚠️  OPENAI_API_KEY not set - AI features will be limited');
}
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  logger.warn('⚠️  VAPID keys not set - Push notifications will not work');
}

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
import { tenantMiddleware, validateUserTenant } from './middleware/tenant.middleware.js';
import { localeMiddleware } from './middleware/locale.middleware.js';
import { requireSubscription } from './middleware/subscription.middleware.js';
import { isAuthenticated, isAdmin } from './middleware/auth.middleware.js';


const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Attempt to load Sentry dynamically when DSN is provided
if (process.env.SENTRY_DSN) {
  try {
    Sentry = await import('@sentry/node');
    const profilingModule = await import('@sentry/profiling-node');
    nodeProfilingIntegration = profilingModule.nodeProfilingIntegration;
  } catch (error) {
    logger.error('Failed to load Sentry modules; continuing without Sentry', error);
  }
}

// Initialize Sentry for error tracking (production only or if DSN is set)
if (process.env.SENTRY_DSN && Sentry && nodeProfilingIntegration) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ app }),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    profilesSampleRate: isProduction ? 0.1 : 1.0,
  });

  // Sentry request handler must be the first middleware
  app.use(Sentry.expressErrorHandler());

  logger.info('✅ Sentry error tracking initialized');
} else if (!process.env.SENTRY_DSN) {
  logger.warn('⚠️  Sentry DSN not configured - error tracking disabled');
}

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });
setupWebSocketServer(wss);

// Enforce HTTPS in production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// CORS configuration - MUST be before Helmet and other middleware
// Updated to include all Vercel deployment URLs (Dec 10, 2025)
// In production, CORS_ORIGINS env var is REQUIRED.
// Fallback only includes local dev URLs.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

if (isProduction && !process.env.CORS_ORIGINS) {
  logger.warn('⚠️  CORS_ORIGINS not set in production — only localhost origins are allowed. Set CORS_ORIGINS env var.');
}

logger.info(`🔐 CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);

const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      logger.info('✅ CORS: Allowing request with no origin (server-to-server)');
      return callback(null, true);
    }

    // Check if origin is in allowed list or matches Vercel preview pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      // Allow all Vercel preview deployments
      if (origin.includes('eduverse-initial') && origin.includes('.vercel.app')) return true;
      // Allow all lvh.me subdomains for local multi-tenant testing
      if (origin.endsWith('lvh.me:5173') || origin.endsWith('.lvh.me:5174')) return true;
      // Allow LAN IPs for local mobile testing (192.168.*, 10.*, 172.*)
      if (origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) return true;
      if (origin.startsWith('http://127.0.0.1')) return true;
      return false;
    });

    if (isAllowed) {
      logger.info(`✅ CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`❌ CORS: Blocked origin: ${origin}`);
      // Return false instead of error to avoid blocking the response
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Subdomain', 'X-Organization-Subdomain', 'X-Locale'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // Cache preflight for 10 minutes
  optionsSuccessStatus: 204 // Some legacy browsers choke on 204
});

// Apply CORS to all routes
app.use(corsConfig);

// Handle preflight requests for all routes
app.options('*', corsConfig);

// Security middleware - Enhanced CSP for production (AFTER CORS)
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", ...allowedOrigins, "wss:", "ws:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'self'", "blob:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      frameSrc: ["'self'", "blob:", "https:", ...allowedOrigins],
      frameAncestors: ["'self'", ...allowedOrigins],
      workerSrc: ["'self'", "blob:"],
    },
  } : false,
  crossOriginEmbedderPolicy: false, // Disable to allow cross-origin iframes
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  frameguard: false, // Disable X-Frame-Options to allow PDF viewing in iframes
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// XSS Protection - sanitize user input
app.use(xss());

// Configure cookie parser with signed cookies in production
const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
if (!cookieSecret) {
  logger.error('COOKIE_SECRET or JWT_SECRET required for signed cookies');
  process.exit(1);
}

// Rate limiting - adjusted for production usage patterns
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 2000, // Increased: 500 requests per 15min in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Stricter rate limiting for auth routes only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 100, // Increased: 20 login attempts per 15 minutes in production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// JSON and URL-encoded body parsers
// Skip JSON parsing for multipart form data (file uploads).
// For the Zoom webhook, we also save the raw body so the HMAC-SHA256
// signature can be verified against the original bytes (not re-serialised JSON).
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Skip JSON parsing for file uploads - multer will handle these
    return next();
  }
  express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      // Preserve raw body for the Zoom webhook so HMAC-SHA256 verification
      // runs against the original bytes (not re-serialised JSON).
      if (req.originalUrl?.includes('/api/webhooks/zoom') || req.url?.includes('/api/webhooks/zoom')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser with signing for security
app.use(cookieParser(cookieSecret));

// Configure secure session/cookie settings
if (isProduction) {
  app.use((req, res, next) => {
    res.cookie('secure', 'true', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    next();
  });
}

// HTTP request logging
app.use(morgan(isProduction ? 'combined' : 'dev', { stream: morganStream }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Route-specific rate limiters - adjusted for realistic usage
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 1000 : 5000, // Increased for general API calls
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 50 : 200, // Increased: AI endpoints are expensive but users need access
  message: 'Too many AI requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 500, // Increased for file uploads - teachers may upload many lessons
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

logger.info('🚀 Starting Acadize API server...');

// --- Multi-tenant middleware ---
// Resolve organization from subdomain/custom domain
// For development, use X-Tenant-Subdomain header or defaults to 'default'
app.use('/api', tenantMiddleware);
app.use('/api', validateUserTenant);
app.use('/api', localeMiddleware);

// --- Scoped Query Middleware ---
// Sets RLS tenant context for database queries
// NOTE: Disabled for now - RLS not set up in cloud database
// import { scopedQueryMiddleware } from './middleware/scoped-query.middleware.js';
// app.use('/api', scopedQueryMiddleware);

logger.info('🏢 Multi-tenant middleware enabled');
// logger.info('🔒 Row-Level Security context middleware enabled');

// --- API Route Definitions ---
app.use('/api/auth', authRoutes);
app.use('/api/registration', apiLimiter, registrationRoutes);
// AI routes - these routes handle auth internally, just add subscription check
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/ai-chat', aiLimiter, aiChatRoutes);

// Course routes - these routes handle auth internally, just add subscription check
app.use('/api/courses', apiLimiter, courseRoutes);
app.use('/api/lessons', uploadLimiter, lessonRoutes);
app.use('/api/announcements', apiLimiter, announcementRoutes);
app.use('/api/enrollments', apiLimiter, enrollmentRoutes);
app.use('/api/assignments', uploadLimiter, assignmentRoutes);
app.use('/api/report-cards', apiLimiter, reportCardRoutes);

// User routes - these routes handle auth internally
app.use('/api/users', apiLimiter, usersRoutes);
app.use('/api/study-groups', apiLimiter, studyGroupRoutes);
app.use('/api/conversations', apiLimiter, conversationsRoutes);
app.use('/api/notifications', apiLimiter, notificationsRoutes);

// Progress & grades - these routes handle auth internally
app.use('/api/progress', apiLimiter, progressRoutes);
app.use('/api/grades', apiLimiter, gradesRoutes);
app.use('/api/streaks', apiLimiter, streakRoutes);
app.use('/api', apiLimiter, eventsRoutes);
app.use('/api/profile', uploadLimiter, profileRoutes);
app.use('/api/locale', localeRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
// Admin routes - NO subscription check (admins bypass)
app.use('/api/admin-users', adminUsersRoutes);

// Subscription routes - NO subscription check (needed to activate)
app.use('/api/subscription', apiLimiter, subscriptionRoutes);

// Webhook routes - NO auth/subscription (external callbacks)
// Zoom webhook has its own dedicated router mounted first for specificity
app.use('/api/webhooks/zoom', zoomWebhookRoutes);
app.use('/api/webhooks', webhookRoutes);

// Admin routes - NO subscription check (admins bypass)
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/admin/settings', apiLimiter, adminSettingsRoutes);

// Password reset - NO subscription check (public)
app.use('/api/password-reset', authLimiter, passwordResetRoutes);

// Email test - admin only
app.use('/api/email-test', apiLimiter, emailTestRoutes);

// Parent routes - handle auth internally
app.use('/api/parent', apiLimiter, parentRoutes);

// Schedule - handle auth internally
app.use('/api/schedule', apiLimiter, scheduleRoutes);
// Admin organization routes - admin only
import adminOrganizationsRoutes from './api/admin-organizations.routes.js';
app.use('/api/admin/organizations', apiLimiter, adminOrganizationsRoutes);

// Push notifications - handle auth internally
app.use('/api/push', apiLimiter, pushRoutes);

// Upload routes - handle auth internally
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Contacts - handle auth internally
app.use('/api/contacts', apiLimiter, contactsRoutes);

// Student routes - handle auth internally
app.use('/api/student', apiLimiter, studentRoutes);

// Exam routes - handle auth internally
app.use('/api/exams', apiLimiter, examRoutes);
app.use('/api/exam-attempts', apiLimiter, examAttemptRoutes);
app.use('/api/anti-cheat', apiLimiter, antiCheatRoutes);
app.use('/api/mistakes', apiLimiter, mistakesRoutes);
app.use('/api/risk-scoring', apiLimiter, riskScoringRoutes);
app.use('/api/retake-exams', apiLimiter, retakeExamRoutes);
app.use('/api/retake-submissions', apiLimiter, retakeSubmissionRoutes);
app.use('/api/retakes', apiLimiter, retakeRoutes);

// Session / Smart Attendance routes - handle auth internally
app.use('/api/sessions', apiLimiter, sessionRoutes);

// Attendance routes (QR scan, session list, manual override, reports)
app.use('/api/attendance', apiLimiter, attendanceRouter);

// Session QR sub-router (get & rotate QR tokens) — uses mergeParams to get :id
app.use('/api/sessions/:id/qr', apiLimiter, sessionQrRouter);

// Teacher routes - handle auth internally
app.use('/api/teacher', apiLimiter, teacherRoutes);

// Recording uploads - handle auth internally
app.use('/api/recordings', uploadLimiter, recordingUploadRoutes);


// Org branding - public GET, admin PATCH
app.use('/api/org/branding', apiLimiter, orgBrandingRoutes);

// --- Tenant Info Endpoint ---
app.get('/api/tenant/info', (req, res) => {
  try {
    const tenant = (req as any).tenant;
    if (!tenant) {
      return res.status(400).json({ message: 'Organization context required.' });
    }
    res.json({
      organizationId: tenant.organizationId ?? null,
      name: tenant.name ?? '',
      subdomain: tenant.subdomain ?? 'default',
      plan: tenant.plan ?? 'free',
      userMonthlyPricePiasters: tenant.userMonthlyPricePiasters ?? null,
      userAnnualPricePiasters: tenant.userAnnualPricePiasters ?? null,
      userCurrency: tenant.userCurrency ?? 'EGP',
    });
  } catch (err) {
    try { logger.error('Tenant info error', err); } catch (_) { console.error('Tenant info error', err); }
    res.status(500).json({ message: 'Failed to load organization info.' });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Sentry error handler must be after all controllers and before other error middleware
if (process.env.SENTRY_DSN) {
  // Sentry error handler is already added in init above
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(err.status || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// Initialize WebSocket service for real-time notifications (chat, presence)
import { WebSocketService } from './services/websocket.service.js';
WebSocketService.initialize(server);

// Initialize Socket.IO real-time attendance tracking
import { initializeSocket } from './services/realtime.service.js';
initializeSocket(server).catch(err => logger.error('Socket.IO init failed:', err));

// Initialize AI Lesson Digestion Service
import { initLessonDigestion } from './services/lesson-digestion.service.js';

server.listen(PORT, () => {
  logger.info(`✅ Acadize backend server is running on http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket (chat) running on ws://localhost:${PORT}/ws`);
  logger.info(`⚡ Socket.IO (attendance) running on ws://localhost:${PORT}/attendance`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 Security: Helmet enabled, CORS configured`);
  logger.info(`⏱️  Rate limiting: ${isProduction ? 'STRICT' : 'RELAXED'} mode`);

  // Start AI lesson digestion in background (non-blocking)
  initLessonDigestion().catch(err => {
    logger.warn('AI Lesson Digestion initialization failed:', err.message);
  });
});