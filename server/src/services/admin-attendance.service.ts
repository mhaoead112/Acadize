/**
 * admin-attendance.service.ts
 * Admin attendance analytics: overview, at-risk list, daily trend, by course, heatmap.
 * Uses attendance-report.service getAttendanceSummary and schema sessions/attendanceRecords/courses/users.
 */

import ExcelJS from 'exceljs';
import { db } from '../db/index.js';
import {
  attendanceRecords,
  sessions,
  courses,
  users,
  enrollments,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getAttendanceSummary, SummaryParams, exportToExcel, ExportParams } from './attendance-report.service.js';

export interface AdminOverviewParams {
  organizationId: string;
  dateFrom?: Date;
  dateTo?: Date;
  courseId?: string;
  teacherId?: string;
  grade?: string;
}

export interface AdminOverviewResult {
  orgAttendancePercent: number;
  orgAttendanceTrend: number; // e.g. -1.2 for "down 1.2%"
  totalSessions: number;
  totalSessionsTrend: number;
  studentsAtRisk: number;
  studentsAtRiskTrend: number;
  mostMissedCourse: string | null;
  dailyTrend: { date: string; attendancePercent: number; total: number; attended: number }[];
  byCourse: { courseId: string; courseTitle: string; attendancePercent: number; total: number; attended: number }[];
  statusBreakdown: { present: number; absent: number; late: number };
  heatmap: { dayOfWeek: number; hour: number; intensity: number }[];
}

export interface AdminAtRiskParams {
  organizationId: string;
  threshold?: number;
  dateFrom?: Date;
  dateTo?: Date;
  courseId?: string;
  teacherId?: string;
  grade?: string;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  grade: string | null;
  courseId: string;
  courseTitle: string;
  attendancePercent: number;
  totalSessions: number;
  missedSessions: number;
}

function pct(num: number, den: number): number {
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

/**
 * GET /api/attendance/admin/overview
 */
export async function getAdminOverview(params: AdminOverviewParams): Promise<AdminOverviewResult> {
  const { organizationId, dateFrom, dateTo, courseId, teacherId, grade } = params;

  const summaryParams: SummaryParams = { organizationId, courseId, dateFrom, dateTo };
  const summaries = await getAttendanceSummary(summaryParams);

  // Optional filter by teacher (course.teacherId)
  let filtered = summaries;
  if (teacherId) {
    const courseIdsByTeacher = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.organizationId, organizationId), eq(courses.teacherId, teacherId)));
    const ids = new Set(courseIdsByTeacher.map((c) => c.id));
    filtered = summaries.filter((s) => ids.has(s.courseId));
  }

  // Optional filter by student grade (users.grade)
  if (grade) {
    const userIdsWithGrade = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.grade, grade)));
    const idSet = new Set(userIdsWithGrade.map((u) => u.id));
    filtered = filtered.filter((s) => idSet.has(s.studentId));
  }

  const totalAttended = filtered.reduce((a, s) => a + s.attended, 0);
  const totalSessionsSum = filtered.reduce((a, s) => a + s.totalSessions, 0);
  const orgAttendancePercent = pct(totalAttended, totalSessionsSum);

  const totalSessionsCount = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.organizationId, organizationId),
        ...(courseId ? [eq(sessions.courseId, courseId)] : []),
        ...(dateFrom ? [gte(sessions.startTime, dateFrom)] : []),
        ...(dateTo ? [lte(sessions.startTime, dateTo)] : [])
      )
    );
  const totalSessions = totalSessionsCount.length;

  const atRiskSet = new Set<string>();
  filtered.forEach((s) => {
    if (s.attendancePercent < 75) atRiskSet.add(s.studentId);
  });
  const studentsAtRisk = atRiskSet.size;

  const byCourseMap = new Map<string, { total: number; attended: number; title: string }>();
  filtered.forEach((s) => {
    if (!byCourseMap.has(s.courseId)) {
      byCourseMap.set(s.courseId, { total: 0, attended: 0, title: s.courseTitle });
    }
    const c = byCourseMap.get(s.courseId)!;
    c.total += s.totalSessions;
    c.attended += s.attended;
  });
  const byCourse = Array.from(byCourseMap.entries())
    .map(([courseId, v]) => ({
      courseId,
      courseTitle: v.title,
      attendancePercent: pct(v.attended, v.total),
      total: v.total,
      attended: v.attended,
    }))
    .sort((a, b) => a.attendancePercent - b.attendancePercent);
  const mostMissedCourse = byCourse.length > 0 ? byCourse[0].courseTitle : null;

  const presentTotal = filtered.reduce((a, s) => a + s.attended - s.late, 0);
  const lateTotal = filtered.reduce((a, s) => a + s.late, 0);
  const absentTotal = filtered.reduce((a, s) => a + s.absent, 0);
  const statusDen = presentTotal + lateTotal + absentTotal;
  const statusBreakdown = {
    present: statusDen ? Math.round((presentTotal / statusDen) * 100) : 0,
    late: statusDen ? Math.round((lateTotal / statusDen) * 100) : 0,
    absent: statusDen ? Math.round((absentTotal / statusDen) * 100) : 0,
  };

  const conditions = [eq(sessions.organizationId, organizationId)];
  if (courseId) conditions.push(eq(sessions.courseId, courseId));
  if (dateFrom) conditions.push(gte(sessions.startTime, dateFrom));
  if (dateTo) conditions.push(lte(sessions.startTime, dateTo));

  const rawDaily = await db
    .select({
      sessionStart: sessions.startTime,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
    .where(and(...conditions));

  const dayMap = new Map<string, { total: number; attended: number }>();
  rawDaily.forEach((r) => {
    const d = (r.sessionStart instanceof Date ? r.sessionStart : new Date(r.sessionStart as string))
      .toISOString()
      .slice(0, 10);
    if (!dayMap.has(d)) dayMap.set(d, { total: 0, attended: 0 });
    const row = dayMap.get(d)!;
    row.total += 1;
    if (r.status === 'present' || r.status === 'late') row.attended += 1;
  });
  const dailyTrend = Array.from(dayMap.entries())
    .map(([date, v]) => ({
      date,
      attendancePercent: pct(v.attended, v.total),
      total: v.total,
      attended: v.attended,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const heatmapRows = await db
    .select({
      startTime: sessions.startTime,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
    .where(and(...conditions));

  const heatmapCell = new Map<string, number>();
  heatmapRows.forEach((r) => {
    const d = r.startTime instanceof Date ? r.startTime : new Date(r.startTime as string);
    const dow = d.getDay();
    const hour = d.getHours();
    const key = `${dow}-${hour}`;
    heatmapCell.set(key, (heatmapCell.get(key) || 0) + (r.status === 'present' || r.status === 'late' ? 1 : 0));
  });
  const maxVal = Math.max(1, ...Array.from(heatmapCell.values()));
  const heatmap = Array.from(heatmapCell.entries()).map(([k, v]) => {
    const [dow, hour] = k.split('-').map(Number);
    return { dayOfWeek: dow, hour, intensity: maxVal ? v / maxVal : 0 };
  });

  return {
    orgAttendancePercent,
    orgAttendanceTrend: 0,
    totalSessions,
    totalSessionsTrend: 0,
    studentsAtRisk,
    studentsAtRiskTrend: 0,
    mostMissedCourse,
    dailyTrend,
    byCourse,
    statusBreakdown,
    heatmap,
  };
}

/**
 * GET /api/attendance/admin/at-risk
 */
export async function getAdminAtRisk(params: AdminAtRiskParams): Promise<AtRiskStudent[]> {
  const { organizationId, threshold = 75, dateFrom, dateTo, courseId, teacherId, grade } = params;

  const summaryParams: SummaryParams = { organizationId, courseId, dateFrom, dateTo };
  const summaries = await getAttendanceSummary(summaryParams);

  let filtered = summaries.filter((s) => s.attendancePercent < threshold);
  if (teacherId) {
    const courseIdsByTeacher = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.organizationId, organizationId), eq(courses.teacherId, teacherId)));
    const ids = new Set(courseIdsByTeacher.map((c) => c.id));
    filtered = filtered.filter((s) => ids.has(s.courseId));
  }
  if (grade) {
    const userIdsWithGrade = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.grade, grade)));
    const idSet = new Set(userIdsWithGrade.map((u) => u.id));
    filtered = filtered.filter((s) => idSet.has(s.studentId));
  }

  const studentGrades = await db
    .select({ id: users.id, grade: users.grade })
    .from(users)
    .where(eq(users.organizationId, organizationId));
  const gradeMap = new Map(studentGrades.map((u) => [u.id, u.grade]));

  const list: AtRiskStudent[] = filtered.map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    grade: gradeMap.get(s.studentId) ?? null,
    courseId: s.courseId,
    courseTitle: s.courseTitle,
    attendancePercent: s.attendancePercent,
    totalSessions: s.totalSessions,
    missedSessions: s.totalSessions - s.attended,
  }));

  return list.sort((a, b) => a.attendancePercent - b.attendancePercent);
}

/** At-risk aggregated to one row per student (worst % and total missed). */
export interface AtRiskStudentRow {
  studentId: string;
  studentName: string;
  grade: string | null;
  attendancePercent: number;
  missedSessions: number;
  worstCourseTitle: string;
}

export async function getAdminAtRiskAggregated(params: AdminAtRiskParams): Promise<AtRiskStudentRow[]> {
  const rows = await getAdminAtRisk(params);
  const byStudent = new Map<string, AtRiskStudentRow>();
  rows.forEach((r) => {
    const existing = byStudent.get(r.studentId);
    if (!existing || r.attendancePercent < existing.attendancePercent) {
      byStudent.set(r.studentId, {
        studentId: r.studentId,
        studentName: r.studentName,
        grade: r.grade,
        attendancePercent: r.attendancePercent,
        missedSessions: r.missedSessions,
        worstCourseTitle: r.courseTitle,
      });
    } else {
      existing.missedSessions += r.missedSessions;
    }
  });
  return Array.from(byStudent.values()).sort((a, b) => a.attendancePercent - b.attendancePercent);
}

/**
 * Export full report (reuses attendance-report.service).
 */
export async function exportAdminFullReport(params: ExportParams): Promise<Buffer> {
  return exportToExcel(params);
}

/**
 * Export at-risk students only to Excel buffer.
 */
export async function exportAtRiskToExcel(params: AdminAtRiskParams): Promise<Buffer> {
  const rows = await getAdminAtRiskAggregated(params);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('At-Risk Students', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Student', key: 'studentName', width: 22 },
    { header: 'Grade', key: 'grade', width: 12 },
    { header: 'Attendance %', key: 'attendancePercent', width: 14 },
    { header: 'Missed Sessions', key: 'missedSessions', width: 16 },
    { header: 'Worst Course', key: 'worstCourseTitle', width: 22 },
  ];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  rows.forEach((r) => sheet.addRow({ studentName: r.studentName, grade: r.grade ?? '', attendancePercent: r.attendancePercent, missedSessions: r.missedSessions, worstCourseTitle: r.worstCourseTitle }));
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
