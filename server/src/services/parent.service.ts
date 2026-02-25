import { db } from '../db/index.js';
import { users, enrollments, courses, grades, submissions, assignments, parentChildren, attendance, attendanceRecords, sessions, lessons, announcements, events, reportCards, eventParticipants, parentTeacherMessages, parentTeacherConversations } from '../db/schema.js';
import { studyStreaks } from '../db/schema.js';
import { eq, and, sql, desc, gte, lte, gt, lt, asc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Simple in-memory cache for dashboard data
interface CacheEntry {
  data: any;
  timestamp: number;
}

const dashboardCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

function getCacheKey(parentId: string): string {
  return `dashboard:${parentId}`;
}

function setCache(key: string, data: any): void {
  dashboardCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function getCache(key: string): any | null {
  const entry = dashboardCache.get(key);
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    dashboardCache.delete(key);
    return null;
  }
  
  return entry.data;
}

export function invalidateDashboardCache(parentId: string): void {
  dashboardCache.delete(getCacheKey(parentId));
}

/**
 * Link a child to a parent using a link code
 */
export async function linkChild(parentId: string, linkCode: string) {
  // Link code is the student's username
  const [student] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.username, linkCode),
        eq(users.role, 'student')
      )!
    )
    .limit(1);

  if (!student) {
    throw new Error('Invalid link code or student not found');
  }

  // Check if already linked
  const existing = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, student.id)
      )!
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Child is already linked to this parent');
  }

  // Create link
  await db
    .insert(parentChildren)
    .values({
      id: createId(),
      parentId,
      childId: student.id
    });

  return {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    username: student.username
  };
}

/**
 * Get all children linked to a parent
 */
export async function getParentChildren(parentId: string) {
  const children = await db
    .select({
      link: parentChildren,
      child: users
    })
    .from(parentChildren)
    .leftJoin(users, eq(parentChildren.childId, users.id))
    .where(eq(parentChildren.parentId, parentId));

  // Enrich with additional data for each child
  const enrichedChildren = await Promise.all(
    children.map(async (row) => {
      const childId = row.child!.id;
      
      // Get enrollment count
      const childEnrollments = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.studentId, childId));
      
      // Get attendance records
      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(eq(attendance.studentId, childId));
      
      const totalAttendance = attendanceRecords.length;
      const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
      
      // Calculate overall grade average
      const childGrades = await db
        .select({
          grade: grades,
          submission: submissions,
          assignment: assignments
        })
        .from(grades)
        .leftJoin(submissions, eq(grades.submissionId, submissions.id))
        .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .where(eq(submissions.studentId, childId));
      
      let overallGrade = 'N/A';
      if (childGrades.length > 0) {
        const avgScore = childGrades.reduce((sum, g) => {
          const score = parseFloat(g.grade.score);
          const maxScore = parseFloat(g.grade.maxScore || '100');
          return sum + (score / maxScore * 100);
        }, 0) / childGrades.length;
        
        if (avgScore >= 90) overallGrade = 'A';
        else if (avgScore >= 80) overallGrade = 'B+';
        else if (avgScore >= 70) overallGrade = 'B';
        else if (avgScore >= 60) overallGrade = 'C';
        else overallGrade = 'D';
      }
      
      return {
        id: row.child!.id,
        fullName: row.child!.fullName,
        email: row.child!.email,
        username: row.child!.username,
        grade: 'Grade 8', // TODO: Add grade level to users table
        school: 'EduVerse Academy', // TODO: Add school to users table
        overallGrade,
        attendance: attendanceRate,
        coursesEnrolled: childEnrollments.length,
        linkedAt: row.link.linkedAt
      };
    })
  );

  return enrichedChildren;
}

/**
 * Get child's grades by childId with pagination
 */
export async function getChildGrades(
  parentId: string, 
  childId: string,
  options: { page?: number; limit?: number; courseId?: string } = {}
) {
  const { page = 1, limit = 10, courseId } = options;
  
  // Verify parent has access to this child
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (!link) {
    throw new Error('Unauthorized access to child data');
  }
  
  // Get all enrollments for the student
  let enrollmentQuery = db
    .select({
      enrollment: enrollments,
      course: courses,
      teacher: users
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(courses.teacherId, users.id))
    .where(eq(enrollments.studentId, childId));

  const studentEnrollments = await enrollmentQuery;

  // Get grades for each course
  const coursesWithGrades = await Promise.all(
    studentEnrollments.map(async (enrollment) => {
      if (!enrollment.course) return null;

      // Get assignments for this course
      const courseAssignments = await db
        .select({
          assignment: assignments,
          submission: submissions,
          grade: grades
        })
        .from(assignments)
        .leftJoin(
          submissions,
          and(
            eq(submissions.assignmentId, assignments.id),
            eq(submissions.studentId, childId)
          )!
        )
        .leftJoin(grades, eq(grades.submissionId, submissions.id))
        .where(eq(assignments.courseId, enrollment.course.id));

      // Calculate average grade
      const gradedAssignments = courseAssignments.filter(a => a.grade);
      let averageGrade = 0;
      
      if (gradedAssignments.length > 0) {
        const totalScore = gradedAssignments.reduce((sum, a) => {
          const score = parseFloat(a.grade!.score);
          const maxScore = parseFloat(a.grade!.maxScore || '100');
          return sum + (score / maxScore) * 100;
        }, 0);
        averageGrade = totalScore / gradedAssignments.length;
      }

      return {
        courseId: enrollment.course.id,
        courseName: enrollment.course.title,
        teacher: enrollment.teacher ? enrollment.teacher.fullName : 'Unknown',
        averageGrade: Math.round(averageGrade),
        totalAssignments: courseAssignments.length,
        gradedAssignments: gradedAssignments.length,
        assignments: courseAssignments.map(a => ({
          id: a.assignment.id,
          title: a.assignment.title,
          dueDate: a.assignment.dueDate,
          score: a.grade ? parseFloat(a.grade.score) : null,
          maxScore: a.grade ? parseFloat(a.grade.maxScore || '100') : parseFloat(a.assignment.maxScore || '100'),
          feedback: a.grade?.feedback,
          status: !a.submission ? 'not_submitted' : a.grade ? 'graded' : 'submitted'
        }))
      };
    })
  );

  const filteredCourses = coursesWithGrades.filter(c => c !== null);
  
  // Apply pagination to courses
  const startIndex = (page - 1) * limit;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + limit);
  
  return {
    grades: paginatedCourses,
    pagination: {
      page,
      limit,
      total: filteredCourses.length,
      totalPages: Math.ceil(filteredCourses.length / limit)
    }
  };
}

/**
 * Get child's attendance (session-based from attendance_records + legacy attendance table fallback)
 * Primary source: attendance_records (QR/session check-ins). Fallback: legacy attendance table.
 */
export async function getChildAttendance(parentId: string, childId: string) {
  // Verify parent has access to this child
  const link = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (link.length === 0) {
    throw new Error('Unauthorized access to child data');
  }

  // 1) Session-based attendance (attendance_records — QR check-ins)
  const sessionRecords = await db
    .select({
      id: attendanceRecords.id,
      joinTime: attendanceRecords.joinTime,
      leaveTime: attendanceRecords.leaveTime,
      status: attendanceRecords.status,
      sessionTitle: sessions.title,
      sessionStart: sessions.startTime,
      courseId: sessions.courseId,
      courseTitle: courses.title,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
    .innerJoin(courses, eq(sessions.courseId, courses.id))
    .where(eq(attendanceRecords.userId, childId))
    .orderBy(desc(sessions.startTime));

  if (sessionRecords.length > 0) {
    const totalSessions = sessionRecords.length;
    const presentDays = sessionRecords.filter(r => r.status === 'present').length;
    const lateDays = sessionRecords.filter(r => r.status === 'late').length;
    const absentDays = sessionRecords.filter(r => r.status === 'absent').length;
    const excusedDays = sessionRecords.filter(r => r.status === 'excused').length;
    const attended = presentDays + lateDays;
    const attendanceRate = totalSessions > 0 ? (attended / totalSessions) * 100 : 0;

    return {
      totalDays: totalSessions,
      presentDays,
      absentDays,
      tardyDays: lateDays,
      excusedDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      records: sessionRecords.map(r => ({
        id: r.id,
        date: r.sessionStart instanceof Date ? r.sessionStart.toISOString().slice(0, 10) : String(r.sessionStart).slice(0, 10),
        status: r.status,
        courseName: r.courseTitle || 'Unknown',
        notes: null,
        joinTime: r.joinTime,
        leaveTime: r.leaveTime ?? undefined,
        sessionTitle: r.sessionTitle,
      }))
    };
  }

  // 2) Fallback: legacy attendance table (daily)
  const records = await db
    .select({
      attendance: attendance,
      course: courses
    })
    .from(attendance)
    .leftJoin(courses, eq(attendance.courseId, courses.id))
    .where(eq(attendance.studentId, childId))
    .orderBy(desc(attendance.date));

  const totalDays = records.length;
  const presentDays = records.filter(r => r.attendance.status === 'present').length;
  const absentDays = records.filter(r => r.attendance.status === 'absent').length;
  const tardyDays = records.filter(r => r.attendance.status === 'tardy').length;
  const excusedDays = records.filter(r => r.attendance.status === 'excused').length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

  return {
    totalDays,
    presentDays,
    absentDays,
    tardyDays,
    excusedDays,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    records: records.map(r => ({
      id: r.attendance.id,
      date: typeof r.attendance.date === 'string' ? r.attendance.date : (r.attendance.date as Date).toISOString().slice(0, 10),
      status: r.attendance.status,
      courseName: r.course?.title || 'Unknown',
      notes: r.attendance.notes
    }))
  };
}

/**
 * Get teachers of a student's courses
 */
export async function getStudentTeachers(studentId: string) {
  const teachersData = await db
    .select({
      teacher: users,
      course: courses
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(courses.teacherId, users.id))
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(users.role, 'teacher')
      )!
    );

  // Group by teacher
  const teachersMap = new Map();
  teachersData.forEach(item => {
    if (!item.teacher || !item.course) return;
    
    if (!teachersMap.has(item.teacher.id)) {
      teachersMap.set(item.teacher.id, {
        id: item.teacher.id,
        fullName: item.teacher.fullName,
        email: item.teacher.email,
        courses: []
      });
    }
    
    teachersMap.get(item.teacher.id).courses.push({
      id: item.course.id,
      title: item.course.title
    });
  });

  return Array.from(teachersMap.values());
}

/**
 * Get messages between parent and teacher with pagination
 */
export async function getParentTeacherMessages(
  parentId: string, 
  teacherId: string,
  options: { page?: number; limit?: number } = {}
) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  // Get or create conversation
  let [conversation] = await db
    .select()
    .from(parentTeacherConversations)
    .where(
      and(
        eq(parentTeacherConversations.parentId, parentId),
        eq(parentTeacherConversations.teacherId, teacherId)
      )!
    )
    .limit(1);

  if (!conversation) {
    // Create new conversation if doesn't exist
    const [newConv] = await db
      .insert(parentTeacherConversations)
      .values({
        id: createId(),
        parentId,
        teacherId
      })
      .returning();
    conversation = newConv;
  }

  // Get messages for this conversation
  const messagesData = await db
    .select({
      message: parentTeacherMessages,
      sender: users
    })
    .from(parentTeacherMessages)
    .leftJoin(users, eq(parentTeacherMessages.senderId, users.id))
    .where(
      and(
        eq(parentTeacherMessages.parentId, parentId),
        eq(parentTeacherMessages.teacherId, teacherId)
      )!
    )
    .orderBy(desc(parentTeacherMessages.createdAt))
    .limit(limit)
    .offset(offset);

  // Mark messages as read if viewer is the parent
  await db
    .update(parentTeacherMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(parentTeacherMessages.parentId, parentId),
        eq(parentTeacherMessages.teacherId, teacherId),
        eq(parentTeacherMessages.senderId, teacherId),
        eq(parentTeacherMessages.isRead, false)
      )!
    );

  // Reset unread count for parent
  await db
    .update(parentTeacherConversations)
    .set({ parentUnreadCount: '0' })
    .where(eq(parentTeacherConversations.id, conversation.id));

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(parentTeacherMessages)
    .where(
      and(
        eq(parentTeacherMessages.parentId, parentId),
        eq(parentTeacherMessages.teacherId, teacherId)
      )!
    );

  return {
    messages: messagesData.map(m => ({
      id: m.message.id,
      senderId: m.message.senderId,
      senderName: m.sender?.fullName || 'Unknown',
      content: m.message.content,
      isRead: m.message.isRead,
      attachmentUrl: m.message.attachmentUrl,
      attachmentName: m.message.attachmentName,
      createdAt: m.message.createdAt
    })).reverse(), // Reverse to show oldest first
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit)
    },
    conversationId: conversation.id
  };
}

/**
 * Send message from parent to teacher
 */
export async function sendParentTeacherMessage(parentId: string, teacherId: string, content: string, attachment?: { url: string; name: string; type: string }) {
  // Get or create conversation
  let [conversation] = await db
    .select()
    .from(parentTeacherConversations)
    .where(
      and(
        eq(parentTeacherConversations.parentId, parentId),
        eq(parentTeacherConversations.teacherId, teacherId)
      )!
    )
    .limit(1);

  if (!conversation) {
    const [newConv] = await db
      .insert(parentTeacherConversations)
      .values({
        id: createId(),
        parentId,
        teacherId
      })
      .returning();
    conversation = newConv;
  }

  // Insert message
  const [message] = await db
    .insert(parentTeacherMessages)
    .values({
      id: createId(),
      parentId,
      teacherId,
      senderId: parentId,
      content,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type
    })
    .returning();

  // Update conversation last message time and increment unread count for teacher
  await db
    .update(parentTeacherConversations)
    .set({
      lastMessageAt: new Date(),
      teacherUnreadCount: sql`CAST(${parentTeacherConversations.teacherUnreadCount} AS INTEGER) + 1`
    })
    .where(eq(parentTeacherConversations.id, conversation.id));

  // Get sender info
  const [sender] = await db
    .select()
    .from(users)
    .where(eq(users.id, parentId))
    .limit(1);

  return {
    id: message.id,
    senderId: message.senderId,
    senderName: sender?.fullName || 'Unknown',
    content: message.content,
    isRead: message.isRead,
    createdAt: message.createdAt
  };
}

/**
 * Unlink a child from parent
 */
export async function unlinkChild(parentId: string, childId: string) {
  await db
    .delete(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    );

  // Invalidate dashboard cache when child is unlinked
  invalidateDashboardCache(parentId);

  return { success: true };
}

/**
 * Get comprehensive dashboard overview for parent
 * Uses caching to reduce database load
 */
export async function getDashboardOverview(parentId: string, forceRefresh = false) {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCache(getCacheKey(parentId));
    if (cached) {
      return cached;
    }
  }

  // Get all children
  const children = await getParentChildren(parentId);

  // Get data for each child
  const childrenData = await Promise.all(
    children.map(async (child) => {
      // Get enrollments and courses
      const childEnrollments = await db
        .select({
          enrollment: enrollments,
          course: courses,
          teacher: users
        })
        .from(enrollments)
        .leftJoin(courses, eq(enrollments.courseId, courses.id))
        .leftJoin(users, eq(courses.teacherId, users.id))
        .where(eq(enrollments.studentId, child.id));

      // Get recent grades (last 10)
      const recentGradesData = await db
        .select({
          assignment: assignments,
          grade: grades,
          submission: submissions,
          course: courses
        })
        .from(grades)
        .leftJoin(submissions, eq(grades.submissionId, submissions.id))
        .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .leftJoin(courses, eq(assignments.courseId, courses.id))
        .where(eq(submissions.studentId, child.id))
        .orderBy(desc(grades.gradedAt))
        .limit(10);

      const recentGrades = recentGradesData.map(g => ({
        assignmentTitle: g.assignment?.title || 'Unknown',
        courseName: g.course?.title || 'Unknown',
        score: parseFloat(g.grade.score),
        maxScore: parseFloat(g.grade.maxScore || '100'),
        percentage: Math.round((parseFloat(g.grade.score) / parseFloat(g.grade.maxScore || '100')) * 100),
        gradedAt: g.grade.gradedAt
      }));

      // Get upcoming assignments (next 14 days)
      const fourteenDaysFromNow = new Date();
      fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);

      const upcomingAssignmentsData = await db
        .select({
          assignment: assignments,
          submission: submissions,
          course: courses
        })
        .from(assignments)
        .leftJoin(courses, eq(assignments.courseId, courses.id))
        .leftJoin(
          submissions,
          and(
            eq(submissions.assignmentId, assignments.id),
            eq(submissions.studentId, child.id)
          )!
        )
        .where(
          and(
            sql`${assignments.courseId} IN (SELECT ${enrollments.courseId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${child.id})`,
            eq(assignments.isPublished, true),
            gte(assignments.dueDate, new Date()),
            lte(assignments.dueDate, fourteenDaysFromNow)
          )!
        )
        .orderBy(assignments.dueDate)
        .limit(10);

      const upcomingAssignments = upcomingAssignmentsData.map(a => ({
        id: a.assignment.id,
        title: a.assignment.title,
        courseName: a.course?.title || 'Unknown',
        dueDate: a.assignment.dueDate,
        status: a.submission ? 'submitted' : 'pending',
        type: a.assignment.type
      }));

      // Calculate attendance rate
      const attendanceData = await getChildAttendance(parentId, child.id);

      // Calculate current GPA
      const allGradesData = await db
        .select({
          grade: grades,
          submission: submissions
        })
        .from(grades)
        .leftJoin(submissions, eq(grades.submissionId, submissions.id))
        .where(eq(submissions.studentId, child.id));

      let totalScore = 0;
      let totalMaxScore = 0;
      let progressPercentage = 0;
      
      if (allGradesData.length > 0) {
        totalScore = allGradesData.reduce((sum, g) => sum + parseFloat(g.grade.score), 0);
        totalMaxScore = allGradesData.reduce((sum, g) => sum + parseFloat(g.grade.maxScore || '100'), 0);
        progressPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
      }

      // Get streak info for child
      const [streakData] = await db
        .select()
        .from(studyStreaks)
        .where(eq(studyStreaks.userId, child.id))
        .limit(1);

      const currentStreak = streakData ? parseInt(streakData.currentStreak) : 0;
      const weeklyGoalHours = streakData ? parseFloat(streakData.weeklyGoalHours) : 10;
      const currentWeekHours = streakData ? parseFloat(streakData.currentWeekHours) : 0;

      // Get alerts for this child
      const alerts = [];
      
      // Alert: Low grade (below 70%)
      const recentLowGrades = recentGrades.filter(g => g.percentage < 70);
      if (recentLowGrades.length > 0) {
        alerts.push({
          type: 'grade_drop',
          severity: 'warning',
          message: `${recentLowGrades.length} recent assignment(s) below 70%`,
          childId: child.id
        });
      }

      // Alert: Low attendance (below 90%)
      if (attendanceData.attendanceRate < 90) {
        alerts.push({
          type: 'attendance',
          severity: 'warning',
          message: `Attendance rate is ${attendanceData.attendanceRate.toFixed(1)}%`,
          childId: child.id
        });
      }

      // Alert: Upcoming assignments (due in 2 days)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      const urgentAssignments = upcomingAssignments.filter(a => 
        a.status === 'pending' && a.dueDate && new Date(a.dueDate) <= twoDaysFromNow
      );
      if (urgentAssignments.length > 0) {
        alerts.push({
          type: 'assignment',
          severity: 'info',
          message: `${urgentAssignments.length} assignment(s) due in next 2 days`,
          childId: child.id
        });
      }

      return {
        id: child.id,
        name: child.fullName,
        username: child.username,
        email: child.email,
        stats: {
          progressPercentage,
          currentStreak,
          weeklyGoalHours,
          currentWeekHours,
          coursesEnrolled: childEnrollments.length,
          assignmentsDue: upcomingAssignments.filter(a => a.status === 'pending').length,
          totalScore: Math.round(totalScore * 10) / 10,
          totalMaxScore: Math.round(totalMaxScore)
        },
        recentGrades,
        upcomingAssignments,
        alerts
      };
    })
  );

  // Get recent activity across all children
  const recentActivity = [];
  for (const childData of childrenData) {
    // Add recent grades to activity
    childData.recentGrades.slice(0, 3).forEach(grade => {
      recentActivity.push({
        childId: childData.id,
        childName: childData.name,
        type: 'grade',
        message: `Received ${grade.percentage}% on ${grade.assignmentTitle}`,
        timestamp: grade.gradedAt,
        severity: grade.percentage >= 80 ? 'success' : grade.percentage >= 70 ? 'warning' : 'danger'
      });
    });
  }

  // Sort by timestamp and limit
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const result = {
    children: childrenData,
    recentActivity: recentActivity.slice(0, 10),
    summary: {
      totalChildren: children.length,
      totalAlerts: childrenData.reduce((sum, child) => sum + child.alerts.length, 0),
      averageProgress: childrenData.length > 0 
        ? Math.round(childrenData.reduce((sum, child) => sum + child.stats.progressPercentage, 0) / childrenData.length)
        : 0,
      totalCourses: childrenData.reduce((sum, child) => sum + child.stats.coursesEnrolled, 0),
      upcomingAssignments: childrenData.reduce((sum, child) => sum + child.stats.assignmentsDue, 0)
    }
  };

  // Cache the result
  setCache(getCacheKey(parentId), result);

  return result;
}

/**
 * Get assignments for a specific child with filtering and pagination
 */
export async function getChildAssignments(
  parentId: string,
  childId: string,
  options: {
    status?: 'all' | 'pending' | 'submitted' | 'graded' | 'late';
    days?: number;
    courseId?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  // Verify parent has access
  const link = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (link.length === 0) {
    throw new Error('Unauthorized access to child data');
  }

  const { status = 'all', days, courseId, page = 1, limit = 20 } = options;

  // Build query conditions
  let conditions = [
    sql`${assignments.courseId} IN (SELECT ${enrollments.courseId} FROM ${enrollments} WHERE ${enrollments.studentId} = ${childId})`,
    eq(assignments.isPublished, true)
  ];

  if (days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    conditions.push(lte(assignments.dueDate, futureDate));
  }

  if (courseId) {
    conditions.push(eq(assignments.courseId, courseId));
  }

  const assignmentsData = await db
    .select({
      assignment: assignments,
      submission: submissions,
      grade: grades,
      course: courses
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .leftJoin(
      submissions,
      and(
        eq(submissions.assignmentId, assignments.id),
        eq(submissions.studentId, childId)
      )!
    )
    .leftJoin(grades, eq(grades.submissionId, submissions.id))
    .where(and(...conditions)!)
    .orderBy(assignments.dueDate);

  // Map and filter by status
  let assignmentsList = assignmentsData.map(a => {
    const isLate = a.assignment.dueDate && new Date(a.assignment.dueDate) < new Date() && !a.submission;
    const assignmentStatus = isLate ? 'late' : !a.submission ? 'pending' : a.grade ? 'graded' : 'submitted';

    return {
      id: a.assignment.id,
      title: a.assignment.title,
      description: a.assignment.description,
      courseName: a.course?.title || 'Unknown',
      courseId: a.assignment.courseId,
      dueDate: a.assignment.dueDate,
      type: a.assignment.type,
      maxScore: parseFloat(a.assignment.maxScore || '100'),
      status: assignmentStatus,
      submittedAt: a.submission?.submittedAt,
      score: a.grade ? parseFloat(a.grade.score) : null,
      feedback: a.grade?.feedback,
      isLate
    };
  });

  // Filter by status if specified
  if (status !== 'all') {
    assignmentsList = assignmentsList.filter(a => a.status === status);
  }

  // Apply pagination
  const total = assignmentsList.length;
  const startIndex = (page - 1) * limit;
  const paginatedAssignments = assignmentsList.slice(startIndex, startIndex + limit);

  return {
    assignments: paginatedAssignments,
    summary: {
      total,
      pending: assignmentsList.filter(a => a.status === 'pending').length,
      submitted: assignmentsList.filter(a => a.status === 'submitted').length,
      graded: assignmentsList.filter(a => a.status === 'graded').length,
      late: assignmentsList.filter(a => a.isLate).length
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get analytics and performance trends for a child
 */
export async function getChildAnalytics(
  parentId: string,
  childId: string,
  options: {
    period?: 'week' | 'month' | 'semester' | 'year';
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  // Verify parent has access
  const link = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (link.length === 0) {
    throw new Error('Unauthorized access to child data');
  }

  const { period = 'month', startDate, endDate } = options;

  // Calculate date range based on period
  let dateFrom = startDate || new Date();
  let dateTo = endDate || new Date();

  if (!startDate) {
    switch (period) {
      case 'week':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'month':
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      case 'semester':
        dateFrom.setMonth(dateFrom.getMonth() - 6);
        break;
      case 'year':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
    }
  }

  // Get grades within date range
  const gradesData = await db
    .select({
      grade: grades,
      submission: submissions,
      assignment: assignments,
      course: courses
    })
    .from(grades)
    .leftJoin(submissions, eq(grades.submissionId, submissions.id))
    .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(
      and(
        eq(submissions.studentId, childId),
        gte(grades.gradedAt, dateFrom),
        lte(grades.gradedAt, dateTo)
      )!
    )
    .orderBy(grades.gradedAt);

  // Calculate grade trends over time
  const gradesTrend = gradesData.map(g => ({
    date: g.grade.gradedAt,
    percentage: Math.round((parseFloat(g.grade.score) / parseFloat(g.grade.maxScore || '100')) * 100),
    courseName: g.course?.title || 'Unknown',
    assignmentTitle: g.assignment?.title || 'Unknown'
  }));

  // Calculate subject performance
  const subjectPerformance = new Map();
  gradesData.forEach(g => {
    const courseName = g.course?.title || 'Unknown';
    if (!subjectPerformance.has(courseName)) {
      subjectPerformance.set(courseName, { scores: [], count: 0 });
    }
    const percentage = (parseFloat(g.grade.score) / parseFloat(g.grade.maxScore || '100')) * 100;
    subjectPerformance.get(courseName).scores.push(percentage);
    subjectPerformance.get(courseName).count++;
  });

  const subjectStats = Array.from(subjectPerformance.entries()).map(([subject, data]) => ({
    subject,
    avgGrade: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count * 10) / 10,
    assignments: data.count,
    trend: data.scores.length >= 2 
      ? (data.scores[data.scores.length - 1] > data.scores[0] ? 'improving' : 'declining')
      : 'stable'
  }));

  // Get attendance data
  const attendanceData = await db
    .select({
      attendance: attendance,
      course: courses
    })
    .from(attendance)
    .leftJoin(courses, eq(attendance.courseId, courses.id))
    .where(
      and(
        eq(attendance.studentId, childId),
        gte(attendance.date, dateFrom.toISOString().split('T')[0]),
        lte(attendance.date, dateTo.toISOString().split('T')[0])
      )!
    )
    .orderBy(attendance.date);

  // Calculate attendance by month
  const attendanceByMonth = new Map();
  attendanceData.forEach(a => {
    const month = a.attendance.date.substring(0, 7); // YYYY-MM
    if (!attendanceByMonth.has(month)) {
      attendanceByMonth.set(month, { total: 0, present: 0 });
    }
    attendanceByMonth.get(month).total++;
    if (a.attendance.status === 'present') {
      attendanceByMonth.get(month).present++;
    }
  });

  const attendanceTrend = Array.from(attendanceByMonth.entries()).map(([month, data]) => ({
    month,
    percentage: Math.round((data.present / data.total) * 100 * 10) / 10
  }));

  // Generate insights
  const insights = [];

  // Overall performance insight
  const overallAvg = subjectStats.reduce((sum, s) => sum + s.avgGrade, 0) / (subjectStats.length || 1);
  if (overallAvg >= 90) {
    insights.push({
      type: 'success',
      message: `Excellent performance! Maintaining ${overallAvg.toFixed(1)}% average across all subjects.`,
      severity: 'info'
    });
  } else if (overallAvg < 70) {
    insights.push({
      type: 'warning',
      message: `Average performance is ${overallAvg.toFixed(1)}%. Consider additional support in struggling subjects.`,
      severity: 'warning'
    });
  }

  // Subject-specific insights
  const strugglingSubjects = subjectStats.filter(s => s.avgGrade < 70);
  if (strugglingSubjects.length > 0) {
    insights.push({
      type: 'warning',
      message: `Needs improvement in: ${strugglingSubjects.map(s => s.subject).join(', ')}`,
      severity: 'warning'
    });
  }

  const excellingSubjects = subjectStats.filter(s => s.avgGrade >= 90);
  if (excellingSubjects.length > 0) {
    insights.push({
      type: 'success',
      message: `Excelling in: ${excellingSubjects.map(s => s.subject).join(', ')}`,
      severity: 'info'
    });
  }

  // Attendance insight
  const avgAttendance = attendanceTrend.reduce((sum, a) => sum + a.percentage, 0) / (attendanceTrend.length || 1);
  if (avgAttendance < 85) {
    insights.push({
      type: 'attendance',
      message: `Attendance rate of ${avgAttendance.toFixed(1)}% is below recommended 90%. This may impact academic performance.`,
      severity: 'warning'
    });
  }

  return {
    gradesTrend,
    subjectPerformance: subjectStats,
    attendanceTrend,
    insights,
    summary: {
      averageGrade: Math.round(overallAvg * 10) / 10,
      totalAssignments: gradesData.length,
      attendanceRate: Math.round(avgAttendance * 10) / 10,
      period
    }
  };
}

/**
 * Get child's enrolled courses with progress
 */
export async function getChildCourses(parentId: string, childId: string) {
  // Verify parent has access to this child
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (!link) {
    throw new Error('Access denied: Child not linked to parent');
  }

  // Get all enrollments with course details
  const enrolledCourses = await db
    .select({
      enrollment: enrollments,
      course: courses,
      teacher: users
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(users, eq(courses.teacherId, users.id))
    .where(eq(enrollments.studentId, childId));

  // Get progress for each course
  const coursesWithProgress = await Promise.all(
    enrolledCourses.map(async (item) => {
      if (!item.course) return null;

      // Get total lessons for the course
      const courseLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.courseId, item.course.id));

      // Get completed assignments (submitted + graded)
      const courseAssignments = await db
        .select({
          assignment: assignments,
          submission: submissions
        })
        .from(assignments)
        .leftJoin(
          submissions,
          and(
            eq(submissions.assignmentId, assignments.id),
            eq(submissions.studentId, childId)
          )!
        )
        .where(eq(assignments.courseId, item.course.id));

      const totalAssignments = courseAssignments.length;
      const completedAssignments = courseAssignments.filter(a => a.submission).length;

      // Calculate course grade
      const gradedAssignments = await db
        .select({
          grade: grades,
          submission: submissions,
          assignment: assignments
        })
        .from(grades)
        .leftJoin(submissions, eq(grades.submissionId, submissions.id))
        .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .where(
          and(
            eq(submissions.studentId, childId),
            eq(assignments.courseId, item.course.id)
          )!
        );

      let courseGrade = 'N/A';
      if (gradedAssignments.length > 0) {
        const avgScore = gradedAssignments.reduce((sum, g) => {
          const score = parseFloat(g.grade.score);
          const maxScore = parseFloat(g.grade.maxScore || '100');
          return sum + (score / maxScore * 100);
        }, 0) / gradedAssignments.length;

        if (avgScore >= 90) courseGrade = 'A';
        else if (avgScore >= 80) courseGrade = 'B+';
        else if (avgScore >= 70) courseGrade = 'B';
        else if (avgScore >= 60) courseGrade = 'C';
        else courseGrade = 'D';
      }

      // Calculate overall progress percentage
      const progressPercentage = totalAssignments > 0 
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0;

      return {
        id: item.course.id,
        title: item.course.title,
        description: item.course.description,
        teacher: {
          id: item.teacher?.id,
          name: item.teacher?.fullName,
          email: item.teacher?.email
        },
        enrolledAt: item.enrollment.enrolledAt,
        progress: {
          percentage: progressPercentage,
          completedAssignments,
          totalAssignments,
          totalLessons: courseLessons.length
        },
        currentGrade: courseGrade,
        isPublished: item.course.isPublished
      };
    })
  );

  return coursesWithProgress.filter(c => c !== null);
}

/**
 * Get child's lesson completion status for a course
 */
export async function getChildLessonCompletion(
  parentId: string, 
  childId: string, 
  courseId: string
) {
  // Verify parent has access to this child
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (!link) {
    throw new Error('Access denied: Child not linked to parent');
  }

  // Get all lessons for the course
  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(lessons.order);

  // For each lesson, check if there are completed assignments
  const lessonsWithCompletion = await Promise.all(
    courseLessons.map(async (lesson) => {
      const lessonAssignments = await db
        .select({
          assignment: assignments,
          submission: submissions
        })
        .from(assignments)
        .leftJoin(
          submissions,
          and(
            eq(submissions.assignmentId, assignments.id),
            eq(submissions.studentId, childId)
          )!
        )
        .where(eq(assignments.lessonId, lesson.id));

      const totalAssignments = lessonAssignments.length;
      const completedAssignments = lessonAssignments.filter(a => a.submission).length;
      const isCompleted = totalAssignments > 0 && completedAssignments === totalAssignments;

      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        fileType: lesson.fileType,
        createdAt: lesson.createdAt,
        isCompleted,
        assignmentsCompleted: completedAssignments,
        totalAssignments
      };
    })
  );

  return {
    courseId,
    lessons: lessonsWithCompletion,
    summary: {
      totalLessons: courseLessons.length,
      completedLessons: lessonsWithCompletion.filter(l => l.isCompleted).length,
      completionRate: courseLessons.length > 0 
        ? Math.round((lessonsWithCompletion.filter(l => l.isCompleted).length / courseLessons.length) * 100)
        : 0
    }
  };
}

/**
 * Get child's overall progress report
 */
export async function getChildProgressReport(parentId: string, childId: string) {
  // Verify parent has access to this child
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (!link) {
    throw new Error('Access denied: Child not linked to parent');
  }

  // Get child info
  const [child] = await db
    .select()
    .from(users)
    .where(eq(users.id, childId))
    .limit(1);

  // Get all courses and progress
  const courses = await getChildCourses(parentId, childId);

  // Get overall grade average
  const gradedCourses = courses.filter(c => c.currentGrade !== 'N/A');
  const gradePoints: { [key: string]: number } = { 'A': 4.0, 'B+': 3.5, 'B': 3.0, 'C': 2.0, 'D': 1.0 };
  const gpa = gradedCourses.length > 0
    ? gradedCourses.reduce((sum, c) => sum + (gradePoints[c.currentGrade] || 0), 0) / gradedCourses.length
    : 0;

  // Get attendance summary
  const attendanceRecords = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, childId));

  const totalAttendance = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  // Get recent activity
  const recentSubmissions = await db
    .select({
      submission: submissions,
      assignment: assignments
    })
    .from(submissions)
    .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(eq(submissions.studentId, childId))
    .orderBy(desc(submissions.submittedAt))
    .limit(10);

  return {
    student: {
      id: child.id,
      name: child.fullName,
      email: child.email
    },
    overview: {
      gpa: Math.round(gpa * 100) / 100,
      totalCourses: courses.length,
      attendanceRate,
      averageProgress: courses.length > 0
        ? Math.round(courses.reduce((sum, c) => sum + c.progress.percentage, 0) / courses.length)
        : 0
    },
    courses: courses.map(c => ({
      title: c.title,
      teacher: c.teacher.name,
      grade: c.currentGrade,
      progress: c.progress.percentage,
      completedAssignments: c.progress.completedAssignments,
      totalAssignments: c.progress.totalAssignments
    })),
    recentActivity: recentSubmissions.map(r => ({
      type: 'submission',
      title: r.assignment?.title,
      date: r.submission.submittedAt
    }))
  };
}

/**
 * Get child's report cards
 */
export async function getChildReportCards(parentId: string, childId: string) {
  // Verify parent has access to this child
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (!link) {
    throw new Error('Access denied: Child not linked to parent');
  }

  const reports = await db
    .select({
      report: reportCards,
      uploadedBy: users
    })
    .from(reportCards)
    .leftJoin(users, eq(reportCards.uploadedBy, users.id))
    .where(eq(reportCards.studentId, childId))
    .orderBy(desc(reportCards.uploadedAt));

  return reports.map(r => ({
    id: r.report.id,
    period: r.report.period,
    academicYear: r.report.academicYear,
    fileName: r.report.fileName,
    filePath: r.report.filePath,
    fileSize: r.report.fileSize,
    uploadedBy: r.uploadedBy?.fullName,
    uploadedAt: r.report.uploadedAt
  }));
}

/**
 * Get child's calendar events
 */
export async function getChildCalendarEvents(
  parentId: string,
  childId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
) {
  // Verify parent has access to this child
  const [link] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )!
    )
    .limit(1);

  if (!link) {
    throw new Error('Access denied: Child not linked to parent');
  }

  // Get child's enrolled courses
  const childEnrollments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.studentId, childId));

  const courseIds = childEnrollments.map(e => e.courseId);

  // Get events for those courses
  let query = db
    .select({
      event: events,
      course: courses,
      creator: users
    })
    .from(events)
    .leftJoin(courses, eq(events.courseId, courses.id))
    .leftJoin(users, eq(events.createdBy, users.id));

  // Filter by course IDs or student participation
  const childEvents = await query;

  // Filter events related to child's courses or where child is a participant
  const relevantEvents = await Promise.all(
    childEvents.map(async (item) => {
      // Check if event is for one of child's courses
      const isCoursEvent = item.event.courseId && courseIds.includes(item.event.courseId);

      // Check if child is a participant
      const participation = await db
        .select()
        .from(eventParticipants)
        .where(
          and(
            eq(eventParticipants.eventId, item.event.id),
            eq(eventParticipants.userId, childId)
          )!
        )
        .limit(1);

      if (!isCoursEvent && participation.length === 0) {
        return null;
      }

      return {
        id: item.event.id,
        title: item.event.title,
        description: item.event.description,
        eventType: item.event.eventType,
        startTime: item.event.startTime,
        endTime: item.event.endTime,
        location: item.event.location,
        isAllDay: item.event.isAllDay,
        course: item.course ? {
          id: item.course.id,
          title: item.course.title
        } : null,
        createdBy: item.creator?.fullName,
        color: item.event.color
      };
    })
  );

  return relevantEvents.filter(e => e !== null);
}

