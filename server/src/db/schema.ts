import { pgTable, text, boolean, timestamp, varchar, pgEnum, date, integer, real, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { desc } from "drizzle-orm";
import { z } from "zod";

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin', 'parent', 'proctor']);
export const reportCardPeriodEnum = pgEnum('report_period', ['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'FINAL']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'file', 'image', 'video']);
export const conversationTypeEnum = pgEnum('conversation_type', ['group', 'direct']);
export const eventTypeEnum = pgEnum('event_type', ['class', 'meeting', 'holiday', 'exam', 'announcement']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'tardy', 'excused']);

// Organization Plan Enum
export const organizationPlanEnum = pgEnum('organization_plan', ['free', 'starter', 'professional', 'enterprise']);

// Exam & Anti-Cheat Enums
export const examStatusEnum = pgEnum('exam_status', ['draft', 'scheduled', 'active', 'completed', 'archived']);
export const questionTypeEnum = pgEnum('question_type', ['multiple_choice', 'true_false', 'short_answer', 'essay', 'code', 'matching', 'fill_blank']);
export const attemptStatusEnum = pgEnum('attempt_status', ['in_progress', 'submitted', 'graded', 'flagged', 'under_review', 'invalidated']);
export const antiCheatEventTypeEnum = pgEnum('anti_cheat_event_type', [
  'tab_switch', 'window_blur', 'copy_paste', 'right_click', 'keyboard_shortcut',
  'devtools_open', 'fullscreen_exit', 'multiple_monitors',
  'face_not_detected', 'multiple_faces', 'no_face_visible',
  'unauthorized_app', 'suspicious_pattern', 'rapid_answers',
  'unusual_timing', 'browser_extension_detected', 'screen_share_detected'
]);
export const eventSeverityEnum = pgEnum('event_severity', ['low', 'medium', 'high', 'critical']);
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'under_review', 'cleared', 'violation_confirmed', 'escalated']);
export const mistakeTypeEnum = pgEnum('mistake_type', ['wrong_answer', 'partial_credit', 'timeout', 'skipped']);
export const remediationStatusEnum = pgEnum('remediation_status', ['not_started', 'in_progress', 'completed', 'skipped']);
export const retakeStatusEnum = pgEnum('retake_status', ['pending', 'available', 'in_progress', 'completed', 'expired', 'cancelled']);

// Smart Attendance Enums
export const sessionTypeEnum = pgEnum('session_type', ['physical', 'online']);
export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'active', 'completed', 'cancelled']);
export const attendanceRecordStatusEnum = pgEnum('attendance_record_status', ['present', 'absent', 'late', 'excused']);
export const checkInMethodEnum = pgEnum('check_in_method', ['qr', 'zoom', 'manual']);
export const attendanceNotificationTypeEnum = pgEnum('attendance_notification_type', ['attendance_marked', 'low_attendance', 'session_starting', 'absent_alert']);
export const attendanceNotificationChannelEnum = pgEnum('attendance_notification_channel', ['in_app', 'sms', 'whatsapp', 'email']);
export const attendanceNotificationStatusEnum = pgEnum('attendance_notification_status', ['pending', 'sent', 'failed']);

// =====================================================
// ORGANIZATIONS (Multi-Tenant Core)
// =====================================================
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  subdomain: varchar("subdomain", { length: 63 }).notNull().unique(),
  customDomain: varchar("custom_domain", { length: 255 }).unique(),

  // Branding
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#6366f1"),
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#8b5cf6"),

  // Plan & Billing
  plan: organizationPlanEnum("plan").default("free").notNull(),
  maxUsers: integer("max_users").default(50),
  maxStorageGb: integer("max_storage_gb").default(5),

  // Paymob Billing (org-level B2B)
  paymobCustomerId: text("paymob_customer_id"),
  paymobSubscriptionId: text("paymob_subscription_id"),

  // Per-user subscription settings (B2C)
  userSubscriptionEnabled: boolean("user_subscription_enabled").default(false).notNull(),
  userMonthlyPricePiasters: integer("user_monthly_price_piasters"), // amount in piasters (e.g. 10000 = 100 EGP)
  userAnnualPricePiasters: integer("user_annual_price_piasters"),   // per month in piasters
  userCurrency: varchar("user_currency", { length: 3 }).default("EGP"),

  // Feature Configuration
  config: jsonb("config").default({}), // { features: {}, limits: {}, settings: {} }

  // i18n: default and enabled languages for this tenant
  defaultLocale: varchar("default_locale", { length: 5 }).default("en").notNull(),
  enabledLocales: jsonb("enabled_locales").default(["en"]).$type<string[]>().notNull(), // e.g. ["en", "ar"]

  // Contact
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  address: text("address"),

  // Status
  isActive: boolean("is_active").default(true).notNull(),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  subdomainIdx: uniqueIndex("org_subdomain_idx").on(table.subdomain),
  customDomainIdx: index("org_custom_domain_idx").on(table.customDomain),
  planIdx: index("org_plan_idx").on(table.plan),
  activeIdx: index("org_active_idx").on(table.isActive),
}));

// Organization Invites (for inviting users to an organization)
export const organizationInvites = pgTable("organization_invites", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("student").notNull(),
  invitedBy: text("invited_by").notNull(), // user id who sent invite
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("org_invite_org_idx").on(table.organizationId),
  emailIdx: index("org_invite_email_idx").on(table.email),
  tokenIdx: uniqueIndex("org_invite_token_idx").on(table.token),
}));


export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  username: varchar("username", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  password: text("password_hash").notNull(),
  role: userRoleEnum("role").default("student").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  preferredRole: userRoleEnum("preferred_role"),
  lastLoginAt: timestamp("last_login_at"),
  phone: text("phone"),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  grade: varchar("grade", { length: 50 }),
  preferredLocale: varchar("preferred_locale", { length: 5 }), // null = use org default
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
  isTemporaryPassword: boolean("is_temporary_password").default(false).notNull(),
}, (table) => ({
  orgIdx: index("users_org_idx").on(table.organizationId),
  orgEmailIdx: uniqueIndex("users_org_email_idx").on(table.organizationId, table.email),
  orgUsernameIdx: uniqueIndex("users_org_username_idx").on(table.organizationId, table.username),
  orgActiveIdx: index("users_org_active_idx").on(table.organizationId, table.isActive),
}));

// Refresh Tokens for JWT authentication
export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp("expires_at").notNull(),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_refresh_tokens_user_id").on(table.userId),
  tokenIdx: index("idx_refresh_tokens_token").on(table.token),
  expiresAtIdx: index("idx_refresh_tokens_expires_at").on(table.expiresAt),
}));

// Reference table for supported locales (seed data; used by admin UI and validation)
export const locales = pgTable("locales", {
  code: varchar("code", { length: 5 }).primaryKey(), // e.g. en, ar
  name: varchar("name", { length: 100 }).notNull(),   // e.g. English
  nativeName: varchar("native_name", { length: 100 }).notNull(),
  dir: varchar("dir", { length: 3 }).default("ltr").notNull(), // ltr | rtl
  isDefault: boolean("is_default").default(false).notNull(),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublished: boolean("is_published").default(false).notNull(),
  imageUrl: text("image_url"),
  /** Short code for students to join (e.g. 6–8 chars). Optional; when set, students can enroll via join code or invite link. */
  joinCode: varchar("join_code", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  orgIdx: index("courses_org_idx").on(table.organizationId),
  teacherIdx: index("courses_teacher_idx").on(table.teacherId),
  joinCodeIdx: index("courses_join_code_idx").on(table.joinCode),
}));

export const courseTranslations = pgTable("course_translations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  courseLocaleIdx: uniqueIndex("course_translations_course_locale_idx").on(table.courseId, table.locale),
}));

export const enrollments = pgTable("enrollments", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: text("file_size").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const lessonTranslations = pgTable("lesson_translations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  lessonId: text("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: text("title").notNull(),
  content: text("content"), // optional rich text / description per locale
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  lessonLocaleIdx: uniqueIndex("lesson_translations_lesson_locale_idx").on(table.lessonId, table.locale),
}));

export const assignments = pgTable("assignments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default('homework').notNull(),
  dueDate: timestamp("due_date"),
  maxScore: integer("max_score").default(100),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: text("file_size"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  status: text("status").default('submitted').notNull(),
}, (table) => ({
  assignmentSubmittedIdx: index("submissions_assignment_submitted_idx").on(table.assignmentId, table.submittedAt),
}));

export const grades = pgTable("grades", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: 'cascade' }).unique(),
  score: real("score").notNull(),
  maxScore: integer("max_score").default(100),
  feedback: text("feedback"),
  gradedBy: text("graded_by").references(() => users.id, { onDelete: 'set null' }),
  gradedAt: timestamp("graded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const announcementTranslations = pgTable("announcement_translations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  announcementId: text("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  announcementLocaleIdx: uniqueIndex("announcement_translations_announcement_locale_idx").on(table.announcementId, table.locale),
}));

export const reportCards = pgTable("report_cards", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  period: reportCardPeriodEnum("period").notNull(),
  academicYear: text("academic_year").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: text("file_size").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("report_cards_org_idx").on(table.organizationId),
}));

// --- STUDY GROUPS & MESSAGING ---
export const studyGroups = pgTable("study_groups", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  description: text("description"),
  courseId: text("course_id").references(() => courses.id, { onDelete: 'set null' }),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  autoGenerated: boolean("auto_generated").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const groupMembers = pgTable("group_members", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  groupId: text("group_id").notNull().references(() => studyGroups.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").default('member').notNull(), // 'admin', 'member'
  isMuted: boolean("is_muted").default(false).notNull(),
  isRestricted: boolean("is_restricted").default(false).notNull(),
  mutedUntil: timestamp("muted_until"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  type: conversationTypeEnum("type").notNull(),
  groupId: text("group_id").references(() => studyGroups.id, { onDelete: 'cascade' }),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at"),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: messageTypeEnum("type").default('text').notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: text("file_size"),
  fileType: text("file_type"),
  isEdited: boolean("is_edited").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const messageReadReceipts = pgTable("message_read_receipts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

export const userPresence = pgTable("user_presence", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").default('offline').notNull(), // 'online', 'offline', 'away'
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // 'new_message', 'mention', 'group_invite', 'dm_request'
  title: text("title").notNull(),
  message: text("message").notNull(),
  senderId: text("sender_id").references(() => users.id, { onDelete: 'cascade' }),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: 'cascade' }),
  groupId: text("group_id").references(() => studyGroups.id, { onDelete: 'cascade' }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("notifications_user_created_idx").on(table.userId, table.createdAt),
}));

export const blockedUsers = pgTable("blocked_users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedUserId: text("blocked_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportedUsers = pgTable("reported_users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportedUserId: text("reported_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text("reason").notNull(),
  context: text("context"),
  status: text("status").default('pending').notNull(), // 'pending', 'reviewed', 'resolved'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- PARENT-CHILD LINKING ---
export const parentChildren = pgTable("parent_children", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  parentId: text("parent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  childId: text("child_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

// --- CALENDAR & EVENTS ---
export const events = pgTable("events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  eventType: eventTypeEnum("event_type").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  meetingLink: text("meeting_link"),
  courseId: text("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isAllDay: boolean("is_all_day").default(false).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  maxParticipants: text("max_participants"),
  recurrence: text("recurrence"), // 'none', 'daily', 'weekly', 'monthly'
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const eventParticipants = pgTable("event_participants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").default('pending').notNull(), // 'pending', 'accepted', 'declined'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- ATTENDANCE TRACKING ---
export const attendance = pgTable("attendance", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  date: date("date").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  notes: text("notes"),
  markedBy: text("marked_by").notNull().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- PARENT-TEACHER MESSAGING ---
export const parentTeacherMessages = pgTable("parent_teacher_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  parentId: text("parent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  attachmentType: text("attachment_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- PARENT-TEACHER CONVERSATIONS (for threading) ---
export const parentTeacherConversations = pgTable("parent_teacher_conversations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  parentId: text("parent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text("subject"),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  parentUnreadCount: text("parent_unread_count").default('0'),
  teacherUnreadCount: text("teacher_unread_count").default('0'),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- PUSH SUBSCRIPTIONS ---
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- STUDY ACTIVITIES (for tracking daily learning activities) ---
export const studyActivities = pgTable("study_activities", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityDate: timestamp("activity_date").notNull(), // Date of the activity (normalized to start of day)
  activityType: text("activity_type").notNull(), // 'lesson_view', 'assignment_submit', 'quiz_complete', etc.
  durationMinutes: text("duration_minutes"), // Optional: time spent
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- STUDY STREAKS (for gamification and tracking consistency) ---
export const studyStreaks = pgTable("study_streaks", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  currentStreak: integer("current_streak").default(0).notNull(), // Current consecutive days
  longestStreak: integer("longest_streak").default(0).notNull(), // Best streak ever
  lastActivityDate: timestamp("last_activity_date"), // Last date user was active
  totalActiveDays: integer("total_active_days").default(0).notNull(), // Total days with activity
  weeklyGoalHours: real("weekly_goal_hours").default(10).notNull(), // User's weekly goal
  currentWeekHours: real("current_week_hours").default(0).notNull(), // Hours this week
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- LEGACY/STUB TABLES (for storage.ts compatibility) ---
export const applications = pgTable("applications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const newsArticles = pgTable("news_articles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text("image_url"),
  category: text("category"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const newsComments = pgTable("news_comments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  articleId: text("article_id").notNull().references(() => newsArticles.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffProfiles = pgTable("staff_profiles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id, { onDelete: 'set null' }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  email: text("email"),
  phone: text("phone"),
  officeLocation: text("office_location"),
  officeHours: text("office_hours"),
  displayOrder: text("display_order").default('0'),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const staffAchievements = pgTable("staff_achievements", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  staffId: text("staff_id").notNull().references(() => staffProfiles.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  year: text("year"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =====================================================
// EXAM & ANTI-CHEAT SYSTEM
// =====================================================

// --- EXAMS ---
export const exams = pgTable("exams", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Basic Info
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),

  // Scheduling
  status: examStatusEnum("status").default('draft').notNull(),
  scheduledStartAt: timestamp("scheduled_start_at"),
  scheduledEndAt: timestamp("scheduled_end_at"),
  duration: integer("duration").notNull(), // in minutes

  // Scoring & Passing
  totalPoints: integer("total_points").default(100).notNull(),
  passingScore: integer("passing_score").default(70).notNull(),

  // Attempt Settings
  attemptsAllowed: text("attempts_allowed").default('1').notNull(),
  maxAttempts: integer("max_attempts").default(1).notNull(),
  timeLimit: text("time_limit"), // per attempt in minutes
  lateSubmissionAllowed: boolean("late_submission_allowed").default(false).notNull(),
  lateSubmissionPenalty: integer("late_submission_penalty").default(0), // percentage penalty

  // Question Display Settings
  shuffleQuestions: boolean("shuffle_questions").default(false).notNull(),
  shuffleOptions: boolean("shuffle_options").default(false).notNull(),
  showResults: boolean("show_results").default(true).notNull(),
  showResultsImmediately: boolean("show_results_immediately").default(false).notNull(),
  showCorrectAnswers: boolean("show_correct_answers").default(false).notNull(),
  allowReview: boolean("allow_review").default(true).notNull(),
  allowBacktracking: boolean("allow_backtracking").default(false).notNull(),

  // Anti-Cheat Configuration
  antiCheatEnabled: boolean("anti_cheat_enabled").default(true).notNull(),
  requireWebcam: boolean("require_webcam").default(false).notNull(),
  requireScreenShare: boolean("require_screen_share").default(false).notNull(),
  requireFullscreen: boolean("require_fullscreen").default(true).notNull(),
  requireLockdownBrowser: boolean("require_lockdown_browser").default(false).notNull(),
  lockBrowser: boolean("lock_browser").default(false).notNull(),
  tabSwitchLimit: integer("tab_switch_limit").default(3), // null = unlimited
  copyPasteAllowed: boolean("copy_paste_allowed").default(false).notNull(),
  rightClickAllowed: boolean("right_click_allowed").default(false).notNull(),

  // Access Control
  accessCode: varchar("access_code", { length: 255 }),
  ipWhitelist: jsonb("ip_whitelist"),

  // Retake Policy
  retakeEnabled: boolean("retake_enabled").default(true).notNull(),
  retakeDelay: integer("retake_delay").default(24), // hours before retake available
  adaptiveRetake: boolean("adaptive_retake").default(true).notNull(), // mistake-based questions

  // Privacy & Compliance
  recordingDisclosure: text("recording_disclosure"), // disclosure text for students
  dataRetentionDays: integer("data_retention_days").default(365), // GDPR compliance

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  courseIdx: index("exam_course_idx").on(table.courseId),
  statusIdx: index("exam_status_idx").on(table.status),
  scheduleIdx: index("exam_schedule_idx").on(table.scheduledStartAt, table.scheduledEndAt),
  orgStatusIdx: index("exam_org_status_idx").on(table.organizationId, table.status),
}));

export const examTranslations = pgTable("exam_translations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 5 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  instructions: text("instructions"),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  examLocaleIdx: uniqueIndex("exam_translations_exam_locale_idx").on(table.examId, table.locale),
}));

// --- EXAM QUESTIONS ---
export const examQuestions = pgTable("exam_questions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: 'cascade' }),

  // Question Content
  questionType: questionTypeEnum("question_type").notNull(),
  questionText: text("question_text").notNull(),
  questionImageUrl: text("question_image_url"),
  questionCodeSnippet: text("question_code_snippet"),

  // Options/Choices (for MCQ, True/False, Matching)
  options: jsonb("options"), // Array of option objects: [{id, text, imageUrl}]
  correctAnswer: jsonb("correct_answer").notNull(), // Flexible: single id, array of ids, or text

  // Scoring
  points: integer("points").default(1).notNull(),
  partialCreditEnabled: boolean("partial_credit_enabled").default(false).notNull(),

  // Metadata for Analytics & Mistake Tracking
  topic: varchar("topic", { length: 255 }), // e.g., "Algebra", "Functions", "Grammar"
  subtopic: varchar("subtopic", { length: 255 }), // e.g., "Quadratic Equations"
  skillTag: varchar("skill_tag", { length: 255 }), // e.g., "problem_solving", "critical_thinking"
  difficultyLevel: varchar("difficulty_level", { length: 50 }), // e.g., "easy", "medium", "hard"
  bloomsTaxonomy: varchar("blooms_taxonomy", { length: 50 }), // e.g., "remember", "understand", "apply"

  // Question Bank Integration
  questionBankId: text("question_bank_id"), // if pulled from a reusable question bank

  // Display Order
  order: integer("order").notNull(),
  sectionName: varchar("section_name", { length: 255 }), // optional section grouping

  // Grading (for manual grading)
  requiresManualGrading: boolean("requires_manual_grading").default(false).notNull(),
  rubric: text("rubric"), // grading rubric for essay/code questions

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  examIdx: index("exam_question_exam_idx").on(table.examId),
  topicIdx: index("exam_question_topic_idx").on(table.topic),
  difficultyIdx: index("exam_question_difficulty_idx").on(table.difficultyLevel),
}));

// --- EXAM ATTEMPTS ---
export const examAttempts = pgTable("exam_attempts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Attempt Info
  attemptNumber: integer("attempt_number").notNull(), // 1, 2, 3, etc.
  status: attemptStatusEnum("status").default('in_progress').notNull(),

  // Timing
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  timeRemaining: text("time_remaining"), // stored as text in DB (usually numeric seconds)
  duration: integer("duration_seconds"), // actual time taken in seconds

  // Session Info
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"), // hash of device characteristics
  browserInfo: jsonb("browser_info"), // {name, version, os, screen resolution}

  // Scoring
  score: real("score"), // actual score achieved
  maxScore: integer("max_score"), // total points possible
  percentage: real("percentage"), // score / maxScore * 100
  passed: boolean("passed"), // true if percentage >= passing score

  // Grading
  autoGraded: boolean("auto_graded"), // true if automatically graded
  gradedAt: timestamp("graded_at"),
  gradedBy: text("graded_by").references(() => users.id, { onDelete: 'set null' }),

  // Anti-Cheat Flags
  flaggedForReview: boolean("flagged_for_review").default(false).notNull(),
  integrityScore: real("integrity_score").default(0), // 0-100, calculated from anti-cheat events
  locationData: jsonb("location_data"), // geolocation data

  // Retake Info
  isRetake: boolean("is_retake").default(false).notNull(),
  originalAttemptId: text("original_attempt_id").references((): any => examAttempts.id, { onDelete: 'set null' }),
  retakeReason: text("retake_reason"), // e.g., "failed", "violation", "mistake_based"

  // Privacy & Compliance
  webcamRecordingUrl: text("webcam_recording_url"), // encrypted storage URL
  screenRecordingUrl: text("screen_recording_url"), // encrypted storage URL
  metadata: jsonb("metadata"), // flexible metadata storage

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  examStudentIdx: index("exam_attempt_exam_student_idx").on(table.examId, table.studentId),
  studentIdx: index("exam_attempt_student_idx").on(table.studentId),
  statusIdx: index("exam_attempt_status_idx").on(table.status),
  flaggedIdx: index("exam_attempt_flagged_idx").on(table.flaggedForReview),
  retakeIdx: index("exam_attempt_retake_idx").on(table.isRetake, table.originalAttemptId),
  uniqueAttempt: uniqueIndex("exam_attempt_unique_idx").on(table.examId, table.studentId, table.attemptNumber),
}));

// --- EXAM ANSWERS ---
export const examAnswers = pgTable("exam_answers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: 'cascade' }),
  questionId: text("question_id").notNull().references(() => examQuestions.id, { onDelete: 'cascade' }),

  // Student Response
  answer: jsonb("answer"), // flexible: string, number, array, object
  isCorrect: boolean("is_correct"), // null until graded

  // Scoring
  pointsAwarded: real("points_awarded").default(0),
  pointsPossible: integer("points_possible").default(1).notNull(),

  // Timing
  answeredAt: timestamp("answered_at").notNull(),
  timeSpentSeconds: integer("time_spent_seconds"), // seconds spent on this question

  // Instructor Review
  feedback: text("feedback"), // grader feedback
  flagged: boolean("flagged").default(false).notNull(),

  // AI Scoring
  aiScore: real("ai_score"),
  aiFeedback: text("ai_feedback"),
  manuallyReviewed: boolean("manually_reviewed").default(false).notNull(),

  // Metadata
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  attemptIdx: index("exam_answer_attempt_idx").on(table.attemptId),
  questionIdx: index("exam_answer_question_idx").on(table.questionId),
  correctnessIdx: index("exam_answer_correctness_idx").on(table.isCorrect),
  uniqueAnswer: uniqueIndex("exam_answer_unique_idx").on(table.attemptId, table.questionId),
}));

// --- ANTI-CHEAT EVENTS ---
export const antiCheatEvents = pgTable("anti_cheat_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: 'cascade' }),

  // Event Classification
  eventType: antiCheatEventTypeEnum("event_type").notNull(),
  severity: eventSeverityEnum("severity").notNull(),

  // Event Details
  description: text("description"),
  metadata: jsonb("metadata"), // flexible event-specific data

  // Detection Info
  detectedBy: varchar("detected_by", { length: 100 }), // 'browser_monitor', 'ai_model', 'proctor'
  aiConfidence: real("ai_confidence"), // 0-1 for AI-detected events

  // Context
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  questionId: text("question_id").references(() => examQuestions.id, { onDelete: 'set null' }),

  // Device/Browser Info
  deviceInfo: jsonb("device_info"),
  screenshotUrl: text("screenshot_url"), // if screenshot captured
  videoTimestamp: integer("video_timestamp"), // second in recording where event occurred

  // Review Status
  reviewStatus: reviewStatusEnum("review_status").default('pending').notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  attemptIdx: index("anti_cheat_event_attempt_idx").on(table.attemptId),
  typeIdx: index("anti_cheat_event_type_idx").on(table.eventType),
  severityIdx: index("anti_cheat_event_severity_idx").on(table.severity),
  timestampIdx: index("anti_cheat_event_timestamp_idx").on(table.timestamp),
  reviewStatusIdx: index("anti_cheat_event_review_status_idx").on(table.reviewStatus),
}));

// --- ANTI-CHEAT RISK SCORES ---
export const antiCheatRiskScores = pgTable("anti_cheat_risk_scores", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: 'cascade' }).unique(),

  // Overall Risk Assessment
  overallRiskScore: real("overall_risk_score").default(0).notNull(), // 0-100
  riskLevel: varchar("risk_level", { length: 50 }), // 'low', 'medium', 'high', 'critical'

  // Category Scores (0-100 each)
  behaviorScore: real("behavior_score").default(0),
  timingScore: real("timing_score").default(0),
  deviceScore: real("device_score").default(0),
  biometricScore: real("biometric_score").default(0),
  patternScore: real("pattern_score").default(0),

  // Event Counts by Severity
  lowSeverityCount: integer("low_severity_count").default(0),
  mediumSeverityCount: integer("medium_severity_count").default(0),
  highSeverityCount: integer("high_severity_count").default(0),
  criticalSeverityCount: integer("critical_severity_count").default(0),

  // Specific Violation Counts
  tabSwitchCount: integer("tab_switch_count").default(0),
  copyPasteCount: integer("copy_paste_count").default(0),
  fullscreenExitCount: integer("fullscreen_exit_count").default(0),
  faceDetectionIssues: integer("face_detection_issues").default(0),

  // Review Decision
  requiresManualReview: boolean("requires_manual_review").default(false).notNull(),
  reviewPriority: integer("review_priority").default(0), // 0-10, higher = more urgent

  // Final Verdict
  finalVerdict: varchar("final_verdict", { length: 50 }), // 'cleared', 'warning', 'violation', 'invalidated'
  verdictReason: text("verdict_reason"),
  decidedBy: text("decided_by").references(() => users.id, { onDelete: 'set null' }),
  decidedAt: timestamp("decided_at"),

  // ML Model Info
  modelVersion: varchar("model_version", { length: 50 }),
  modelPrediction: jsonb("model_prediction"), // raw model output

  // Metadata
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  attemptIdx: index("anti_cheat_risk_score_attempt_idx").on(table.attemptId),
  riskLevelIdx: index("anti_cheat_risk_score_risk_level_idx").on(table.riskLevel),
  reviewIdx: index("anti_cheat_risk_score_review_idx").on(table.requiresManualReview, table.reviewPriority),
}));

// --- MISTAKE POOL (for mistake tracking & adaptive learning) ---
export const mistakePool = pgTable("mistake_pool", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: 'cascade' }),
  answerId: text("answer_id").notNull().references(() => examAnswers.id, { onDelete: 'cascade' }),
  questionId: text("question_id").notNull().references(() => examQuestions.id, { onDelete: 'cascade' }),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: 'cascade' }),

  // Mistake Classification
  mistakeType: mistakeTypeEnum("mistake_type").notNull(),

  // Question Metadata (denormalized for analytics)
  topic: varchar("topic", { length: 255 }),
  subtopic: varchar("subtopic", { length: 255 }),
  skillTag: varchar("skill_tag", { length: 255 }),
  difficultyLevel: varchar("difficulty_level", { length: 50 }),

  // Student's Response
  studentAnswer: jsonb("student_answer"),
  correctAnswer: jsonb("correct_answer"),

  // Scoring
  pointsLost: real("points_lost").notNull(),
  pointsPossible: integer("points_possible").notNull(),

  // Timing
  occurredAt: timestamp("occurred_at").notNull(),

  // Remediation Tracking
  remediationStatus: remediationStatusEnum("remediation_status").default('not_started').notNull(),
  remediationStartedAt: timestamp("remediation_started_at"),
  remediationCompletedAt: timestamp("remediation_completed_at"),
  resourcesViewed: jsonb("resources_viewed"), // array of lesson/resource ids

  // Retake Tracking
  includedInRetake: boolean("included_in_retake").default(false).notNull(),
  retakeExamId: text("retake_exam_id").references(() => mistakeRetakeExams.id, { onDelete: 'set null' }),
  correctedInRetake: boolean("corrected_in_retake"), // null until retake completed
  retakeAttemptId: text("retake_attempt_id").references(() => examAttempts.id, { onDelete: 'set null' }),

  // Pattern Analysis
  isRepeatedMistake: boolean("is_repeated_mistake").default(false).notNull(), // same topic/skill error before
  repetitionCount: integer("repetition_count").default(1), // how many times made this type of mistake

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  studentIdx: index("mistake_pool_student_idx").on(table.studentId),
  attemptIdx: index("mistake_pool_attempt_idx").on(table.attemptId),
  topicIdx: index("mistake_pool_topic_idx").on(table.topic),
  skillIdx: index("mistake_pool_skill_idx").on(table.skillTag),
  remediationIdx: index("mistake_pool_remediation_idx").on(table.remediationStatus),
  retakeIdx: index("mistake_pool_retake_idx").on(table.includedInRetake, table.retakeExamId),
  patternIdx: index("mistake_pool_pattern_idx").on(table.studentId, table.topic, table.isRepeatedMistake),
}));

// --- MISTAKE RETAKE EXAMS ---
export const mistakeRetakeExams = pgTable("mistake_retake_exams", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  originalExamId: text("original_exam_id").notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalAttemptId: text("original_attempt_id").notNull().references(() => examAttempts.id, { onDelete: 'cascade' }),

  // Retake Info
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: retakeStatusEnum("status").default('pending').notNull(),

  // Scheduling
  availableFrom: timestamp("available_from").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  duration: integer("duration").notNull(), // in minutes

  // Question Selection Strategy
  adaptiveStrategy: jsonb("adaptive_strategy").notNull(), // config for question selection
  totalQuestions: integer("total_questions").notNull(),
  totalPoints: integer("total_points").notNull(),

  // Mistake Pattern Targeting
  targetTopics: jsonb("target_topics").notNull(), // array of topics to focus on
  targetSkills: jsonb("target_skills"), // array of skills to reinforce
  mistakeIds: jsonb("mistake_ids").notNull(), // array of mistake pool ids being addressed

  // Difficulty Adjustment
  adjustedDifficulty: boolean("adjusted_difficulty").default(true).notNull(),
  difficultyModifier: real("difficulty_modifier").default(1.0), // 0.8 = easier, 1.2 = harder

  // Completion
  completedAt: timestamp("completed_at"),
  attemptId: text("attempt_id").references(() => examAttempts.id, { onDelete: 'set null' }),
  score: real("score"),
  passed: boolean("passed"),
  improvementPercentage: real("improvement_percentage"), // vs original attempt

  // Notifications
  studentNotified: boolean("student_notified").default(false).notNull(),
  notifiedAt: timestamp("notified_at"),
  reminderSentAt: timestamp("reminder_sent_at"),

  // Metadata
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedBy: text("generated_by").references(() => users.id, { onDelete: 'set null' }), // system or teacher
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  studentIdx: index("mistake_retake_exam_student_idx").on(table.studentId),
  originalExamIdx: index("mistake_retake_exam_original_idx").on(table.originalExamId),
  statusIdx: index("mistake_retake_exam_status_idx").on(table.status),
  availabilityIdx: index("mistake_retake_exam_availability_idx").on(table.availableFrom, table.expiresAt),
  notificationIdx: index("mistake_retake_exam_notification_idx").on(table.studentNotified, table.status),
}));

// =====================================================
// SUBSCRIPTION & BILLING TABLES
// =====================================================

// Subscription status enum
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'canceled', 'expired']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'succeeded', 'failed', 'refunded']);

// Promo Codes
export const promoCodes = pgTable("promo_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(), // e.g. "TRIAL30"
  description: text("description"),
  discountPercent: integer("discount_percent"), // 0-100
  trialDays: integer("trial_days"), // Override trial days
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  codeOrgIdx: uniqueIndex("promo_code_org_idx").on(table.code, table.organizationId),
  orgIdx: index("promo_code_org_lookup_idx").on(table.organizationId),
  activeIdx: index("promo_code_active_idx").on(table.isActive),
}));

// User Subscriptions (B2C — per-user billing within an org)
export const userSubscriptions = pgTable("user_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Paymob references
  paymobOrderId: text("paymob_order_id"),
  paymobTransactionId: text("paymob_transaction_id"),

  // Promo code used
  promoCodeId: text("promo_code_id").references(() => promoCodes.id, { onDelete: 'set null' }),

  // Status & billing
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  billingCycle: varchar("billing_cycle", { length: 10 }), // 'monthly' | 'annual'
  amountPiasters: integer("amount_piasters"), // price locked at subscription time
  currency: varchar("currency", { length: 3 }).default("EGP"),

  // Trial tracking
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),

  // Billing period
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),

  // Metadata
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userOrgIdx: uniqueIndex("user_sub_user_org_idx").on(table.userId, table.organizationId),
  orgIdx: index("user_sub_org_idx").on(table.organizationId),
  statusIdx: index("user_sub_status_idx").on(table.status),
  trialEndIdx: index("user_sub_trial_end_idx").on(table.trialEnd),
}));

// Payment History (both org and user payments)
export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text("user_id").references(() => users.id, { onDelete: 'set null' }), // null = org-level payment
  userSubscriptionId: text("user_subscription_id").references(() => userSubscriptions.id, { onDelete: 'set null' }),

  // Paymob details
  paymobOrderId: text("paymob_order_id"),
  paymobTransactionId: text("paymob_transaction_id"),

  // Payment info
  amountPiasters: integer("amount_piasters").notNull(), // amount in piasters
  currency: varchar("currency", { length: 3 }).default("EGP"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }), // 'card', 'wallet', 'fawry'
  description: text("description"),
  metadata: jsonb("metadata"), // Registration data for retry functionality

  // Timestamps
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("payment_org_idx").on(table.organizationId),
  userIdx: index("payment_user_idx").on(table.userId),
  statusIdx: index("payment_status_idx").on(table.status),
  paymobOrderIdx: index("payment_paymob_order_idx").on(table.paymobOrderId),
}));


// =====================================================
// SMART ATTENDANCE SYSTEM
// =====================================================

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Session identity
  sessionType: sessionTypeEnum("session_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: sessionStatusEnum("status").default("scheduled").notNull(),

  // Zoom (online sessions)
  zoomMeetingId: varchar("zoom_meeting_id", { length: 100 }),

  // QR (physical sessions)
  qrToken: varchar("qr_token", { length: 255 }),
  qrExpiresAt: timestamp("qr_expires_at"),
  qrExpiryMinutes: integer("qr_expiry_minutes").default(10).notNull(),
  qrRotationEnabled: boolean("qr_rotation_enabled").default(false).notNull(),
  qrRotationIntervalSeconds: integer("qr_rotation_interval_seconds").default(30).notNull(),

  // GPS (physical sessions)
  gpsRequired: boolean("gps_required").default(false).notNull(),
  gpsLat: real("gps_lat"),          // academy latitude
  gpsLng: real("gps_lng"),          // academy longitude
  gpsRadius: integer("gps_radius").default(100).notNull(), // meters

  // Attendance configuration
  minAttendancePercent: integer("min_attendance_percent").default(75).notNull(),

  // Scheduling
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  orgIdx: index("sessions_org_idx").on(table.organizationId),
  courseIdx: index("sessions_course_idx").on(table.courseId),
  createdByIdx: index("sessions_created_by_idx").on(table.createdBy),
  statusIdx: index("sessions_status_idx").on(table.status),
  startTimeIdx: index("sessions_start_time_idx").on(table.startTime),
}));

export const attendanceRecords = pgTable("attendance_records", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Timing
  joinTime: timestamp("join_time").notNull(),
  leaveTime: timestamp("leave_time"),
  durationMinutes: integer("duration_minutes"),
  attendancePercent: real("attendance_percent"),

  // Status
  status: attendanceRecordStatusEnum("status").default("present").notNull(),
  checkInMethod: checkInMethodEnum("check_in_method").notNull(),

  // GPS validation
  gpsLat: real("gps_lat"),
  gpsLng: real("gps_lng"),
  gpsValid: boolean("gps_valid"),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionUserIdx: uniqueIndex("attendance_session_user_idx").on(table.sessionId, table.userId),
  sessionIdx: index("attendance_session_idx").on(table.sessionId),
  userIdx: index("attendance_user_idx").on(table.userId),
  statusIdx: index("attendance_status_idx").on(table.status),
}));

export const qrTokens = pgTable("qr_tokens", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  usedBy: text("used_by").references(() => users.id, { onDelete: 'set null' }),

  // Token data
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("qr_tokens_session_idx").on(table.sessionId),
  tokenIdx: uniqueIndex("qr_tokens_token_idx").on(table.token),
  expiresAtIdx: index("qr_tokens_expires_at_idx").on(table.expiresAt),
}));

export const attendanceNotifications = pgTable("attendance_notifications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: text("parent_id").references(() => users.id, { onDelete: 'set null' }),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: 'cascade' }),

  // Notification details
  type: attendanceNotificationTypeEnum("type").notNull(),
  channel: attendanceNotificationChannelEnum("channel").notNull(),
  status: attendanceNotificationStatusEnum("status").default("pending").notNull(),

  // Content
  message: text("message"),

  // Delivery tracking
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0).notNull(),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("att_notif_user_idx").on(table.userId),
  parentIdx: index("att_notif_parent_idx").on(table.parentId),
  sessionIdx: index("att_notif_session_idx").on(table.sessionId),
  statusIdx: index("att_notif_status_idx").on(table.status),
  typeIdx: index("att_notif_type_idx").on(table.type),
}));

// =====================================================
// GAMIFICATION
// =====================================================

export const gamificationSettings = pgTable("gamification_settings", {
  organizationId: text("organization_id").primaryKey().references(() => organizations.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").default(false).notNull(),
  pointsEnabled: boolean("points_enabled").default(true).notNull(),
  levelsEnabled: boolean("levels_enabled").default(true).notNull(),
  badgesEnabled: boolean("badges_enabled").default(true).notNull(),
  leaderboardEnabled: boolean("leaderboard_enabled").default(false).notNull(),
  levelNaming: varchar("level_naming", { length: 50 }).default("Level").notNull(),
  pointNaming: varchar("point_naming", { length: 50 }).default("XP").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const gamificationPointRules = pgTable("gamification_point_rules", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  points: integer("points").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  orgEventIdx: index("gamification_point_rules_org_event_idx").on(table.organizationId, table.eventType),
  orgEventUniqueIdx: uniqueIndex("gamification_point_rules_org_event_unique_idx").on(table.organizationId, table.eventType),
}));

export const gamificationLevels = pgTable("gamification_levels", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  levelNumber: integer("level_number").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  minPoints: integer("min_points").notNull(),
  maxPoints: integer("max_points"),
  badgeEmoji: varchar("badge_emoji", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgLevelUniqueIdx: uniqueIndex("gamification_levels_org_level_unique_idx").on(table.organizationId, table.levelNumber),
}));

export const gamificationBadges = pgTable("gamification_badges", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  emoji: varchar("emoji", { length: 10 }),
  criteriaType: varchar("criteria_type", { length: 50 }).notNull(),
  criteriaValue: integer("criteria_value").notNull(),
  courseId: text("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  orgIdx: index("gamification_badges_org_idx").on(table.organizationId),
  courseIdx: index("gamification_badges_course_idx").on(table.courseId),
}));

export const userGamificationProfiles = pgTable("user_gamification_profiles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  totalPoints: integer("total_points").default(0).notNull(),
  currentLevelId: text("current_level_id").references(() => gamificationLevels.id, { onDelete: 'set null' }),
  currentLevelNumber: integer("current_level_number").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  userOrgUniqueIdx: uniqueIndex("user_gamification_profiles_user_org_unique_idx").on(table.userId, table.organizationId),
  leaderboardIdx: index("user_gamification_profiles_org_total_points_idx").on(table.organizationId, desc(table.totalPoints)),
}));

export const gamificationEvents = pgTable("gamification_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  pointsAwarded: integer("points_awarded").default(0).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
}, (table) => ({
  userEventEntityUniqueIdx: uniqueIndex("gamification_events_user_event_entity_unique_idx").on(table.userId, table.eventType, table.entityId),
  orgUserIdx: index("gamification_events_org_user_idx").on(table.organizationId, table.userId),
  userOccurredAtIdx: index("gamification_events_user_occurred_at_idx").on(table.userId, desc(table.occurredAt)),
}));

export const userBadges = pgTable("user_badges", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeId: text("badge_id").notNull().references(() => gamificationBadges.id, { onDelete: 'cascade' }),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
}, (table) => ({
  userBadgeUniqueIdx: uniqueIndex("user_badges_user_badge_unique_idx").on(table.userId, table.badgeId),
  userOrgIdx: index("user_badges_user_org_idx").on(table.userId, table.organizationId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actorId: text("actor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(),
  targetId: text("target_id"),
  targetType: text("target_type"),
  // using jsonb if possible, otherwise text for serialized payload, let's use jsonb
  metadata: jsonb("metadata"),
  // Using json from drizzle to be safe
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("audit_logs_org_idx").on(table.organizationId),
  actorIdx: index("audit_logs_actor_idx").on(table.actorId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
}));

// =====================================================
// TYPE EXPORTS
// =====================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type ExamQuestion = typeof examQuestions.$inferSelect;
export type NewExamQuestion = typeof examQuestions.$inferInsert;
export type ExamAttempt = typeof examAttempts.$inferSelect;
export type NewExamAttempt = typeof examAttempts.$inferInsert;
export type ExamAnswer = typeof examAnswers.$inferSelect;
export type NewExamAnswer = typeof examAnswers.$inferInsert;
export type ReportCard = typeof reportCards.$inferSelect;
export type NewReportCard = typeof reportCards.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type NewStudyGroup = typeof studyGroups.$inferInsert;
export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type GamificationSettings = typeof gamificationSettings.$inferSelect;
export type GamificationPointRule = typeof gamificationPointRules.$inferSelect;
export type GamificationLevel = typeof gamificationLevels.$inferSelect;
export type GamificationBadge = typeof gamificationBadges.$inferSelect;
export type UserGamificationProfile = typeof userGamificationProfiles.$inferSelect;
export type GamificationEvent = typeof gamificationEvents.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type NewNewsArticle = typeof newsArticles.$inferInsert;
export type StaffProfile = typeof staffProfiles.$inferSelect;
export type NewStaffProfile = typeof staffProfiles.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// Enum Types
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ReportPeriod = (typeof reportCardPeriodEnum.enumValues)[number];
export type OrganizationPlan = (typeof organizationPlanEnum.enumValues)[number];
export type ExamStatus = (typeof examStatusEnum.enumValues)[number];
export type QuestionType = (typeof questionTypeEnum.enumValues)[number];
export type AttemptStatus = (typeof attemptStatusEnum.enumValues)[number];
export type ConversationType = (typeof conversationTypeEnum.enumValues)[number];
export type MessageType = (typeof messageTypeEnum.enumValues)[number];
