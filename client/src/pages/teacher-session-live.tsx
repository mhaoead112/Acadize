/**
 * teacher-session-live.tsx
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Live Session Attendance & QR Hub â€” pixel-perfect replica of Stitch design.
 *
 * Route: /teacher/sessions/:sessionId/live
 * Layout: TeacherLayout wrapper, two-column split (responsive).
 * Data: polling-based (5 s attendance, QR rotation on configured interval).
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import TeacherLayout from '@/components/TeacherLayout';
import { useTheme } from '@/contexts/ThemeContext';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SessionType   = 'physical' | 'online';
type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
type AttendStatus  = 'present' | 'late' | 'absent' | 'excused';

interface SessionDetail {
  id:                        string;
  title:                     string;
  courseTitle:               string;
  courseId:                  string;
  sessionType:               SessionType;
  status:                    SessionStatus;
  startTime:                 string;
  endTime:                   string;
  qrToken:                  string | null;
  qrExpiresAt:              string | null;
  qrExpiryMinutes:          number;
  qrRotationEnabled:        boolean;
  qrRotationIntervalSeconds: number;
  gpsRequired:              boolean;
  gpsRadius:                number | null;
  minAttendancePercent:     number;
  attendanceCount:          number;
}

interface AttendanceRecord {
  id:             string;
  userId:         string;
  studentName:    string;
  studentEmail:   string;
  joinTime:       string | null;
  leaveTime:      string | null;
  status:         AttendStatus;
  checkInMethod:  string | null;
  gpsValid:       boolean | null;
}

interface AttendanceSummary {
  total:   number;
  present: number;
  late:    number;
  absent:  number;
}

interface QrData {
  token:      string;
  expiresAt:  string;
  qrPayload:  string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Format seconds â†’ HH:MM:SS */
function fmtElapsed(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function fmtTime(iso: string | null, locale = 'en-US'): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function statusColor(s: AttendStatus): string {
  switch (s) {
    case 'present': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
    case 'late':    return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
    case 'absent':  return 'bg-red-500/15 text-red-400 border-red-500/25';
    case 'excused': return 'bg-purple-500/15 text-purple-400 border-purple-500/25';
  }
}

function displayStatus(s: AttendStatus, t: (key: string) => string): string {
  return t(`teacherSessionLive.statuses.${s}`);
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main component
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TeacherSessionLive() {
  const { t, i18n } = useTranslation('teacher');
  const { theme } = useTheme();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? '';
  const [, setLocation] = useLocation();
  const { getAuthHeaders } = useAuth();

  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [session,   setSession]   = useState<SessionDetail | null>(null);
  const [records,   setRecords]   = useState<AttendanceRecord[]>([]);
  const [summary,   setSummary]   = useState<AttendanceSummary>({ total: 0, present: 0, late: 0, absent: 0 });
  const [qrData,    setQrData]    = useState<QrData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [searchQ,   setSearchQ]   = useState('');
  const [elapsed,   setElapsed]   = useState(0);
  const [lastSync,  setLastSync]  = useState(0);     // seconds since last poll
  const [endModal,  setEndModal]  = useState(false);
  const [ending,    setEnding]    = useState(false);
  const [marking,   setMarking]   = useState<string | null>(null);   // userId being marked
  const [rotating,  setRotating]  = useState(false);
  const [starting,   setStarting]  = useState(false);
  const [rotationCountdown, setRotationCountdown] = useState(0);     // seconds until next rotation
  const [isFullscreen, setIsFullscreen] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = getAuthHeaders();

  // â”€â”€ Fetch session detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${sessionId}`), {
        headers, credentials: 'include',
      });
      if (!res.ok) throw new Error(t('teacherSessionLive.sessionNotFound'));
      const data = await res.json();
      // The API may return { ...session } or { session: ... }
      const s = data.session ?? data;
      setSession(s);
      return s as SessionDetail;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [sessionId, headers, t]);

  // â”€â”€ Fetch attendance records â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint(`/api/attendance/session/${sessionId}`), {
        headers, credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setRecords(data.records ?? []);
      setSummary(data.summary ?? { total: 0, present: 0, late: 0, absent: 0 });
      setLastSync(0);
    } catch {/* ignore */}
  }, [sessionId, headers]);

  // â”€â”€ Fetch QR data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchQr = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${sessionId}/qr`), {
        headers, credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setQrData({
        token:     data.token,
        expiresAt: data.expiresAt,
        qrPayload: data.qrPayload ?? JSON.stringify({ t: data.token, s: sessionId, ts: Date.now() }),
      });
    } catch {/* ignore */}
  }, [sessionId, headers]);

  // â”€â”€ Rotate QR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const rotateQr = useCallback(async () => {
    setRotating(true);
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${sessionId}/qr/rotate`), {
        method: 'POST', headers, credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setQrData({
          token:     data.token,
          expiresAt: data.expiresAt,
          qrPayload: data.qrPayload ?? JSON.stringify({ t: data.token, s: sessionId, ts: Date.now() }),
        });
        if (session?.qrRotationEnabled) {
          setRotationCountdown(session.qrRotationIntervalSeconds);
        }
      }
    } catch {/* ignore */}
    setRotating(false);
  }, [sessionId, headers, session]);

  // â”€â”€ Mark student present / excused â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const markStudent = useCallback(async (userId: string, status: 'present' | 'excused') => {
    setMarking(userId);
    try {
      await fetch(apiEndpoint('/api/attendance/manual'), {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, userId, status }),
      });
      await fetchAttendance();
    } catch {/* ignore */}
    setMarking(null);
  }, [sessionId, headers, fetchAttendance]);

  // â”€â”€ Start session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleStartSession = async () => {
    setStarting(true);
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${sessionId}/start`), {
        method: 'POST', headers, credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        // Refresh session detail
        const updated = await fetchSession();
        if (updated?.sessionType === 'physical') {
          // If start returned QR data use it directly, else fetch
          if (data.qrData?.token) {
            setQrData({
              token:     data.qrData.token,
              expiresAt: data.qrData.expiresAt,
              qrPayload: JSON.stringify({ t: data.qrData.token, s: sessionId, ts: Date.now() }),
            });
          } else {
            await fetchQr();
          }
          if (updated.qrRotationEnabled) {
            setRotationCountdown(updated.qrRotationIntervalSeconds);
          }
        }
        await fetchAttendance();
      }
    } catch {/* ignore */}
    setStarting(false);
  };

  // â”€â”€ End session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleEndSession = async () => {
    setEnding(true);
    try {
      const res = await fetch(apiEndpoint(`/api/sessions/${sessionId}/end`), {
        method: 'POST', headers, credentials: 'include',
      });
      if (res.ok) {
        setLocation('/teacher/sessions');
      }
    } catch {/* ignore */}
    setEnding(false);
    setEndModal(false);
  };

  // â”€â”€ Download QR as PNG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const downloadQrPng = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-qr-${sessionId.slice(0, 8)}.png`;
    a.click();
  };

  // â”€â”€ Fullscreen toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      qrRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // â”€â”€ Keyboard shortcut (F for fullscreen) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Listen for fullscreen exit
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // â”€â”€ Initial load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    (async () => {
      const s = await fetchSession();
      if (s) {
        await fetchAttendance();
        if (s.sessionType === 'physical' && s.status === 'active') {
          await fetchQr();
          if (s.qrRotationEnabled) {
            setRotationCountdown(s.qrRotationIntervalSeconds);
          }
        }
      }
      setLoading(false);
    })();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // â”€â”€ Polling: attendance every 5s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!session || session.status !== 'active') return;
    const id = setInterval(() => {
      fetchAttendance();
    }, 5000);
    return () => clearInterval(id);
  }, [session?.status, fetchAttendance]);

  // â”€â”€ Last-sync counter (ticks every 1s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const id = setInterval(() => setLastSync(p => p + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // â”€â”€ Elapsed timer (counts up from session start) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!session?.startTime) return;
    const start = new Date(session.startTime).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.startTime]);

  // â”€â”€ QR rotation countdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!session?.qrRotationEnabled || session.status !== 'active') return;
    if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);

    rotationTimerRef.current = setInterval(() => {
      setRotationCountdown(prev => {
        if (prev <= 1) {
          rotateQr();
          return session.qrRotationIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (rotationTimerRef.current) clearInterval(rotationTimerRef.current); };
  }, [session?.qrRotationEnabled, session?.status, session?.qrRotationIntervalSeconds, rotateQr]);

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const attPct = summary.total > 0
    ? Math.round(((summary.present + summary.late) / summary.total) * 100)
    : 0;

  const filteredRecords = records.filter(r => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return r.studentName.toLowerCase().includes(q) || r.studentEmail.toLowerCase().includes(q);
  }).sort((a, b) => {
    // Present first, then late, then pending/absent
    const order: Record<string, number> = { present: 0, late: 1, excused: 2, absent: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  const rotPct = session?.qrRotationEnabled
    ? ((rotationCountdown / (session.qrRotationIntervalSeconds || 30)) * 100)
    : 0;

  // â”€â”€ Loading / Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div
            className="size-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </TeacherLayout>
    );
  }

  if (error || !session) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 bg-slate-50 dark:bg-[#0d1117]">
          <span className="material-symbols-outlined text-6xl text-red-500">error</span>
          <p className="text-red-500 dark:text-red-400 font-bold text-lg">{error || t('teacherSessionLive.sessionNotFound')}</p>
          <button
            onClick={() => setLocation('/teacher/sessions')}
            className="px-6 py-3 rounded-xl bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
          >
            {t('teacherSessionLive.backToSessions')}
          </button>
        </div>
      </TeacherLayout>
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <TeacherLayout>
      <div className="w-full min-h-screen bg-slate-50 dark:bg-[#0d1117]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              TWO-COLUMN LAYOUT
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] gap-6">

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                LEFT PANEL â€” Session Control & QR
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <div className="space-y-5">

              {/* â”€â”€ Session info header â”€â”€ */}
              <div className="rounded-2xl p-5 space-y-4 bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {/* Type badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                      ${session.sessionType === 'physical'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {t(`teacherSessionLive.sessionTypes.${session.sessionType}`)} {t('sessionLabel')}
                    </span>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{session.title}</h1>
                    <p className="text-xs text-slate-500 dark:text-white/40">
                      {session.courseTitle}
                    </p>
                  </div>
                  {/* Elapsed timer */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/35">
                      {t('elapsedTime')}
                    </p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-wider mt-1">
                      {fmtElapsed(elapsed)}
                    </p>
                  </div>
                </div>
              </div>

              {/* â”€â”€ QR Code display (physical only) â”€â”€ */}
              {session.sessionType === 'physical' && session.status !== 'active' && (
                <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center bg-white dark:bg-[#141928] border border-amber-300 dark:border-amber-500/20">
                  <span className="material-symbols-outlined text-4xl text-amber-400">play_circle</span>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{t('teacherSessionLive.sessionNotStarted')}</p>
                    <p className="text-xs mt-1 text-slate-500 dark:text-white/40">{t('teacherSessionLive.sessionNotStartedDesc')}</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleStartSession}
                    disabled={starting}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-black disabled:opacity-60 transition-all"
                    style={{ background: '#f59e0b' }}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${starting ? 'animate-spin' : ''}`}>
                      {starting ? 'refresh' : 'play_arrow'}
                    </span>
                    {starting ? t('teacherSessionLive.starting') : t('teacherSessionLive.startSession')}
                  </motion.button>
                </div>
              )}

              {/* â”€â”€ QR Code display (physical + active only) â”€â”€ */}
              {session.sessionType === 'physical' && session.status === 'active' && (
                <div className="rounded-2xl p-5 space-y-4 bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10">

                  {/* QR image */}
                  <div
                    ref={qrRef}
                    className={`flex items-center justify-center rounded-xl p-6 mx-auto bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20
                      ${isFullscreen ? 'fixed inset-0 z-[999] bg-black border-none flex items-center justify-center' : ''}`}
                  >
                    {qrData ? (
                      <QRCodeCanvas
                        value={qrData.qrPayload}
                        size={isFullscreen ? 500 : 220}
                        bgColor="transparent"
                        fgColor={theme === 'dark' ? '#f5f5f5' : '#0f172a'}
                        level="M"
                        includeMargin={false}
                        imageSettings={{
                          src: '',
                          height: 0,
                          width: 0,
                          excavate: false,
                        }}
                      />
                    ) : (
                      <div className="text-center space-y-2 py-8">
                        <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-white/20">qr_code_2</span>
                        <p className="text-xs text-slate-500 dark:text-white/30">{t('teacherSessionLive.noQrToken')}</p>
                      </div>
                    )}
                    {isFullscreen && (
                      <button
                        onClick={toggleFullscreen}
                        className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[28px]">close_fullscreen</span>
                      </button>
                    )}
                  </div>

                  {/* Rotation countdown */}
                  {session.qrRotationEnabled && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/35">
                          {t('teacherSessionLive.rotationCountdown')}
                        </span>
                        <span className="text-sm font-bold text-amber-400">{rotationCountdown}s</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-amber-500"
                          animate={{ width: `${rotPct}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* QR action buttons */}
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={rotateQr}
                      disabled={rotating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-50 transition-all"
                      style={{ background: '#f59e0b' }}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${rotating ? 'animate-spin' : ''}`}>refresh</span>
                      {t('teacherSessionLive.regenerate')}
                    </motion.button>
                    <button
                      onClick={downloadQrPng}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      PNG
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="p-2.5 rounded-xl transition-all bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-white/50"
                      title={t('teacherSessionLive.fullscreenTitle')}
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                    </button>
                  </div>
                </div>
              )}

              {/* â”€â”€ Session Security & End â”€â”€ */}
              <div className="rounded-2xl p-5 flex items-center justify-between bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[22px] text-slate-500 dark:text-white/30">settings</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t('teacherSessionLive.sessionSecurity')}</p>
                    <p className="text-xs text-slate-500 dark:text-white/35">
                      {[
                        session.gpsRequired && t('teacherSessionLive.security.gps'),
                        session.qrExpiryMinutes < 9999 && t('teacherSessionLive.security.expiry'),
                      ].filter(Boolean).join(' & ') || t('teacherSessionLive.security.standard')} {t('teacherSessionLive.security.active')}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setEndModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                  {t('teacherSessionLive.endSession')}
                </motion.button>
              </div>
            </div>

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                RIGHT PANEL â€” Live Attendance
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            <div className="space-y-5">

              {/* â”€â”€ 3 KPI cards â”€â”€ */}
              <div className="grid grid-cols-3 gap-4">
                {/* Enrolled */}
                <div className="rounded-2xl p-5 bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-500 dark:text-white/35">{t('teacherSessionLive.enrolled')}</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {summary.total}
                    <span className="text-sm font-bold ml-2 text-slate-500 dark:text-white/40">{t('teacherSessionLive.students')}</span>
                  </p>
                </div>

                {/* Checked In */}
                <div className="rounded-2xl p-5 bg-white dark:bg-[#141928] border border-amber-300 dark:border-amber-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-amber-400">
                    {t('teacherSessionLive.checkedIn')}
                  </p>
                  <div className="flex items-center gap-2">
                    <motion.p
                      key={summary.present + summary.late}
                      initial={{ scale: 1.2, color: '#fbbf24' }}
                      animate={{ scale: 1 }}
                      className="text-3xl font-black text-slate-900 dark:text-white"
                    >
                      {summary.present + summary.late}
                    </motion.p>
                    <span className="size-2.5 rounded-full bg-amber-400 animate-pulse" />
                  </div>
                </div>

                {/* Attendance % */}
                <div className="rounded-2xl p-5 bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-slate-500 dark:text-white/35">{t('teacherSessionLive.attendancePct')}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{attPct}%</p>
                    {/* Mini ring gauge */}
                    <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="14" fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeDasharray={`${(attPct / 100) * 88} 88`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        transform="rotate(-90 18 18)"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* â”€â”€ Search + filter â”€â”€ */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-white/30">search</span>
                  </span>
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder={t('teacherSessionLive.searchStudents')}
                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/25 outline-none transition-all focus:ring-1 focus:ring-amber-500/40 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10"
                  />
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/60"
                >
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                  {t('teacherSessionLive.filter')}
                </button>
              </div>

              {/* â”€â”€ Student table â”€â”€ */}
              <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10">

                {/* Header row */}
                <div className="grid grid-cols-[1fr_100px_110px_140px] gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/35 border-b border-slate-200 dark:border-white/10">
                  <span>{t('teacherSessionLive.table.student')}</span>
                  <span>{t('teacherSessionLive.table.time')}</span>
                  <span>{t('teacherSessionLive.table.status')}</span>
                  <span className="text-right">{t('teacherSessionLive.table.actions')}</span>
                </div>

                {/* Rows */}
                <div className="max-h-[52vh] overflow-y-auto">
                  <AnimatePresence>
                    {filteredRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-white/15">groups</span>
                        <p className="text-sm text-slate-500 dark:text-white/30">{t('teacherSessionLive.noStudentsFound')}</p>
                      </div>
                    ) : (
                      filteredRecords.map((r, idx) => (
                        <motion.div
                          key={r.userId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="grid grid-cols-[1fr_100px_110px_140px] gap-2 items-center px-5 py-3.5 hover:bg-slate-100 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-white/[0.04]"
                        >
                          {/* Student name + email */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-9 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-400/20 flex items-center justify-center text-xs font-black text-amber-300 flex-shrink-0 border border-amber-500/20">
                              {initials(r.studentName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.studentName}</p>
                              <p className="text-[11px] truncate text-slate-500 dark:text-white/35">{r.studentEmail}</p>
                            </div>
                          </div>

                          {/* Time */}
                          <span className="text-sm text-slate-600 dark:text-white/60">
                            {fmtTime(r.joinTime, i18n.language.startsWith('ar') ? 'ar-EG' : 'en-US')}
                          </span>

                          {/* Status badge */}
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${statusColor(r.status)}`}>
                            {displayStatus(r.status, t)}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2">
                            {(r.status === 'absent' || r.status === 'late') && (
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => markStudent(r.userId, 'present')}
                                disabled={marking === r.userId}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-50"
                                style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#f59e0b' }}
                              >
                                {marking === r.userId ? t('teacherSessionLive.marking') : t('teacherSessionLive.markPresent')}
                              </motion.button>
                            )}
                            {(r.status === 'present' || r.status === 'late') && (
                              <>
                                <button
                                  className="p-1.5 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-white/30"
                                  title={t('teacherSessionLive.exportRecord')}
                                >
                                  <span className="material-symbols-outlined text-[18px]">download</span>
                                </button>
                                <button
                                  className="p-1.5 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-white/30"
                                  title={t('teacherSessionLive.viewDetails')}
                                >
                                  <span className="material-symbols-outlined text-[18px]">info</span>
                                </button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
              BOTTOM BAR
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <div className="mt-6 flex items-center justify-between px-2">
            <p className="text-xs text-slate-500 dark:text-white/30">
              {t('teacherSessionLive.lastAutoSync', { count: lastSync })}
            </p>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-white/70"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                {t('teacherSessionLive.sendAbsenceAlerts')}
              </button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <span className="material-symbols-outlined text-[14px] text-amber-400">info</span>
                <span className="text-xs font-bold text-amber-400">
                  {t('teacherSessionLive.pressForFullscreen', { key: 'F' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          END SESSION CONFIRMATION MODAL
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <AnimatePresence>
        {endModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)' }}
            onClick={e => { if (e.target === e.currentTarget) setEndModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl p-8 max-w-md w-full space-y-6 bg-white dark:bg-[#141928] border border-slate-200 dark:border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <span className="material-symbols-outlined text-red-400 text-[28px]">stop_circle</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('teacherSessionLive.endSessionTitle')}</h3>
                  <p className="text-sm mt-0.5 text-slate-500 dark:text-white/40">
                    {t('teacherSessionLive.endSessionDesc')}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-white/60">
                {t('teacherSessionLive.endSessionWarning', { status: t('teacherSessionLive.statuses.absent') })}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEndModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm transition-all bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70"
                >
                  {t('teacherSessionLive.cancel')}
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleEndSession}
                  disabled={ending}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-lg shadow-red-500/20 disabled:opacity-60"
                >
                  {ending ? t('teacherSessionLive.ending') : t('teacherSessionLive.endSession')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
}

