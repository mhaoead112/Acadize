import { motion, AnimatePresence } from 'framer-motion';
import {
  fadeInVariants,
  staggerContainer,
  cardVariants,
} from '@/lib/animations';
import { useLocation } from 'wouter';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import TeacherLayout from '@/components/TeacherLayout';
import CreateSessionModal from '@/components/attendance/CreateSessionModal';

// ============================================================================
// TYPES
// ============================================================================

type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
type SessionType   = 'physical' | 'online';
type TabFilter     = 'all' | 'upcoming' | 'active' | 'completed';

interface AttendanceSummary {
  total:   number;
  present: number;
  late:    number;
  absent:  number;
}

interface Session {
  id:                   string;
  title:                string;
  courseId:             string;
  courseName:           string;   // mapped from courseTitle in API response
  sessionType:          SessionType;
  status:               SessionStatus;
  startTime:            string;
  endTime:              string;
  minAttendancePercent: number | null;
  attendanceSummary?:   AttendanceSummary;
}

// Raw shape returned by GET /api/sessions → { data: RawSession[], nextCursor, hasNextPage }
interface RawSession {
  id:                   string;
  title:                string;
  courseId:             string;
  courseTitle:          string;
  sessionType:          string;
  status:               string;
  startTime:            string | Date;
  endTime:              string | Date;
  minAttendancePercent?: number | null;
}

interface Course {
  id:    string;
  title: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

function isUpcoming(s: Session) {
  return s.status === 'scheduled' && new Date(s.startTime) > new Date();
}

function attendancePct(summary?: AttendanceSummary): number {
  if (!summary || summary.total === 0) return 0;
  return Math.round(((summary.present + summary.late) / summary.total) * 100);
}

function pctColor(pct: number) {
  if (pct >= 75) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-500';
}

function pctTextColor(pct: number) {
  if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// Whether a session can be deleted (only scheduled or cancelled)
function canDelete(status: SessionStatus) {
  return status === 'scheduled' || status === 'cancelled';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, { label: string; cls: string; dot: string }> = {
    active:    { label: 'Active',    cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',  dot: 'bg-emerald-500 animate-pulse' },
    scheduled: { label: 'Scheduled', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',          dot: 'bg-amber-500' },
    completed: { label: 'Completed', cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',      dot: 'bg-purple-500' },
    cancelled: { label: 'Cancelled', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',          dot: 'bg-slate-400' },
  };
  const { label, cls, dot } = map[status] ?? map.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cls}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: SessionType }) {
  return type === 'physical' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-tight">
      <span className="material-symbols-outlined text-[13px]">location_on</span>
      Physical
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-tight">
      <span className="material-symbols-outlined text-[13px]">videocam</span>
      Online
    </span>
  );
}

// ============================================================================
// ACTIVE SESSION BANNER
// ============================================================================

function ActiveSessionBanner({
  session,
  onView,
}: {
  session: Session;
  onView: () => void;
}) {
  const pct     = attendancePct(session.attendanceSummary);
  const summary = session.attendanceSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-emerald-900/40 to-teal-950/60 dark:from-emerald-950/80 dark:via-emerald-900/60 dark:to-teal-950/80 p-6 lg:p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl"
    >
      <div className="absolute -top-12 -right-12 size-48 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <span className="relative flex size-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-4 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Live Now</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-white">{session.title}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-emerald-300/80">{session.courseName}</span>
            <TypeBadge type={session.sessionType} />
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-black text-white">{summary.present + summary.late}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">Present</div>
            </div>
            <div className="text-slate-400 text-xl">/</div>
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">{summary.total}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">Enrolled</div>
            </div>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onView}
          className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-xl shadow-emerald-500/30 transition-all text-sm whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[20px]">sensors</span>
          Go to Live View
        </motion.button>
      </div>

      {summary && summary.total > 0 && (
        <div className="relative z-10 mt-6 space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-300/60">
            <span>Attendance</span>
            <span className="text-emerald-300">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${pctColor(pct)} shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// SESSION CARD
// ============================================================================

function SessionCard({
  session,
  index,
  onView,
  onEdit,
  onStart,
  onDelete,
}: {
  session:  Session;
  index:    number;
  onView:   () => void;
  onEdit:   () => void;
  onStart:  () => void;
  onDelete: () => void;
}) {
  const pct      = attendancePct(session.attendanceSummary);
  const summary  = session.attendanceSummary;
  const canStart = session.status === 'scheduled';
  const deletable = canDelete(session.status);

  return (
    <div
      className="group relative overflow-hidden bg-white dark:bg-navy/40 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl hover:shadow-amber-500/5 dark:hover:shadow-none transition-all duration-500 cursor-pointer"
      onClick={onView}
    >
      {/* decorative corner glow — gold tint */}
      <div className="absolute -right-8 -top-8 size-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors" />

      <div className="relative z-10 p-6 space-y-5">
        {/* top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="font-black text-navy dark:text-white text-base leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
              {session.title}
            </h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">
              {session.courseName}
            </p>
          </div>
          <StatusBadge status={session.status} />
        </div>

        {/* badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={session.sessionType} />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-[13px]">calendar_today</span>
            {formatDate(session.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            {formatTime(session.startTime)} – {formatTime(session.endTime)}
          </span>
        </div>

        {/* attendance row */}
        {summary ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">groups</span>
                {summary.present + summary.late}/{summary.total} students
              </span>
              <span className={`text-[11px] font-black ${pctTextColor(pct)}`}>{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                className={`h-full rounded-full ${pctColor(pct)}`}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-[14px]">groups</span>
            Attendance not recorded yet
          </div>
        )}

        {/* actions — stop propagation so card click doesn't fire */}
        <div
          className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          {canStart && (
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={onStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-[11px] font-black uppercase tracking-wide shadow-lg shadow-amber-500/20 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">play_arrow</span>
              Start
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onView}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 text-[11px] font-black uppercase tracking-wide transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">visibility</span>
            View
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-wide transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            Edit
          </motion.button>

          {/* Delete only allowed for scheduled / cancelled sessions */}
          {deletable && (
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={onDelete}
              className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/0 hover:bg-red-500/10 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 text-[11px] font-black uppercase tracking-wide transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="relative mb-8">
        <div className="size-32 rounded-full bg-slate-100 dark:bg-navy-dark flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-7xl text-slate-300 dark:text-slate-600">event_busy</span>
        </div>
        <div className="absolute -bottom-2 -right-2 size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <span className="material-symbols-outlined text-[24px] text-amber-500">add_circle</span>
        </div>
      </div>
      <h4 className="text-2xl font-black text-navy dark:text-white mb-3">{t('noSessionsFound')}</h4>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
        Ready to start taking attendance? Create your first session to invite students and track participation in real-time.
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onCreate}
        className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black shadow-xl shadow-amber-500/20 transition-all"
      >
        <span className="material-symbols-outlined text-[22px]">add_circle</span>
        Create your first session
      </motion.button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TeacherSessions() {
  const [, setLocation] = useLocation();
  const { getAuthHeaders } = useAuth();
  const { t } = useTranslation('teacher');

  // ── State ──────────────────────────────────────────────────────────────────
  const [sessions,       setSessions]       = useState<Session[]>([]);
  const [courses,        setCourses]        = useState<Course[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<Session | null>(null);
  const [modalOpen,      setModalOpen]      = useState(false);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [tab,      setTab]      = useState<TabFilter>('all');
  const [courseId, setCourseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [searchQ,  setSearchQ]  = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const headers = getAuthHeaders();

      const params = new URLSearchParams();
      if (courseId)            params.set('courseId', courseId);
      if (dateFrom)            params.set('dateFrom', dateFrom);
      if (dateTo)              params.set('dateTo', dateTo);
      if (tab === 'active')    params.set('status', 'active');
      if (tab === 'completed') params.set('status', 'completed');
      if (tab === 'upcoming')  params.set('status', 'scheduled');

      // GET /api/sessions → { data: RawSession[], nextCursor, hasNextPage }
      const sessionsRes = await fetch(
        apiEndpoint(`/api/sessions?${params}`),
        { headers, credentials: 'include' },
      );

      if (!sessionsRes.ok) {
        const errBody = await sessionsRes.json().catch(() => ({}));
        throw new Error(errBody.message || `Sessions request failed (${sessionsRes.status})`);
      }

      const sessionsData = await sessionsRes.json();
      const rawRows: RawSession[] = Array.isArray(sessionsData)
        ? sessionsData
        : (sessionsData.data ?? sessionsData.sessions ?? []);

      const normalised: Session[] = rawRows.map((r) => ({
        id:                   r.id,
        title:                r.title,
        courseId:             r.courseId,
        courseName:           r.courseTitle ?? '',
        sessionType:          (r.sessionType as SessionType) ?? 'physical',
        status:               (r.status as SessionStatus) ?? 'scheduled',
        startTime:            typeof r.startTime === 'string' ? r.startTime : new Date(r.startTime).toISOString(),
        endTime:              typeof r.endTime   === 'string' ? r.endTime   : new Date(r.endTime).toISOString(),
        minAttendancePercent: r.minAttendancePercent ?? null,
        attendanceSummary:    undefined,
      }));

      setSessions(normalised);

      // Fetch courses for dropdown (best-effort)
      const coursesRes = await fetch(
        apiEndpoint('/api/courses/user'),
        { headers, credentials: 'include' },
      );
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        const arr = Array.isArray(coursesData)
          ? coursesData
          : (coursesData.courses ?? coursesData.data ?? []);
        setCourses(arr.map((c: any) => ({ id: c.id, title: c.title })));
      }
    } catch (err: any) {
      console.error('[teacher-sessions] fetchData:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, dateFrom, dateTo, tab, getAuthHeaders]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (session: Session) => {
    if (!canDelete(session.status)) {
      setError(`Cannot delete a session with status "${session.status}". End it first.`);
      setConfirmDelete(null);
      return;
    }
    setDeletingId(session.id);
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${session.id}`), {
        method:      'DELETE',
        headers:     getAuthHeaders(),
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `Delete failed (${res.status})`);
      setSessions(prev => prev.filter(s => s.id !== session.id));
    } catch (err: any) {
      console.error('[teacher-sessions] delete:', err);
      setError(err.message);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  // ── Start ──────────────────────────────────────────────────────────────────
  const handleStart = async (session: Session) => {
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${session.id}/start`), {
        method:      'POST',
        headers:     getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        setSessions(prev =>
          prev.map(s => s.id === session.id ? { ...s, status: 'active' } : s),
        );
      }
    } catch (err) {
      console.error('[teacher-sessions] start:', err);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeSessions  = sessions.filter(s => s.status === 'active');
  const upcomingCount   = sessions.filter(isUpcoming).length;
  const completedCount  = sessions.filter(s => s.status === 'completed').length;

  const filtered = sessions.filter(s => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.courseName.toLowerCase().includes(q);
  });

  const kpis = [
    { label: 'Total',     value: sessions.length,       icon: 'event',          color: 'amber',   suffix: 'All time' },
    { label: 'Live Now',  value: activeSessions.length, icon: 'sensors',        color: 'emerald', suffix: activeSessions.length > 0 ? 'Active' : 'Offline' },
    { label: 'Upcoming',  value: upcomingCount,          icon: 'calendar_today', color: 'amber',   suffix: 'Scheduled' },
    { label: 'Completed', value: completedCount,         icon: 'task_alt',       color: 'purple',  suffix: 'Done' },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <motion.div
            className="size-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">{t('loadingSessions')}</p>
        </div>
      </TeacherLayout>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <TeacherLayout>
        <div className="max-w-7xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">error</span>
            <p className="text-red-500 font-bold text-xl mb-2">{t('failedToLoadSessions')}</p>
            <p className="text-red-600/80 dark:text-red-400/80 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20"
            >
              {t('retry')}
            </button>
          </motion.div>
        </div>
      </TeacherLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TeacherLayout>
      <div className="w-full bg-slate-50 dark:bg-navy-dark min-h-screen transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8 lg:space-y-10 pb-24">

          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
          >
            <motion.div variants={fadeInVariants} className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-navy dark:text-white leading-[1.1]">
                {t('sessionsManagement')}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg lg:text-xl max-w-2xl leading-relaxed">
                {t('sessionsManagementDesc')}
              </p>
            </motion.div>

            <motion.div variants={fadeInVariants} className="flex flex-wrap items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setRefreshing(true); fetchData(); }}
                disabled={refreshing}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-navy/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-amber-400 hover:border-amber-500/50 transition-all text-sm font-bold shadow-sm disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${refreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {refreshing ? t('syncing') : t('sync')}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-base font-black shadow-[0_8px_20px_-4px_rgba(245,158,11,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(245,158,11,0.5)] transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">add_circle</span>
                Create Session
              </motion.button>
            </motion.div>
          </motion.div>

          {/* ── ERROR TOAST (non-blocking) ───────────────────────────────── */}
          <AnimatePresence>
            {error && sessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold"
              >
                <span className="material-symbols-outlined text-[20px]">error</span>
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── KPI CARDS ───────────────────────────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          >
            {kpis.map((kpi) => (
              <motion.div
                key={kpi.label}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative overflow-hidden group bg-white dark:bg-navy/40 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <div className={`absolute -right-8 -top-8 size-32 bg-${kpi.color}-500/10 rounded-full blur-3xl group-hover:bg-${kpi.color}-500/20 transition-colors`} />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl bg-${kpi.color}-500/10 text-${kpi.color}-600 dark:text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                      <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                      {kpi.suffix}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-navy dark:text-white mb-1 group-hover:text-amber-500 transition-colors">
                      {kpi.value}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-tight">{kpi.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── ACTIVE SESSION HIGHLIGHT ─────────────────────────────────── */}
          <AnimatePresence>
            {activeSessions.slice(0, 1).map(s => (
              <ActiveSessionBanner
                key={s.id}
                session={s}
                onView={() => setLocation(`/teacher/sessions/${s.id}/live`)}
              />
            ))}
          </AnimatePresence>

          {/* ── FILTERS ─────────────────────────────────────────────────── */}
          <motion.div
            variants={fadeInVariants}
            initial="initial"
            animate="animate"
            className="bg-white dark:bg-navy/40 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 p-4 lg:p-6 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
              {/* tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-2xl p-1 flex-shrink-0">
                {(['all', 'upcoming', 'active', 'completed'] as TabFilter[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                      tab === t
                        ? 'bg-white dark:bg-navy shadow-sm text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* search */}
                <div className="relative group flex-1 min-w-[160px]">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 group-focus-within:text-amber-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search sessions…"
                    className="w-full bg-slate-100/50 dark:bg-navy-dark/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm py-2.5 pl-10 pr-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white dark:focus:bg-navy-dark transition-all outline-none text-navy dark:text-white font-medium"
                  />
                </div>

                {/* course filter */}
                <select
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                  className="bg-slate-100/50 dark:bg-navy-dark/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm py-2.5 px-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none text-navy dark:text-white font-medium max-w-[180px]"
                >
                  <option value="">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>

                {/* date range */}
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="bg-slate-100/50 dark:bg-navy-dark/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm py-2.5 px-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none text-navy dark:text-white font-medium"
                  title="Date from"
                />
                <span className="text-slate-400 text-xs font-bold">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="bg-slate-100/50 dark:bg-navy-dark/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm py-2.5 px-4 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none text-navy dark:text-white font-medium"
                  title="Date to"
                />

                {/* clear */}
                {(searchQ || courseId || dateFrom || dateTo || tab !== 'all') && (
                  <button
                    onClick={() => { setSearchQ(''); setCourseId(''); setDateFrom(''); setDateTo(''); setTab('all'); }}
                    className="text-xs font-black uppercase tracking-wide text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── SESSION GRID ─────────────────────────────────────────────── */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  className="col-span-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <EmptyState onCreate={() => setLocation('/teacher/sessions/create')} />
                </motion.div>
              ) : (
                filtered.map((session, idx) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                  >
                    <SessionCard
                      session={session}
                      index={idx}
                      onView={() => setLocation(`/teacher/sessions/${session.id}/live`)}
                      onEdit={() => setLocation(`/teacher/sessions/${session.id}/edit`)}
                      onStart={() => handleStart(session)}
                      onDelete={() => setConfirmDelete(session)}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>

      {/* ── CREATE SESSION MODAL ─────────────────────────────────── */}
      <CreateSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          setLoading(true);
          fetchData();
        }}
      />

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-navy/90 rounded-3xl border border-slate-200 dark:border-white/10 p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <span className="material-symbols-outlined text-red-500 text-[28px]">delete_forever</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-navy dark:text-white">Delete Session?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You are about to permanently delete <span className="font-black text-navy dark:text-white">"{confirmDelete.title}"</span>.
                All attendance records for this session will also be removed.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-navy dark:text-white font-black text-sm transition-all"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={deletingId === confirmDelete.id}
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-black text-sm transition-all shadow-lg shadow-red-500/20"
                >
                  {deletingId === confirmDelete.id ? 'Deleting…' : 'Delete Session'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
}
