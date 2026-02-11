import { db } from '../db/index.js';
import { users, courses, enrollments, announcements, grades, submissions, assignments, reportedUsers, studyGroups, parentChildren } from '../db/schema.js';
import { eq, sql, desc, asc, and, or, like, count, avg } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

export interface CreateUserInput {
  username: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
  password: string;
  organizationId?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  fullName?: string;
  role?: 'student' | 'teacher' | 'admin' | 'parent';
  isActive?: boolean;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  recentSignups: number;
  pendingReports: number;
}

export interface UserStats {
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  newUsersThisWeek: number;
  activeToday: number;
}

export interface UserGrowthData {
  month: string;
  students: number;
  teachers: number;
  parents: number;
  total: number;
}

/**
 * Get system overview statistics
 */
export async function getSystemStats(organizationId?: string): Promise<SystemStats> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const orgFilter = organizationId ? eq(users.organizationId, organizationId) : undefined;
  const courseOrgFilter = organizationId ? eq(courses.organizationId, organizationId) : undefined;

  // Total users
  const [totalUsersResult] = orgFilter
    ? await db.select({ count: count() }).from(users).where(orgFilter)
    : await db.select({ count: count() }).from(users);

  // Active users
  const [activeUsersResult] = orgFilter
    ? await db.select({ count: count() }).from(users).where(and(eq(users.isActive, true), orgFilter)!)
    : await db.select({ count: count() }).from(users).where(eq(users.isActive, true));

  // Total courses
  const [totalCoursesResult] = courseOrgFilter
    ? await db.select({ count: count() }).from(courses).where(courseOrgFilter)
    : await db.select({ count: count() }).from(courses);

  // Total enrollments - filtered by org via courses
  let enrollStatsQuery = db
    .select({ count: count() })
    .from(enrollments);
  if (organizationId) {
    enrollStatsQuery = enrollStatsQuery
      .innerJoin(courses, eq(enrollments.courseId, courses.id)) as any;
  }
  const [totalEnrollmentsResult] = organizationId
    ? await (enrollStatsQuery as any).where(eq(courses.organizationId, organizationId))
    : await enrollStatsQuery;

  // Recent signups (last 7 days)
  const [recentSignupsResult] = orgFilter
    ? await db.select({ count: count() }).from(users).where(and(sql`${users.createdAt} >= ${oneWeekAgo}`, orgFilter)!)
    : await db.select({ count: count() }).from(users).where(sql`${users.createdAt} >= ${oneWeekAgo}`);

  // Pending reports - filtered by org via reported user
  let pendingReportsQuery = db
    .select({ count: count() })
    .from(reportedUsers);
  if (organizationId) {
    pendingReportsQuery = pendingReportsQuery
      .innerJoin(users, eq(reportedUsers.reportedUserId, users.id)) as any;
  }
  const [pendingReportsResult] = organizationId
    ? await (pendingReportsQuery as any).where(and(eq(reportedUsers.status, 'pending'), eq(users.organizationId, organizationId))!)
    : await pendingReportsQuery.where(eq(reportedUsers.status, 'pending'));

  return {
    totalUsers: totalUsersResult.count,
    activeUsers: activeUsersResult.count,
    totalCourses: totalCoursesResult.count,
    totalEnrollments: totalEnrollmentsResult.count,
    recentSignups: recentSignupsResult.count,
    pendingReports: pendingReportsResult.count
  };
}

/**
 * Get user statistics by role
 */
export async function getUserStats(organizationId?: string): Promise<UserStats> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const orgFilter = organizationId ? eq(users.organizationId, organizationId) : undefined;

  // Count by role
  const usersByRole = orgFilter
    ? await db.select({ role: users.role, count: count() }).from(users).where(orgFilter).groupBy(users.role)
    : await db.select({ role: users.role, count: count() }).from(users).groupBy(users.role);

  const stats = {
    students: 0,
    teachers: 0,
    parents: 0,
    admins: 0,
    newUsersThisWeek: 0,
    activeToday: 0
  };

  usersByRole.forEach(row => {
    if (row.role === 'student') stats.students = row.count;
    else if (row.role === 'teacher') stats.teachers = row.count;
    else if (row.role === 'parent') stats.parents = row.count;
    else if (row.role === 'admin') stats.admins = row.count;
  });

  // New users this week
  const [newUsersResult] = orgFilter
    ? await db.select({ count: count() }).from(users).where(and(sql`${users.createdAt} >= ${oneWeekAgo}`, orgFilter)!)
    : await db.select({ count: count() }).from(users).where(sql`${users.createdAt} >= ${oneWeekAgo}`);

  stats.newUsersThisWeek = newUsersResult.count;

  // Active today
  stats.activeToday = orgFilter
    ? await db.select({ count: count() }).from(users).where(and(eq(users.isActive, true), orgFilter)!).then(r => r[0].count)
    : await db.select({ count: count() }).from(users).where(eq(users.isActive, true)).then(r => r[0].count);

  return stats;
}

/**
 * Get all users with optional filtering
 */
export async function getAllUsers(filters?: {
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  organizationId?: string;
}) {
  let query = db.select().from(users);

  // Apply filters
  const conditions = [];

  // Always filter by organization if provided
  if (filters?.organizationId) {
    conditions.push(eq(users.organizationId, filters.organizationId));
  }

  if (filters?.role && filters.role !== 'all') {
    conditions.push(eq(users.role, filters.role as any));
  }

  if (filters?.status) {
    if (filters.status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (filters.status === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        like(users.fullName, searchTerm),
        like(users.email, searchTerm),
        like(users.username, searchTerm)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  // Apply pagination
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  const result = await query.orderBy(desc(users.createdAt));

  // Remove password from response
  return result.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput) {
  if (!input.organizationId) {
    throw new Error('Organization ID is required to create a user');
  }

  // Check if username or email already exists within the same organization
  const existingUser = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.organizationId, input.organizationId),
        or(
          eq(users.username, input.username),
          eq(users.email, input.email)
        )!
      )!
    )
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('Username or email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(input.password, 10);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      id: createId(),
      organizationId: input.organizationId,
      username: input.username,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      password: hashedPassword,
      isActive: true
    })
    .returning();

  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

/**
 * Update user
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  // Check if user exists
  const existingUser = await getUserById(userId);

  // If updating username or email, check for duplicates
  if (input.username || input.email) {
    const duplicateCheck = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.id} != ${userId}`,
          or(
            input.username ? eq(users.username, input.username) : sql`false`,
            input.email ? eq(users.email, input.email) : sql`false`
          )!
        )!
      )
      .limit(1);

    if (duplicateCheck.length > 0) {
      throw new Error('Username or email already in use');
    }
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...input,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning();

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string) {
  await db
    .delete(users)
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Toggle user status (activate/deactivate)
 */
export async function toggleUserStatus(userId: string, status: boolean) {
  const [updatedUser] = await db
    .update(users)
    .set({
      isActive: status,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning();

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}

/**
 * Get all courses with teacher info
 */
export async function getAllCourses(filters?: {
  published?: boolean;
  teacherId?: string;
  search?: string;
  organizationId?: string;
}) {
  const conditions = [];

  // Always filter by organization if provided
  if (filters?.organizationId) {
    conditions.push(eq(courses.organizationId, filters.organizationId));
  }

  if (filters?.published !== undefined) {
    conditions.push(eq(courses.isPublished, filters.published));
  }

  if (filters?.teacherId) {
    conditions.push(eq(courses.teacherId, filters.teacherId));
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(like(courses.title, searchTerm));
  }

  const query = db
    .select({
      course: courses,
      teacher: users
    })
    .from(courses)
    .leftJoin(users, eq(courses.teacherId, users.id));

  const result = conditions.length > 0
    ? await (query.where(and(...conditions)!) as any).orderBy(desc(courses.createdAt))
    : await query.orderBy(desc(courses.createdAt));

  return result.map((row: any) => ({
    ...row.course,
    teacher: row.teacher ? {
      id: row.teacher.id,
      fullName: row.teacher.fullName,
      email: row.teacher.email
    } : null
  }));
}

/**
 * Create enrollment
 */
export async function createEnrollment(studentId: string, courseId: string) {
  // Check if enrollment already exists
  const existing = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, courseId)
      )!
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Student is already enrolled in this course');
  }

  const [enrollment] = await db
    .insert(enrollments)
    .values({
      id: createId(),
      studentId,
      courseId
    })
    .returning();

  return enrollment;
}

/**
 * Remove enrollment
 */
export async function removeEnrollment(enrollmentId: string) {
  await db
    .delete(enrollments)
    .where(eq(enrollments.id, enrollmentId));

  return { success: true };
}

/**
 * Get platform analytics
 */
export async function getPlatformAnalytics(organizationId?: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const orgFilter = organizationId ? eq(users.organizationId, organizationId) : undefined;
  const courseOrgFilter = organizationId ? eq(courses.organizationId, organizationId) : undefined;

  // User growth over last 10 months
  const userGrowth: UserGrowthData[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 9; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const dateConditions = [
      sql`${users.createdAt} <= ${monthEnd}`,
      sql`${users.createdAt} >= ${new Date(2024, 0, 1)}`
    ];
    if (orgFilter) dateConditions.push(orgFilter as any);

    const usersByRole = await db
      .select({
        role: users.role,
        count: count()
      })
      .from(users)
      .where(and(...dateConditions)!)
      .groupBy(users.role);

    const monthData = {
      month: months[date.getMonth()],
      students: 0,
      teachers: 0,
      parents: 0,
      total: 0
    };

    usersByRole.forEach(row => {
      if (row.role === 'student') monthData.students = row.count;
      else if (row.role === 'teacher') monthData.teachers = row.count;
      else if (row.role === 'parent') monthData.parents = row.count;
      monthData.total += row.count;
    });

    userGrowth.push(monthData);
  }

  // Recent activity (assignments, submissions, announcements) - filtered by org via courses
  let recentAssignmentsQuery = db
    .select({ count: count() })
    .from(assignments);
  if (organizationId) {
    recentAssignmentsQuery = recentAssignmentsQuery
      .innerJoin(courses, eq(assignments.courseId, courses.id)) as any;
  }
  const [recentAssignments] = await (recentAssignmentsQuery as any)
    .where(
      organizationId
        ? and(sql`${assignments.createdAt} >= ${thirtyDaysAgo}`, eq(courses.organizationId, organizationId))!
        : sql`${assignments.createdAt} >= ${thirtyDaysAgo}`
    );

  let recentSubmissionsQuery = db
    .select({ count: count() })
    .from(submissions);
  if (organizationId) {
    recentSubmissionsQuery = recentSubmissionsQuery
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(courses, eq(assignments.courseId, courses.id)) as any;
  }
  const [recentSubmissions] = await (recentSubmissionsQuery as any)
    .where(
      organizationId
        ? and(sql`${submissions.submittedAt} >= ${thirtyDaysAgo}`, eq(courses.organizationId, organizationId))!
        : sql`${submissions.submittedAt} >= ${thirtyDaysAgo}`
    );

  let recentAnnouncementsQuery = db
    .select({ count: count() })
    .from(announcements);
  if (organizationId) {
    recentAnnouncementsQuery = recentAnnouncementsQuery
      .innerJoin(courses, eq(announcements.courseId, courses.id)) as any;
  }
  const [recentAnnouncements] = await (recentAnnouncementsQuery as any)
    .where(
      organizationId
        ? and(sql`${announcements.createdAt} >= ${thirtyDaysAgo}`, eq(courses.organizationId, organizationId))!
        : sql`${announcements.createdAt} >= ${thirtyDaysAgo}`
    );

  // Course statistics
  const [publishedCourses] = courseOrgFilter
    ? await db.select({ count: count() }).from(courses).where(and(eq(courses.isPublished, true), courseOrgFilter)!)
    : await db.select({ count: count() }).from(courses).where(eq(courses.isPublished, true));

  // Enrollments - filtered by org via courses
  let enrollmentsQuery = db
    .select({ count: count() })
    .from(enrollments);
  if (organizationId) {
    enrollmentsQuery = enrollmentsQuery
      .innerJoin(courses, eq(enrollments.courseId, courses.id)) as any;
  }
  const [totalEnrollments] = organizationId
    ? await (enrollmentsQuery as any).where(eq(courses.organizationId, organizationId))
    : await enrollmentsQuery;

  return {
    userGrowth,
    recentActivity: {
      assignments: recentAssignments.count,
      submissions: recentSubmissions.count,
      announcements: recentAnnouncements.count
    },
    courseStats: {
      published: publishedCourses.count,
      totalEnrollments: totalEnrollments.count
    }
  };
}

/**
 * Get moderation reports
 */
export async function getModerationReports(filters?: {
  status?: 'pending' | 'reviewed' | 'resolved';
  limit?: number;
  organizationId?: string;
}) {
  const { alias } = await import('drizzle-orm/pg-core');
  const reporter = alias(users, 'reporter');
  const reportedUser = alias(users, 'reportedUser');

  const conditions: any[] = [];

  if (filters?.status) {
    conditions.push(eq(reportedUsers.status, filters.status));
  }

  // Filter by organization - only show reports where the reported user belongs to this org
  if (filters?.organizationId) {
    conditions.push(eq(reportedUser.organizationId, filters.organizationId));
  }

  let query = db
    .select({
      report: reportedUsers,
      reporter: reporter,
      reportedUser: reportedUser
    })
    .from(reportedUsers)
    .leftJoin(reporter, eq(reportedUsers.reporterId, reporter.id))
    .leftJoin(reportedUser, eq(reportedUsers.reportedUserId, reportedUser.id));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  const result = await query.orderBy(desc(reportedUsers.createdAt));

  return result.map((row: any) => ({
    ...row.report,
    reporter: row.reporter ? {
      id: row.reporter.id,
      fullName: row.reporter.fullName,
      email: row.reporter.email
    } : null,
    reportedUser: row.reportedUser ? {
      id: row.reportedUser.id,
      fullName: row.reportedUser.fullName,
      email: row.reportedUser.email
    } : null
  }));
}

/**
 * Update report status
 */
export async function updateReportStatus(reportId: string, status: 'pending' | 'reviewed' | 'resolved') {
  const [updatedReport] = await db
    .update(reportedUsers)
    .set({ status })
    .where(eq(reportedUsers.id, reportId))
    .returning();

  return updatedReport;
}

/**
 * Bulk user import
 */
export async function bulkImportUsers(usersData: CreateUserInput[]) {
  const results: {
    success: any[];
    failed: { user: CreateUserInput; error: string }[];
  } = {
    success: [],
    failed: []
  };

  for (const userData of usersData) {
    try {
      const user = await createUser(userData);
      results.success.push(user);
    } catch (error) {
      results.failed.push({
        user: userData,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Link a student to a parent
 */
export async function linkStudentToParent(studentId: string, parentId: string) {
  // Verify student and parent exist and have correct roles
  const [student] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.id, studentId),
      eq(users.role, 'student')
    ));

  if (!student) {
    throw new Error('Student not found');
  }

  const [parent] = await db
    .select()
    .from(users)
    .where(and(
      eq(users.id, parentId),
      eq(users.role, 'parent')
    ));

  if (!parent) {
    throw new Error('Parent not found');
  }

  // Check if link already exists
  const [existingLink] = await db
    .select()
    .from(parentChildren)
    .where(and(
      eq(parentChildren.parentId, parentId),
      eq(parentChildren.childId, studentId)
    ));

  if (existingLink) {
    throw new Error('Student is already linked to this parent');
  }

  // Create the link
  const [link] = await db
    .insert(parentChildren)
    .values({
      parentId,
      childId: studentId
    })
    .returning();

  return {
    success: true,
    link,
    message: `${student.fullName} successfully linked to ${parent.fullName}`
  };
}

/**
 * Unlink a student from their parent
 */
export async function unlinkStudentFromParent(studentId: string) {
  // Find and delete the parent-child relationship
  const deletedLinks = await db
    .delete(parentChildren)
    .where(eq(parentChildren.childId, studentId))
    .returning();

  if (deletedLinks.length === 0) {
    throw new Error('No parent link found for this student');
  }

  return {
    success: true,
    message: 'Student unlinked from parent successfully'
  };
}

/**
 * Get all students with their parent information
 */
export async function getStudentsWithParents(organizationId?: string) {
  const conditions: any[] = [eq(users.role, 'student')];
  if (organizationId) {
    conditions.push(eq(users.organizationId, organizationId));
  }

  const result = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      parentId: parentChildren.parentId,
      parentName: sql<string>`parent_user.full_name`,
      parentEmail: sql<string>`parent_user.email`
    })
    .from(users)
    .leftJoin(
      parentChildren,
      eq(users.id, parentChildren.childId)
    )
    .leftJoin(
      sql`${users} as parent_user`,
      sql`parent_user.id = ${parentChildren.parentId}`
    )
    .where(and(...conditions)!)
    .orderBy(asc(users.fullName));

  return result.map(row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.fullName,
    parentId: row.parentId,
    parentName: row.parentName
  }));
}
