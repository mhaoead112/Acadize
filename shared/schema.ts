// shared/schema.ts

import { pgTable, text, varchar, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm'; // <-- CRITICAL: Import 'sql' from the main package
import { createId } from '@paralleldrive/cuid2';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin', 'parent']);
export const reportCardPeriodEnum = pgEnum('report_period', ['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'FINAL']);
export const eventTypeEnum = pgEnum('event_type', ['assignment', 'exam', 'class', 'event', 'deadline', 'meeting']);

// --- CORE TABLES (Auth and Users) ---
export const users = pgTable('users', {
    id: text('id').$defaultFn(() => createId()).primaryKey(),
    username: varchar('username', { length: 255 }).notNull().unique(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password_hash').notNull(),
    role: userRoleEnum('role').default('student').notNull(),
    profilePicture: text('profile_picture'),
    phone: text('phone'),
    bio: text('bio'),
    grade: varchar('grade', { length: 50 }), // For students: "Grade 1", "Grade 2", etc.
    isActive: boolean('is_active').default(true).notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    emailVerificationToken: text('email_verification_token'),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpires: timestamp('password_reset_expires'),
    preferredRole: userRoleEnum('preferred_role'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- COURSES TABLES (from develop branch) ---
export const courses = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => createId()), 
  title: text("title").notNull(),
  description: text("description"),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text("image_url"), // Optional course cover image
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const enrollments = pgTable("enrollments", {
  id: text('id').$defaultFn(() => createId()).primaryKey(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
});

// --- LESSONS TABLES ---
export const lessons = pgTable("lessons", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: text("file_size").notNull(),
  order: text("order").default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- ASSIGNMENTS TABLES ---
export const assignments = pgTable("assignments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp('due_date'),
  maxScore: text("max_score").default('100'),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- SUBMISSIONS TABLES ---
export const submissions = pgTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content"),
  filePath: text("file_path"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: text("file_size"),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: text("status").default('submitted').notNull(),
});

// --- GRADES TABLES ---
export const grades = pgTable("grades", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: 'cascade' }).unique(),
  score: text("score").notNull(),
  maxScore: text("max_score").default('100'),
  feedback: text("feedback"),
  gradedBy: text("graded_by").references(() => users.id, { onDelete: 'set null' }),
  gradedAt: timestamp('graded_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- ANNOUNCEMENTS TABLES ---
export const announcements = pgTable("announcements", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// --- EVENTS TABLES ---
export const events = pgTable("events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  eventType: eventTypeEnum("event_type").notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: text("location"),
  meetingLink: text("meeting_link"),
  courseId: text("course_id").references(() => courses.id, { onDelete: 'cascade' }),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublic: boolean("is_public").default(true).notNull(),
  maxParticipants: text("max_participants"),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

export const eventParticipants = pgTable("event_participants", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").default('registered').notNull(), // registered, attended, cancelled
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
});

// --- REPORT CARDS TABLES ---
export const reportCards = pgTable("report_cards", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  period: reportCardPeriodEnum("period").notNull(),
  academicYear: text("academic_year").notNull(), // e.g., "2024-2025"
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: text("file_size").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- STAFF TABLES (from auth-feature branch) ---
export const staffProfiles = pgTable("staff_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  title: text("title").notNull(),
  bio: text("bio"),
  email: text("email").unique(),
  phone: text("phone"),
  office: text("office_location"),
  photoUrl: text("photo_url"),
  department: text("department"),
  isPublic: boolean("is_public").default(true),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: text("display_order").default('0'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staffAchievements = pgTable("staff_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => staffProfiles.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("award"),
  date: timestamp("date").notNull(),
  organization: text("organization"),
  url: text("url"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- STUDY ACTIVITY & STREAKS ---
export const studyActivity = pgTable("study_activity", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityDate: timestamp("activity_date").notNull(), // Date of the activity (normalized to start of day)
  activityType: text("activity_type").notNull(), // 'lesson_view', 'assignment_submit', 'quiz_complete', etc.
  durationMinutes: text("duration_minutes"), // Optional: time spent
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studyStreaks = pgTable("study_streaks", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  currentStreak: text("current_streak").default('0').notNull(), // Current consecutive days
  longestStreak: text("longest_streak").default('0').notNull(), // Best streak ever
  lastActivityDate: timestamp("last_activity_date"), // Last date user was active
  totalActiveDays: text("total_active_days").default('0').notNull(), // Total days with activity
  weeklyGoalHours: text("weekly_goal_hours").default('10').notNull(), // User's weekly goal
  currentWeekHours: text("current_week_hours").default('0').notNull(), // Hours this week
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- PUSH SUBSCRIPTIONS TABLE ---
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  userAgent: text("user_agent"), // Browser/device info
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

// --- ZOD SCHEMAS & TYPES ---
// User schemas
export const insertUserSchema = createInsertSchema(users, {
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  username: z.string().min(1, "Username is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(['student', 'teacher', 'admin', 'parent']).optional(),
  preferredRole: z.enum(['student', 'teacher', 'admin', 'parent']).optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Course schemas
export const insertCourseSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters").max(255),
  description: z.string().min(10, "Course description must be at least 10 characters").max(2000),
  courseCode: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  semesterStart: z.string().optional().nullable(),
  semesterEnd: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  teacherId: z.string().min(1, "Teacher ID is required"),
  isPublished: z.boolean().optional(),
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Lesson title is required").max(255),
  courseId: z.string().min(1, "Course ID is required"),
  fileName: z.string().min(1, "File name is required"),
  filePath: z.string().min(1, "File path is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.string().min(1, "File size is required"),
  order: z.string().optional().default('0'),
});

export const insertAssignmentSchema = createInsertSchema(assignments, {
  isPublished: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Assignment title is required").max(255),
  courseId: z.string().min(1, "Course ID is required"),
  lessonId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  maxScore: z.string().optional().default('100'),
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
}).extend({
  assignmentId: z.string().min(1, "Assignment ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  content: z.string().optional(),
  filePath: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.string().optional(),
  status: z.string().optional().default('submitted'),
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  gradedAt: true,
}).extend({
  submissionId: z.string().min(1, "Submission ID is required"),
  score: z.string().min(1, "Score is required"),
  maxScore: z.string().optional().default('100'),
  feedback: z.string().optional(),
  gradedBy: z.string().optional(),
});

export const insertAnnouncementSchema = createInsertSchema(announcements, {
  isPinned: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  courseId: z.string().min(1, "Course ID is required"),
  teacherId: z.string().min(1, "Teacher ID is required"),
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Content is required"),
});

export const insertEventSchema = createInsertSchema(events, {
  isPublic: z.boolean().optional(),
  isAllDay: z.boolean().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Event title is required").max(255),
  description: z.string().optional(),
  eventType: z.enum(['assignment', 'exam', 'class', 'event', 'deadline', 'meeting']),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  courseId: z.string().optional(),
  createdBy: z.string().min(1, "Creator ID is required"),
  maxParticipants: z.string().optional(),
});

export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({
  id: true,
  registeredAt: true,
}).extend({
  eventId: z.string().min(1, "Event ID is required"),
  userId: z.string().min(1, "User ID is required"),
  status: z.string().optional().default('registered'),
});

export const insertReportCardSchema = createInsertSchema(reportCards).omit({
  id: true,
  createdAt: true,
  uploadedAt: true,
}).extend({
  studentId: z.string().min(1, "Student ID is required"),
  period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'FINAL']),
  academicYear: z.string().min(1, "Academic year is required"),
  fileName: z.string().min(1, "File name is required"),
  filePath: z.string().min(1, "File path is required"),
  fileSize: z.string().min(1, "File size is required"),
  uploadedBy: z.string().min(1, "Uploaded by is required"),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;
export type ReportCard = typeof reportCards.$inferSelect;
export type InsertReportCard = z.infer<typeof insertReportCardSchema>;
export type ReportPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'S1' | 'S2' | 'FINAL';
export type EventType = 'assignment' | 'exam' | 'class' | 'event' | 'deadline' | 'meeting';

// Staff schemas (stub - actual tables in server schema)
export const insertStaffProfileSchema = z.object({
  userId: z.string(),
  department: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.string().optional(),
  qualifications: z.string().optional(),
  yearsOfExperience: z.number().optional(),
});

export const insertStaffAchievementSchema = z.object({
  staffId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  date: z.date().optional(),
});

export type StaffProfile = {
  id: string;
  userId: string;
  department?: string | null;
  position?: string | null;
  bio?: string | null;
  specialization?: string | null;
  qualifications?: string | null;
  yearsOfExperience?: number | null;
  createdAt: Date;
  updatedAt: Date;
};
export type InsertStaffProfile = z.infer<typeof insertStaffProfileSchema>;

export type StaffAchievement = {
  id: string;
  staffId: string;
  title: string;
  description?: string | null;
  date?: Date | null;
  createdAt: Date;
};
export type InsertStaffAchievement = z.infer<typeof insertStaffAchievementSchema>;

// Study activity schemas (stub - actual tables in server schema)
export const insertStudyActivitySchema = z.object({
  userId: z.string(),
  activityType: z.string(),
  duration: z.number(),
  courseId: z.string().optional(),
  metadata: z.any().optional(),
});

export const insertStudyStreakSchema = z.object({
  userId: z.string(),
  currentStreak: z.number().default(0),
  longestStreak: z.number().default(0),
  lastActivityDate: z.date(),
});

export type StudyActivity = {
  id: string;
  userId: string;
  activityType: string;
  duration: number;
  courseId?: string | null;
  metadata?: any;
  createdAt: Date;
};
export type InsertStudyActivity = z.infer<typeof insertStudyActivitySchema>;
export type StudyStreak = {
  id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  updatedAt: Date;
};
export type InsertStudyStreak = z.infer<typeof insertStudyStreakSchema>;

// Push subscription schemas (stub - actual tables in server schema)
export const insertPushSubscriptionSchema = z.object({
  userId: z.string(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().optional(),
});

export type PushSubscription = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';

// Group Chat Types (for client compatibility - actual tables in server/src/db/schema.ts)
export type Group = {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  creatorId: string;
  createdAt: Date;
  conversationId: string;
  type?: 'group' | 'direct';
  privacy?: 'public' | 'private';
  memberLimit?: number | null;
  requireApproval?: boolean;
  allowMemberInvite?: boolean;
};

export type GroupMember = {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
};

export type GroupMessage = {
  id: string;
  conversationId: string;
  groupId: string | null;
  senderId: string;
  userId?: string; // alias for senderId (for backward compatibility)
  content: string;
  messageType: 'text' | 'file' | 'image' | 'video';
  metadata: any | null;
  replyToId: string | null;
  replyTo?: GroupMessage | null;
  senderName?: string;
  createdAt: Date;
};

// InsertGroupMessage matches the actual 'messages' table structure in server/src/db/schema.ts
export type InsertGroupMessage = {
  conversationId: string;
  senderId: string;
  type?: 'text' | 'file' | 'image' | 'video';
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: string | null;
  fileType?: string | null;
  isEdited?: boolean;
  isDeleted?: boolean;
};

// ========== STUB VALIDATION SCHEMAS FOR LEGACY/EXTERNAL FEATURES ==========
// These are minimal schemas for features that may not have database tables yet
// but are referenced in server routes. Replace with proper table-based schemas when needed.

export const insertApplicationSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export const insertContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export const insertChatMessageSchema = z.object({
  senderId: z.string(),
  content: z.string(),
  conversationId: z.string().optional(),
});

export const insertGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  creatorId: z.string(),
  avatarUrl: z.string().optional(),
  privacy: z.enum(['public', 'private']).optional(),
  memberLimit: z.number().optional(),
  requireApproval: z.boolean().optional(),
  allowMemberInvite: z.boolean().optional(),
});

export const insertGroupMemberSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
  role: z.enum(['admin', 'moderator', 'member']).optional(),
});

export const insertGroupMessageSchema = z.object({
  conversationId: z.string(),
  groupId: z.string().optional(),
  senderId: z.string(),
  content: z.string(),
  messageType: z.enum(['text', 'file', 'image', 'video']).optional(),
  metadata: z.any().optional(),
  replyToId: z.string().optional(),
});

export const insertMessageReactionSchema = z.object({
  messageId: z.string(),
  userId: z.string(),
  reaction: z.string(),
});

export const insertGroupPollSchema = z.object({
  groupId: z.string(),
  question: z.string().min(1),
  options: z.array(z.string()),
  createdBy: z.string(),
  expiresAt: z.date().optional(),
});

export const insertPollVoteSchema = z.object({
  pollId: z.string(),
  userId: z.string(),
  optionIndex: z.number(),
});

export const insertRaiseHandRequestSchema = z.object({
  userId: z.string(),
  groupId: z.string().optional(),
  reason: z.string().optional(),
});

export const insertFileAttachmentSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  fileSize: z.string(),
  fileType: z.string(),
  uploadedBy: z.string(),
});

export const insertClassSchema = z.object({
  name: z.string().min(1),
  teacherId: z.string(),
  description: z.string().optional(),
  schedule: z.string().optional(),
});

export const insertClassEnrollmentSchema = z.object({
  classId: z.string(),
  studentId: z.string(),
});

export const insertNewsArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  authorId: z.string(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export const insertEventRegistrationSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  status: z.enum(['registered', 'pending', 'declined']).optional(),
});

export const insertNewsCommentSchema = z.object({
  articleId: z.string(),
  userId: z.string(),
  content: z.string().min(1),
});

// ========== LEGACY TYPE EXPORTS FOR STORAGE.TS COMPATIBILITY ==========
// These types are for features that may be partially implemented or planned

export type Application = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  createdAt: Date;
};

export type InsertApplication = Omit<Application, 'id' | 'createdAt'>;

export type Contact = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
};

export type InsertContact = Omit<Contact, 'id' | 'createdAt'>;

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  message?: string; // alias for content
  response?: string; // for AI responses
  conversationId?: string | null;
  createdAt: Date;
};

export type InsertChatMessage = Omit<ChatMessage, 'id' | 'createdAt'>;

export type FileAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  fileType: string;
  fileUrl?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  messageId?: string | null;
  uploadedBy: string;
  scanStatus?: string | null;
  createdAt: Date;
};

export type InsertFileAttachment = Omit<FileAttachment, 'id' | 'createdAt'>;

export type MessageReaction = {
  id: string;
  messageId: string;
  userId: string;
  reaction: string;
  createdAt: Date;
};

export type InsertMessageReaction = Omit<MessageReaction, 'id' | 'createdAt'>;

export type GroupPoll = {
  id: string;
  groupId: string;
  question: string;
  options: string[];
  createdBy: string;
  expiresAt?: Date | null;
  createdAt: Date;
};

export type InsertGroupPoll = Omit<GroupPoll, 'id' | 'createdAt'>;

export type PollVote = {
  id: string;
  pollId: string;
  userId: string;
  optionIndex: number;
  createdAt: Date;
};

export type InsertPollVote = Omit<PollVote, 'id' | 'createdAt'>;

export type RaiseHandRequest = {
  id: string;
  userId: string;
  groupId?: string | null;
  reason?: string | null;
  status: 'pending' | 'acknowledged' | 'dismissed';
  createdAt: Date;
};

export type InsertRaiseHandRequest = Omit<RaiseHandRequest, 'id' | 'createdAt' | 'status'>;

export type NewsArticle = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  slug?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
};

export type InsertNewsArticle = Omit<NewsArticle, 'id' | 'createdAt' | 'updatedAt'>;

export type EventRegistration = {
  id: string;
  eventId: string;
  userId: string;
  status: 'registered' | 'pending' | 'declined';
  createdAt: Date;
};

export type InsertEventRegistration = Omit<EventRegistration, 'id' | 'createdAt'>;

export type InsertGroup = {
  name: string;
  description?: string | null;
  creatorId: string;
  avatarUrl?: string | null;
  privacy?: 'public' | 'private';
  memberLimit?: number | null;
  requireApproval?: boolean;
  allowMemberInvite?: boolean;
};

export type InsertGroupMember = {
  groupId: string;
  userId: string;
  role?: 'admin' | 'moderator' | 'member';
};

export type NewsComment = {
  id: string;
  articleId: string;
  userId: string;
  content: string;
  createdAt: Date;
};

export type InsertNewsComment = Omit<NewsComment, 'id' | 'createdAt'>;