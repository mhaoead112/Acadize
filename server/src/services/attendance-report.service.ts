/**
 * attendance-report.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Attendance reporting and export for the teacher dashboard.
 *
 * Exports
 * ───────
 *  getAttendanceSummary(params)  – per-student roll-up across sessions
 *  getSessionReport(sessionId)   – full roster for a single session
 *  exportToExcel(params)         – styled .xlsx buffer for download
 *  exportToPdf(params)           – placeholder (returns 501 guidance)
 *
 * Schema notes
 * ────────────
 *  users.fullName        – single column (no firstName/lastName)
 *  attendanceRecords     – joinTime, leaveTime, durationMinutes, attendancePercent,
 *                          status, checkInMethod, gpsValid
 *  sessions              – organizationId, courseId, startTime, endTime, title
 *  courses               – title, teacherId
 *  enrollments           – studentId, courseId   (for "expected" count)
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
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SummaryParams {
    organizationId: string;
    courseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    studentId?: string;
}

export interface StudentSummary {
    studentId: string;
    studentName: string;
    courseId: string;
    courseTitle: string;
    totalSessions: number;
    attended: number;   // present + late
    absent: number;
    late: number;
    attendancePercent: number;   // 0-100, rounded to 1 dp
}

export interface SessionReportRow {
    studentId: string;
    studentName: string;
    checkInTime: Date | null;
    checkOutTime: Date | null;
    durationMinutes: number | null;
    attendancePercent: number | null;
    status: string;
    method: string;
    gpsValid: boolean | null;
}

export interface SessionReport {
    session: {
        id: string;
        title: string;
        courseId: string;
        courseName: string;
        startTime: Date;
        endTime: Date;
        sessionType: string;
    };
    summary: {
        total: number;
        present: number;
        late: number;
        absent: number;
        excused: number;
    };
    records: SessionReportRow[];
}

export interface ExportParams {
    organizationId: string;
    courseId?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
    const entry = { ts: new Date().toISOString(), level, ctx: 'attendance-report.service', msg, ...meta };
    if (level === 'error') { console.error('[att-report]', JSON.stringify(entry)); return; }
    if (level === 'warn') { console.warn('[att-report]', JSON.stringify(entry)); return; }
    console.info('[att-report]', JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10; // 1 dp
}

function fmtDuration(mins: number | null): string {
    if (mins === null) return '-';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtDatetime(d: Date | null | undefined): string {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-EG', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getAttendanceSummary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a per-student, per-course attendance summary.
 * Groups across all sessions that match the filter criteria.
 *
 * attendancePercent = (present + late) / totalSessions × 100
 */
export async function getAttendanceSummary(params: SummaryParams): Promise<StudentSummary[]> {
    const { organizationId, courseId, dateFrom, dateTo, studentId } = params;

    log('info', 'getAttendanceSummary', { organizationId, courseId, dateFrom, dateTo, studentId });

    // Build WHERE conditions for the joined query
    const conditions = [eq(sessions.organizationId, organizationId)];

    if (courseId) conditions.push(eq(sessions.courseId, courseId));
    if (dateFrom) conditions.push(gte(sessions.startTime, dateFrom));
    if (dateTo) conditions.push(lte(sessions.startTime, dateTo));
    if (studentId) conditions.push(eq(attendanceRecords.userId, studentId));

    // Pull all matching records with student + course info
    const rows = await db
        .select({
            studentId: attendanceRecords.userId,
            studentName: users.fullName,
            courseId: sessions.courseId,
            courseTitle: courses.title,
            status: attendanceRecords.status,
        })
        .from(attendanceRecords)
        .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .innerJoin(users, eq(attendanceRecords.userId, users.id))
        .where(and(...conditions))
        .orderBy(users.fullName, courses.title);

    // Aggregate in-process (avoids complex GROUP BY with multiple status values)
    // Key: "studentId|courseId"
    const map = new Map<string, StudentSummary>();

    for (const row of rows) {
        const key = `${row.studentId}|${row.courseId}`;
        if (!map.has(key)) {
            map.set(key, {
                studentId: row.studentId,
                studentName: row.studentName,
                courseId: row.courseId,
                courseTitle: row.courseTitle,
                totalSessions: 0,
                attended: 0,
                absent: 0,
                late: 0,
                attendancePercent: 0,
            });
        }
        const entry = map.get(key)!;
        entry.totalSessions += 1;
        if (row.status === 'present') { entry.attended += 1; }
        else if (row.status === 'late') { entry.attended += 1; entry.late += 1; }
        else if (row.status === 'absent') { entry.absent += 1; }
        // 'excused' counts neither attended nor absent
    }

    // Compute final percent after aggregation
    const summaries = Array.from(map.values()).map(s => ({
        ...s,
        attendancePercent: pct(s.attended, s.totalSessions),
    }));

    log('info', 'getAttendanceSummary done', { rows: summaries.length });
    return summaries;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getSessionReport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a full attendance roster for a single session,
 * including students who are enrolled but missed the session (absent).
 */
export async function getSessionReport(sessionId: string): Promise<SessionReport> {
    log('info', 'getSessionReport', { sessionId });

    // Load session + course info
    const [sessionRow] = await db
        .select({
            id: sessions.id,
            title: sessions.title,
            courseId: sessions.courseId,
            courseTitle: courses.title,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            sessionType: sessions.sessionType,
        })
        .from(sessions)
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!sessionRow) {
        throw Object.assign(new Error('Session not found'), { statusCode: 404 });
    }

    // Load all attendance records for this session
    const records = await db
        .select({
            studentId: attendanceRecords.userId,
            studentName: users.fullName,
            checkInTime: attendanceRecords.joinTime,
            checkOutTime: attendanceRecords.leaveTime,
            durationMinutes: attendanceRecords.durationMinutes,
            attendancePercent: attendanceRecords.attendancePercent,
            status: attendanceRecords.status,
            method: attendanceRecords.checkInMethod,
            gpsValid: attendanceRecords.gpsValid,
        })
        .from(attendanceRecords)
        .innerJoin(users, eq(attendanceRecords.userId, users.id))
        .where(eq(attendanceRecords.sessionId, sessionId))
        .orderBy(attendanceRecords.joinTime);

    // Summary counts
    const summary = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        late: records.filter(r => r.status === 'late').length,
        absent: records.filter(r => r.status === 'absent').length,
        excused: records.filter(r => r.status === 'excused').length,
    };

    log('info', 'getSessionReport done', { sessionId, total: summary.total });

    return {
        session: {
            id: sessionRow.id,
            title: sessionRow.title,
            courseId: sessionRow.courseId,
            courseName: sessionRow.courseTitle,
            startTime: sessionRow.startTime,
            endTime: sessionRow.endTime,
            sessionType: sessionRow.sessionType,
        },
        summary,
        records: records.map(r => ({
            studentId: r.studentId,
            studentName: r.studentName,
            checkInTime: r.checkInTime,
            checkOutTime: r.checkOutTime ?? null,
            durationMinutes: r.durationMinutes ?? null,
            attendancePercent: r.attendancePercent ?? null,
            status: r.status,
            method: r.method,
            gpsValid: r.gpsValid ?? null,
        })),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. exportToExcel
// ─────────────────────────────────────────────────────────────────────────────

/** Shared header style: bold + light blue bg */
const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFB8CCE4' }, // Light blue (Excel "Accent 1 - 60%")
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FF1F3864' } };
const HEADER_BORDER: Partial<ExcelJS.Borders> = {
    bottom: { style: 'medium', color: { argb: 'FF2F75B6' } },
};

function styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell(cell => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.border = HEADER_BORDER;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    });
    row.height = 20;
    row.commit();
}

function autoFitColumns(sheet: ExcelJS.Worksheet): void {
    sheet.columns.forEach(col => {
        if (!col.values) return;
        let maxLen = 10;
        col.values.forEach(v => {
            if (v == null) return;
            const len = String(v).length;
            if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(maxLen + 2, 50); // cap at 50 chars
    });
}

/**
 * Builds and returns an .xlsx buffer.
 *
 * Sheet 1 — "Summary": one row per student×course
 * Sheet 2 — "Detail":  one row per attendance record
 */
export async function exportToExcel(params: ExportParams): Promise<Buffer> {
    const { organizationId, courseId, dateFrom, dateTo } = params;

    log('info', 'exportToExcel start', { organizationId, courseId, dateFrom, dateTo });

    // ── Fetch data ─────────────────────────────────────────────────────────
    const summaryParams: SummaryParams = { organizationId, courseId, dateFrom, dateTo };
    const summaries = await getAttendanceSummary(summaryParams);

    // Fetch all detail records for the date range (for Sheet 2)
    const conditions = [eq(sessions.organizationId, organizationId)];
    if (courseId) conditions.push(eq(sessions.courseId, courseId));
    if (dateFrom) conditions.push(gte(sessions.startTime, dateFrom));
    if (dateTo) conditions.push(lte(sessions.startTime, dateTo));

    const detailRows = await db
        .select({
            studentName: users.fullName,
            courseTitle: courses.title,
            sessionTitle: sessions.title,
            sessionDate: sessions.startTime,
            sessionEnd: sessions.endTime,
            status: attendanceRecords.status,
            checkInTime: attendanceRecords.joinTime,
            checkOutTime: attendanceRecords.leaveTime,
            durationMinutes: attendanceRecords.durationMinutes,
            attendancePercent: attendanceRecords.attendancePercent,
            method: attendanceRecords.checkInMethod,
            gpsValid: attendanceRecords.gpsValid,
        })
        .from(attendanceRecords)
        .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .innerJoin(users, eq(attendanceRecords.userId, users.id))
        .where(and(...conditions))
        .orderBy(courses.title, sessions.startTime, users.fullName);

    // ── Build workbook ─────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Acadize LMS';
    wb.created = new Date();
    wb.modified = new Date();

    // ── Sheet 1: Summary ───────────────────────────────────────────────────
    const summarySheet = wb.addWorksheet('Summary', {
        views: [{ state: 'frozen', ySplit: 1 }],
        properties: { tabColor: { argb: 'FF2F75B6' } },
    });

    summarySheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 28 },
        { header: 'Course', key: 'courseTitle', width: 30 },
        { header: 'Total Sessions', key: 'totalSessions', width: 15 },
        { header: 'Attended', key: 'attended', width: 12 },
        { header: 'Absent', key: 'absent', width: 12 },
        { header: 'Late', key: 'late', width: 10 },
        { header: 'Attendance %', key: 'attendancePercent', width: 14 },
    ];

    styleHeaderRow(summarySheet.getRow(1));
    summarySheet.autoFilter = 'A1:G1';

    for (const s of summaries) {
        const row = summarySheet.addRow({
            studentName: s.studentName,
            courseTitle: s.courseTitle,
            totalSessions: s.totalSessions,
            attended: s.attended,
            absent: s.absent,
            late: s.late,
            attendancePercent: s.attendancePercent,
        });

        // Colour-code attendance % cell
        const pctCell = row.getCell('attendancePercent');
        pctCell.numFmt = '0.0"%"';
        if (s.attendancePercent >= 75) {
            pctCell.font = { color: { argb: 'FF375623' } }; // dark green
        } else if (s.attendancePercent >= 50) {
            pctCell.font = { color: { argb: 'FF7F6000' } }; // amber
        } else {
            pctCell.font = { color: { argb: 'FF9C0006' } }; // red
        }
        row.commit();
    }

    autoFitColumns(summarySheet);

    // ── Sheet 2: Detail ────────────────────────────────────────────────────
    const detailSheet = wb.addWorksheet('Detail', {
        views: [{ state: 'frozen', ySplit: 1 }],
        properties: { tabColor: { argb: 'FF548235' } },
    });

    detailSheet.columns = [
        { header: 'Student Name', key: 'studentName', width: 28 },
        { header: 'Course', key: 'courseTitle', width: 30 },
        { header: 'Session', key: 'sessionTitle', width: 30 },
        { header: 'Session Date', key: 'sessionDate', width: 18 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Check-In Time', key: 'checkInTime', width: 18 },
        { header: 'Check-Out Time', key: 'checkOutTime', width: 18 },
        { header: 'Duration', key: 'duration', width: 12 },
        { header: 'Attendance %', key: 'attendancePercent', width: 14 },
        { header: 'Method', key: 'method', width: 12 },
        { header: 'GPS Valid', key: 'gpsValid', width: 10 },
    ];

    styleHeaderRow(detailSheet.getRow(1));
    detailSheet.autoFilter = 'A1:K1';

    // Status colours for detail rows
    const STATUS_COLORS: Record<string, string> = {
        present: 'FF375623',
        late: 'FF7F6000',
        absent: 'FF9C0006',
        excused: 'FF1F3864',
    };

    for (const d of detailRows) {
        const row = detailSheet.addRow({
            studentName: d.studentName,
            courseTitle: d.courseTitle,
            sessionTitle: d.sessionTitle,
            sessionDate: fmtDatetime(d.sessionDate),
            status: d.status,
            checkInTime: fmtDatetime(d.checkInTime),
            checkOutTime: fmtDatetime(d.checkOutTime),
            duration: fmtDuration(d.durationMinutes),
            attendancePercent: d.attendancePercent !== null
                ? Number(d.attendancePercent.toFixed(1))
                : null,
            method: d.method,
            gpsValid: d.gpsValid === null ? '-' : d.gpsValid ? 'Yes' : 'No',
        });

        // Colour status cell
        const statusCell = row.getCell('status');
        const color = STATUS_COLORS[d.status] ?? 'FF000000';
        statusCell.font = { color: { argb: color }, bold: true };

        // Format attendance % cell
        const pctCell = row.getCell('attendancePercent');
        if (d.attendancePercent !== null) {
            pctCell.numFmt = '0.0"%"';
        }

        row.commit();
    }

    autoFitColumns(detailSheet);

    // ── Metadata sheet (hidden) ────────────────────────────────────────────
    const metaSheet = wb.addWorksheet('_meta', { state: 'veryHidden' });
    metaSheet.addRow(['Generated', new Date().toISOString()]);
    metaSheet.addRow(['Organization', organizationId]);
    metaSheet.addRow(['Course filter', courseId ?? 'All']);
    metaSheet.addRow(['Date from', dateFrom?.toISOString() ?? 'Any']);
    metaSheet.addRow(['Date to', dateTo?.toISOString() ?? 'Any']);

    // ── Serialise to Buffer ────────────────────────────────────────────────
    const arrayBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    log('info', 'exportToExcel done', {
        summaryRows: summaries.length,
        detailRows: detailRows.length,
        bytes: buffer.length,
    });

    return buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. exportToPdf  — placeholder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PDF export — not yet implemented.
 *
 * Recommended approach:
 *   1. Install `puppeteer` or `@playwright/browser-chromium`
 *   2. Render an HTML template with the same data (Handlebars / ejs)
 *   3. Use `page.pdf({ format: 'A4', printBackground: true })` → Buffer
 *
 * Alternatively use `pdfkit` for a programmatic (non-browser) approach.
 */
export async function exportToPdf(params: ExportParams): Promise<never> {
    void params; // suppress unused-var warning until implemented
    throw Object.assign(
        new Error('PDF export is not yet implemented. Use format=xlsx for now.'),
        { statusCode: 501, code: 'NOT_IMPLEMENTED' },
    );
}
