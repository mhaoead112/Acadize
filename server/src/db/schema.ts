import { pgTable, text, boolean, timestamp, varchar, pgEnum, date } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin', 'parent']);
export const reportCardPeriodEnum = pgEnum('report_period', ['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'FINAL']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'file', 'image', 'video']);
export const conversationTypeEnum = pgEnum('conversation_type', ['group', 'direct']);
export const eventTypeEnum = pgEnum('event_type', ['class', 'meeting', 'holiday', 'exam', 'announcement']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'tardy', 'excused']);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  username: varchar("username", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  isPublished: boolean("is_published").default(false).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

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
  order: text("order").default('0'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const assignments = pgTable("assignments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  courseId: text("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: text("lesson_id").references(() => lessons.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default('homework').notNull(),
  dueDate: timestamp("due_date"),
  maxScore: text("max_score").default('100'),
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
});

export const grades = pgTable("grades", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: 'cascade' }).unique(),
  score: text("score").notNull(),
  maxScore: text("max_score").default('100'),
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

export const reportCards = pgTable("report_cards", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  period: reportCardPeriodEnum("period").notNull(),
  academicYear: text("academic_year").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: text("file_size").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

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
  currentStreak: text("current_streak").default('0').notNull(), // Current consecutive days
  longestStreak: text("longest_streak").default('0').notNull(), // Best streak ever
  lastActivityDate: timestamp("last_activity_date"), // Last date user was active
  totalActiveDays: text("total_active_days").default('0').notNull(), // Total days with activity
  weeklyGoalHours: text("weekly_goal_hours").default('10').notNull(), // User's weekly goal
  currentWeekHours: text("current_week_hours").default('0').notNull(), // Hours this week
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

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  conversationId: text("conversation_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
