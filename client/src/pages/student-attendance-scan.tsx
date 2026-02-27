/**
 * student-attendance-scan.tsx
 * Student QR Scanner View — mobile-first fullscreen attendance check-in.
 *
 * Route: /student/attendance/scan
 * Flow: active sessions check → 1 = scanner, multiple = selection → scan/manual → success card.
 * Uses QrScanner (html5-qrcode), manual code entry fallback, recent attendance at bottom.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner, { type AttendanceRecord } from '@/components/attendance/QrScanner';
import { apiEndpoint } from '@/lib/config';
import { apiRequest } from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PagePhase =
  | 'loading'
  | 'no_sessions'
  | 'session_select'
  | 'scan_ready'   // 1 session: show scan CTA + manual entry + recent
  | 'scanning'
  | 'manual_entry'
  | 'success'
  | 'error';

interface ActiveSession {
  id: string;
  title: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  courseId: string;
  courseTitle: string;
}

interface SessionDetail {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
}

interface AttendanceHistoryItem {
  id: string;
  sessionId: string;
  sessionTitle: string;
  courseId: string;
  courseTitle: string;
  sessionStart: string;
  joinTime: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatAttendanceDate(iso: string, t: (k: string) => string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (dDate.getTime() === today.getTime()) return `${t("today")} • ${timeStr}`;
  if (dDate.getTime() === yesterday.getTime()) return `${t("yesterday")} • ${timeStr}`;
  const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${dateStr} • ${timeStr}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentAttendanceScan() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<PagePhase>('loading');
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);
  const [successSessionDetail, setSuccessSessionDetail] = useState<SessionDetail | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');

  // Fetch active sessions (student enrolled, physical, active)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest<{ sessions?: ActiveSession[] }>(apiEndpoint('/api/sessions/student/active'));
        const sessions: ActiveSession[] = data.sessions ?? [];
        if (cancelled) return;
        setActiveSessions(sessions);
        if (sessions.length === 0) setPhase('no_sessions');
        else if (sessions.length === 1) {
          setSelectedSession(sessions[0]);
          setPhase('scan_ready');
        } else setPhase('session_select');
      } catch (e) {
        if (!cancelled) {
          setErrorMessage(e instanceof Error ? e.message : t("somethingWentWrong"));
          setPhase('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [t]);

  // Fetch recent attendance (last 5)
  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest<{ records?: AttendanceHistoryItem[] }>(apiEndpoint('/api/attendance/my'));
        const records = (data.records ?? []).slice(0, 5);
        setAttendanceHistory(records);
      } catch {
        // ignore
      }
    })();
  }, [successRecord]); // refetch after successful check-in

  const handleCloseScanner = useCallback(() => {
    if (activeSessions.length > 1) {
      setSelectedSession(null);
      setPhase('session_select');
    } else {
      setPhase('scan_ready');
    }
  }, [activeSessions.length]);

  const handleScanSuccess = useCallback(async (record: AttendanceRecord) => {
    setSuccessRecord(record);
    try {
      const session = await apiRequest<SessionDetail>(apiEndpoint(`/api/sessions/${record.sessionId}`));
      setSuccessSessionDetail(session);
    } catch {
      // use record.message only
    }
    setPhase('success');
  }, []);

  const handleManualSubmit = useCallback(async () => {
    const raw = manualCode.trim();
    if (!raw) {
      setManualError(t("enterCodeFromBoard"));
      return;
    }
    let token = '';
    let sessionId = '';
    try {
      if (raw.startsWith('{')) {
        const obj = JSON.parse(raw);
        token = (obj.t ?? obj.token ?? '').toString().replace(/^"|"$/g, '').replace(/\\"/g, '"');
        sessionId = (obj.s ?? obj.sessionId ?? '').toString().replace(/^"|"$/g, '').replace(/\\"/g, '"');
      } else {
        const parts = raw.split(/[\s,]+/);
        token = (parts[0] ?? '').trim();
        sessionId = (parts[1] ?? '').trim();
      }
      if (!token || !sessionId) throw new Error('Invalid code');
    } catch {
      setManualError(t("invalidCodeFormat"));
      return;
    }
    setManualError('');
    setManualSubmitting(true);
    try {
      const data = await apiRequest<{ success?: boolean; attendanceId?: string; message?: string; gpsValid?: boolean }>(
        apiEndpoint('/api/attendance/scan'),
        { method: 'POST', body: JSON.stringify({ token, sessionId }) }
      );
      if (data.success) {
        const record: AttendanceRecord = {
          attendanceId: data.attendanceId ?? '',
          sessionId,
          message: data.message ?? t("attendanceRecorded"),
          gpsValid: data.gpsValid,
        };
        await handleScanSuccess(record);
        return;
      }
      setManualError(data.message ?? t("checkInFailed"));
    } catch (e) {
      setManualError(e instanceof Error ? e.message : t("networkError"));
    } finally {
      setManualSubmitting(false);
    }
  }, [manualCode, handleScanSuccess, t]);

  const goToScanning = (session: ActiveSession) => {
    setSelectedSession(session);
    setPhase('scanning');
  };

  const minTap = 'min-h-[48px] min-w-[48px]';

  // ── Full-screen scanner (QrScanner owns the whole view) ─────────────────────
  if (phase === 'scanning' && selectedSession) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d1117]" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <QrScanner onClose={handleCloseScanner} onSuccess={handleScanSuccess} />
      </div>
    );
  }

  // ── Wrapper: mobile-first full viewport ────────────────────────────────────
  return (
    <div
      className="min-h-screen w-full bg-[#0d1117] text-white flex flex-col"
      style={{ fontFamily: "'Lexend', sans-serif" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 safe-top border-b border-white/10">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('scanAttendanceTitle')}</h1>
        <button
          type="button"
          onClick={() => setLocation('/student/dashboard')}
          className={`${minTap} flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/10`}
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col overflow-auto">
        <AnimatePresence mode="wait">
          {/* Loading */}
          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 p-6"
            >
              <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">{t('common:common.loading')}</p>
            </motion.div>
          )}

          {/* No active sessions */}
          {phase === 'no_sessions' && (
            <motion.div
              key="no_sessions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-slate-500/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-400">qr_code_scanner</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">{t('noActiveSessions')}</h2>
              <p className="text-slate-400 text-sm mb-8 max-w-xs">
                {t('noActiveSessionsDesc')}
              </p>
              <button
                type="button"
                onClick={() => setLocation('/student/dashboard')}
                className={`${minTap} px-8 rounded-2xl bg-[#FFD700] text-slate-900 font-bold shadow-lg shadow-[#FFD700]/20`}
              >
                {t('returnToDashboard')}
              </button>
            </motion.div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">{t("somethingWentWrong")}</h2>
              <p className="text-slate-400 text-sm mb-8">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setLocation('/student/dashboard')}
                className={`${minTap} px-8 rounded-2xl bg-white/10 text-white font-semibold border border-white/20`}
              >
                {t("returnToDashboard")}
              </button>
            </motion.div>
          )}

          {/* Session selection (multiple active) */}
          {phase === 'session_select' && (
            <motion.div
              key="session_select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 p-6"
            >
              <p className="text-slate-400 text-sm mb-6">Select a session to check in:</p>
              <ul className="space-y-3">
                {activeSessions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goToScanning(s)}
                      className={`${minTap} w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 active:scale-[0.98] transition-all`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl text-[#FFD700]">school</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{s.title}</p>
                        <p className="text-sm text-slate-400 truncate">{s.courseTitle}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setLocation('/student/dashboard')}
                className={`${minTap} mt-8 w-full rounded-2xl bg-white/5 text-slate-400 font-medium border border-white/10`}
              >
                {t("common:actions.cancel")}
              </button>
            </motion.div>
          )}

          {/* Scan ready: 1 session — camera CTA + manual entry (same as bottom block below) */}
          {phase === 'scan_ready' && selectedSession && (
            <motion.div
              key="scan_ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-6"
            >
              <p className="text-slate-400 text-center text-lg mb-2">{t("alignQrCode")}</p>
              <div className="flex-1 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => setPhase('scanning')}
                  className={`${minTap} w-full max-w-[280px] mx-auto rounded-2xl border-2 border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700] font-bold text-lg flex items-center justify-center gap-3 shadow-lg`}
                >
                  <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
                  {t("openCameraToScan")}
                </button>
              </div>
              <div className="mt-8">
                <p className="text-slate-400 text-sm mb-2">{t("cameraNotWorking")}</p>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => { setManualCode(e.target.value); setManualError(''); }}
                  placeholder={t("pasteCodePlaceholder")}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500"
                />
                {manualError && <p className="text-red-400 text-sm mt-2">{manualError}</p>}
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={manualSubmitting}
                  className={`${minTap} mt-3 w-full rounded-xl bg-white/10 text-white font-medium border border-white/10 disabled:opacity-50`}
                >
                  {manualSubmitting ? t("submitting") : t("submitCode")}
                </button>
              </div>
            </motion.div>
          )}

          {/* Success card */}
          {phase === 'success' && successRecord && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-6"
            >
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-24 h-24 rounded-full bg-emerald-500/20 ring-4 ring-emerald-400/50 flex items-center justify-center mb-6"
                >
                  <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-1">{t("attendanceRecordedTitle")}</h2>
                {successSessionDetail?.courseTitle && (
                  <p className="text-[#FFD700] font-medium">{successSessionDetail.courseTitle}</p>
                )}
                {successSessionDetail?.title && (
                  <p className="text-slate-400 text-sm mt-1">{successSessionDetail.title}</p>
                )}
                <p className="text-slate-500 text-sm mt-2">{t("checkInTimeJustNow")}</p>
                <button
                  type="button"
                  onClick={() => setLocation('/student/dashboard')}
                  className={`${minTap} mt-8 px-8 rounded-2xl bg-[#FFD700] text-slate-900 font-bold shadow-lg shadow-[#FFD700]/20`}
                >
                  {t("returnToDashboard")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Attendance — show when we're in session_select, scan_ready, or success */}
        {(phase === 'session_select' || phase === 'scan_ready' || phase === 'success') && attendanceHistory.length > 0 && (
          <section className="border-t border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">{t("recentAttendance")}</h3>
              <button
                type="button"
                onClick={() => setLocation('/student/attendance')}
                className="text-sm font-bold text-[#FFD700] uppercase tracking-wide"
              >
                {t("viewAll")}
              </button>
            </div>
            <ul className="space-y-3">
              {attendanceHistory.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-lg text-[#FFD700]">school</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{r.courseTitle}</p>
                    <p className="text-xs text-slate-400">{formatAttendanceDate(r.joinTime || r.sessionStart, t)}</p>
                  </div>
                  <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
