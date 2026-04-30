/**
 * CreateSessionModal.tsx
 * Pixel-perfect replica of the Stitch design.
 * Dark navy panel, amber/gold accent, single-page form, browser Geolocation for GPS.
 * API: POST /api/sessions (create) | PUT /api/sessions/:id (edit)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Course {
  id:    string;
  title: string;
}

interface SessionFormData {
  sessionType:               'physical' | 'online';
  title:                     string;
  courseId:                  string;
  date:                      string;    // YYYY-MM-DD
  startTime:                 string;    // HH:mm
  endTime:                   string;    // HH:mm
  // Physical
  gpsRequired:               boolean;
  gpsLat:                    number | null;
  gpsLng:                    number | null;
  gpsRadius:                 number;    // 50–500 m
  qrExpiryMinutes:           number;    // 0=never, 5, 10, 15, 30
  qrRotationEnabled:         boolean;
  qrRotationIntervalSeconds: number;    // 15 | 30 | 60
  minAttendancePercent:      number;    // 50–100
}

interface CreateSessionModalProps {
  open:         boolean;
  onClose:      () => void;
  onSuccess:    () => void;
  editSession?: Partial<SessionFormData> & { id?: string };
  orgGpsLat?:   number | null;
  orgGpsLng?:   number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS: SessionFormData = {
  sessionType:               'physical',
  title:                     '',
  courseId:                  '',
  date:                      new Date().toISOString().slice(0, 10),
  startTime:                 '',
  endTime:                   '',
  gpsRequired:               false,
  gpsLat:                    null,
  gpsLng:                    null,
  gpsRadius:                 150,
  qrExpiryMinutes:           0,
  qrRotationEnabled:         true,
  qrRotationIntervalSeconds: 15,
  minAttendancePercent:      75,
};

// ─────────────────────────────────────────────────────────────────────────────
// Primitive: Toggle switch
// ─────────────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-amber-400' : 'bg-white/10'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main modal
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateSessionModal({
  open,
  onClose,
  onSuccess,
  editSession,
  orgGpsLat,
  orgGpsLng,
}: CreateSessionModalProps) {
  const { getAuthHeaders } = useAuth();
  const isEdit = !!(editSession?.id);

  const [courses,       setCourses]       = useState<Course[]>([]);
  const [form,          setForm]          = useState<SessionFormData>(DEFAULTS);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [gpsStatus,     setGpsStatus]     = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');

  const geoAbortRef = useRef<(() => void) | null>(null);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setToast(null);
    setGpsStatus('idle');
    setForm(
      editSession
        ? { ...DEFAULTS, ...editSession }
        : { ...DEFAULTS, gpsLat: orgGpsLat ?? null, gpsLng: orgGpsLng ?? null }
    );
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load teacher's courses ─────────────────────────────────────────────────
  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint('/api/courses/user'), {
        headers: getAuthHeaders(), credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const arr: Course[] = Array.isArray(data) ? data : (data.courses ?? data.data ?? []);
        setCourses(arr.map(c => ({ id: c.id, title: c.title })));
      }
    } catch {/* best-effort */}
  }, [getAuthHeaders]);

  useEffect(() => { if (open) loadCourses(); }, [open, loadCourses]);

  // ── GPS: use browser geolocation only when toggle flips on ─────────────────
  useEffect(() => {
    if (!form.gpsRequired) {
      setGpsStatus('idle');
      return;
    }
    // If we already have coordinates (org or edit), don't re-prompt
    if (form.gpsLat !== null && form.gpsLng !== null) {
      setGpsStatus('ok');
      return;
    }
    // Try org defaults first
    if (orgGpsLat != null && orgGpsLng != null) {
      setForm(f => ({ ...f, gpsLat: orgGpsLat, gpsLng: orgGpsLng }));
      setGpsStatus('ok');
      return;
    }
    // Fall back to browser geolocation
    if (!('geolocation' in navigator)) {
      setGpsStatus('denied');
      return;
    }
    setGpsStatus('loading');
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return;
        setForm(f => ({ ...f, gpsLat: coords.latitude, gpsLng: coords.longitude }));
        setGpsStatus('ok');
      },
      () => {
        if (!cancelled) setGpsStatus('denied');
      },
      { timeout: 10000, maximumAge: 60000 }
    );
    geoAbortRef.current = () => { cancelled = true; };
    return () => { geoAbortRef.current?.(); };
  }, [form.gpsRequired, orgGpsLat, orgGpsLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Field updater ──────────────────────────────────────────────────────────
  function patch<K extends keyof SessionFormData>(key: K, value: SessionFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim())    e.title      = 'Title is required';
    if (!form.courseId)        e.courseId   = 'Course is required';
    if (!form.date)            e.date       = 'Date is required';
    if (!form.startTime)       e.startTime  = 'Start time is required';
    if (!form.endTime)         e.endTime    = 'End time is required';
    if (form.startTime && form.endTime && form.endTime <= form.startTime)
      e.endTime = 'Must be after start time';
    if (form.sessionType === 'physical' && form.gpsRequired && (form.gpsLat === null || form.gpsLng === null))
      e.gps = 'GPS coordinates are required. Enable location access in your browser.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setToast(null);
    try {
      const startISO = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const endISO   = new Date(`${form.date}T${form.endTime}:00`).toISOString();

      const body: Record<string, unknown> = {
        title:                     form.title.trim(),
        courseId:                  form.courseId,
        sessionType:               form.sessionType,
        startTime:                 startISO,
        endTime:                   endISO,
        minAttendancePercent:      form.minAttendancePercent,
        qrExpiryMinutes:           form.qrExpiryMinutes === 0 ? 9999 : form.qrExpiryMinutes,
        qrRotationEnabled:         form.qrRotationEnabled,
        qrRotationIntervalSeconds: form.qrRotationIntervalSeconds,
      };

      if (form.sessionType === 'physical') {
        body.gpsRequired = form.gpsRequired;
        if (form.gpsRequired) {
          body.gpsLat    = form.gpsLat;
          body.gpsLng    = form.gpsLng;
          body.gpsRadius = form.gpsRadius;
        }
      }

      const url    = isEdit ? apiEndpoint(`/api/sessions/${editSession!.id}`) : apiEndpoint('/api/sessions');
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method, headers: getAuthHeaders(), credentials: 'include', body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Failed (${res.status})`);

      setToast({ type: 'success', msg: isEdit ? 'Session updated!' : 'Session created!' });
      setTimeout(() => { onSuccess(); onClose(); }, 850);
    } catch (err: any) {
      setToast({ type: 'error', msg: err.message || 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-[520px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{ background: '#141928', border: '1px solid rgba(255,255,255,0.08)' }}
          >

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Gold circle icon */}
                  <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-black font-black">add</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">
                      {isEdit ? 'Edit Session' : 'Create New Session'}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Step 1 of 2: Configure {form.sessionType === 'physical' ? 'Physical' : 'Online'} Session Details</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* ── Toast ─────────────────────────────────────────────── */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b ${
                    toast.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {toast.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  {toast.msg}
                  <button onClick={() => setToast(null)} className="ml-auto opacity-60 hover:opacity-100">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Scrollable body ───────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Session Mode */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Session Mode
                </label>
                <div className="flex gap-2">
                  {(['physical', 'online'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch('sessionType', t)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        form.sessionType === t
                          ? 'text-black'
                          : 'border text-white/50 hover:text-white/80'
                      }`}
                      style={
                        form.sessionType === t
                          ? { background: '#f59e0b', border: 'none' }
                          : { background: 'transparent', borderColor: 'rgba(255,255,255,0.12)' }
                      }
                    >
                      <span className={`material-symbols-outlined text-[17px] ${form.sessionType === t ? 'text-black' : 'text-white/30'}`}>
                        {t === 'physical' ? 'location_on' : 'videocam'}
                      </span>
                      {t === 'physical' ? 'Physical' : 'Online'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title + Course */}
              <div className="grid grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="s-title" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Session Title
                  </label>
                  <input
                    id="s-title"
                    type="text"
                    value={form.title}
                    onChange={e => patch('title', e.target.value)}
                    placeholder="e.g., Intro to Quantum Computing – Lab..."
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-all focus:ring-1"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: errors.title ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  {errors.title && <p className="text-[11px] text-red-400">{errors.title}</p>}
                </div>
                {/* Course */}
                <div className="space-y-1.5">
                  <label htmlFor="s-course" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Course Selection
                  </label>
                  <div className="relative">
                    <select
                      id="s-course"
                      value={form.courseId}
                      onChange={e => patch('courseId', e.target.value)}
                      className="w-full rounded-lg px-3.5 py-2.5 pr-8 text-sm text-white outline-none appearance-none cursor-pointer transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: errors.courseId ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <option value="" className="bg-[#1e2740]">Select course…</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#1e2740]">{c.title}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <span className="material-symbols-outlined text-[16px]" style={{ color: 'rgba(255,255,255,0.3)' }}>expand_more</span>
                    </span>
                  </div>
                  {errors.courseId && <p className="text-[11px] text-red-400">{errors.courseId}</p>}
                </div>
              </div>

              {/* Date / Start / End */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="s-date" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Session Date
                  </label>
                  <input
                    id="s-date"
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => patch('date', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: errors.date ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      colorScheme: 'dark',
                    }}
                  />
                  {errors.date && <p className="text-[11px] text-red-400">{errors.date}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="s-start" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Start Time
                  </label>
                  <input
                    id="s-start"
                    type="time"
                    value={form.startTime}
                    onChange={e => patch('startTime', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: errors.startTime ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      colorScheme: 'dark',
                    }}
                  />
                  {errors.startTime && <p className="text-[11px] text-red-400">{errors.startTime}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="s-end" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    End Time
                  </label>
                  <input
                    id="s-end"
                    type="time"
                    value={form.endTime}
                    onChange={e => patch('endTime', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: errors.endTime ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      colorScheme: 'dark',
                    }}
                  />
                  {errors.endTime && <p className="text-[11px] text-red-400">{errors.endTime}</p>}
                </div>
              </div>

              {/* ── PHYSICAL-SPECIFIC ──────────────────────────────── */}
              {form.sessionType === 'physical' && (
                <>
                  {/* GPS Card */}
                  <div
                    className="rounded-xl p-4 space-y-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {/* GPS header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}>
                          <span className="material-symbols-outlined text-[20px] text-amber-400">shield</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Location Security (GPS)</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Restrict attendance to a specific location</p>
                        </div>
                      </div>
                      <Toggle id="gps-toggle" checked={form.gpsRequired} onChange={v => patch('gpsRequired', v)} />
                    </div>

                    {/* GPS status / radius */}
                    <AnimatePresence>
                      {form.gpsRequired && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          {/* GPS status banner */}
                          {gpsStatus === 'loading' && (
                            <div className="flex items-center gap-2 text-xs text-amber-400/80">
                              <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                              Detecting your location…
                            </div>
                          )}
                          {gpsStatus === 'ok' && form.gpsLat !== null && (
                            <div className="flex items-center gap-2 text-xs text-emerald-400">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Location acquired ({form.gpsLat.toFixed(4)}, {form.gpsLng?.toFixed(4)})
                            </div>
                          )}
                          {gpsStatus === 'denied' && (
                            <div className="rounded-lg p-3 flex items-start gap-2"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                              <span className="material-symbols-outlined text-[16px] text-red-400 mt-0.5">location_off</span>
                              <p className="text-xs text-red-400">
                                Location access denied. Enable it in your browser settings, or disable GPS to proceed.
                              </p>
                            </div>
                          )}
                          {errors.gps && (
                            <p className="text-[11px] text-red-400">{errors.gps}</p>
                          )}

                          {/* Radius slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>GPS Radius Limitation</span>
                              <span className="text-sm font-bold text-amber-400">{form.gpsRadius}m</span>
                            </div>
                            <div className="relative py-1">
                              <input
                                type="range"
                                min={50}
                                max={500}
                                step={10}
                                value={form.gpsRadius}
                                onChange={e => patch('gpsRadius', Number(e.target.value))}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                                  [&::-webkit-slider-thumb]:appearance-none
                                  [&::-webkit-slider-thumb]:h-4
                                  [&::-webkit-slider-thumb]:w-4
                                  [&::-webkit-slider-thumb]:rounded-full
                                  [&::-webkit-slider-thumb]:bg-amber-400
                                  [&::-webkit-slider-thumb]:shadow-md
                                  [&::-webkit-slider-thumb]:cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, #f59e0b ${((form.gpsRadius - 50) / 450) * 100}%, rgba(255,255,255,0.12) ${((form.gpsRadius - 50) / 450) * 100}%)`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] uppercase tracking-wider font-medium"
                              style={{ color: 'rgba(255,255,255,0.25)' }}>
                              <span>50m (strict)</span>
                              <span>500m (relaxed)</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* QR Code Expiry & Dynamic QR Rotation side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* QR Expiry */}
                    <div className="space-y-1.5">
                      <label htmlFor="qr-expiry" className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        QR Code Expiry
                      </label>
                      <div className="relative">
                        <select
                          id="qr-expiry"
                          value={form.qrExpiryMinutes}
                          onChange={e => patch('qrExpiryMinutes', Number(e.target.value))}
                          className="w-full rounded-lg pl-3.5 pr-8 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <option value={0} className="bg-[#1e2740]">Never (Always valid)</option>
                          <option value={5} className="bg-[#1e2740]">5 minutes</option>
                          <option value={10} className="bg-[#1e2740]">10 minutes</option>
                          <option value={15} className="bg-[#1e2740]">15 minutes</option>
                          <option value={30} className="bg-[#1e2740]">30 minutes</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          <span className="material-symbols-outlined text-[16px]" style={{ color: 'rgba(255,255,255,0.25)' }}>timer</span>
                        </span>
                      </div>
                    </div>

                    {/* Dynamic QR Rotation */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          Dynamic QR Rotation
                        </label>
                        <div className="relative group cursor-help">
                          <span className="material-symbols-outlined text-[13px]" style={{ color: 'rgba(255,255,255,0.25)' }}>info</span>
                          <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-3 rounded-xl text-[11px] leading-relaxed z-20 pointer-events-none"
                            style={{ background: '#1e2740', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                            QR code regenerates at set intervals, preventing students from sharing it with absent peers.
                          </div>
                        </div>
                        <div className="ml-auto">
                          <Toggle id="qr-rotation" checked={form.qrRotationEnabled} onChange={v => patch('qrRotationEnabled', v)} />
                        </div>
                      </div>
                      {/* Interval select — always shown but disabled if rotation off */}
                      <div className="relative">
                        <select
                          id="qr-interval"
                          value={form.qrRotationIntervalSeconds}
                          onChange={e => patch('qrRotationIntervalSeconds', Number(e.target.value))}
                          disabled={!form.qrRotationEnabled}
                          className="w-full rounded-lg pl-3.5 pr-8 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          <option value={15} className="bg-[#1e2740]">Every 15 Seconds</option>
                          <option value={30} className="bg-[#1e2740]">Every 30 Seconds</option>
                          <option value={60} className="bg-[#1e2740]">Every 60 Seconds</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                          <span className="material-symbols-outlined text-[16px]" style={{ color: 'rgba(255,255,255,0.25)' }}>sync</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── ONLINE-SPECIFIC ───────────────────────────────── */}
              {form.sessionType === 'online' && (
                <div
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(96,165,250,0.22)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.26)' }}>
                    <span className="material-symbols-outlined text-[20px] text-blue-300">video_call</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Zoom meeting will be created automatically</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Acadize will create and store the Zoom meeting links when you save this online session. Students will join from Acadize so attendance can be matched to their account.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div
              className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-black disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                style={{ background: '#f59e0b', boxShadow: '0 4px 20px -4px rgba(245,158,11,0.5)' }}
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Saving…
                  </>
                ) : (
                  <>
                    {isEdit ? 'Update Session' : 'Save Session'}
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  </>
                )}
              </motion.button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
