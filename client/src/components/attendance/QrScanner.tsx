/**
 * QrScanner.tsx
 * Full-screen mobile QR code scanner for LMS attendance.
 *
 * Flow:
 *   requesting_permission → scanning → (gps_loading?) → validating → success | error | already_checked_in
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import './QrScanner.css';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AttendanceRecord {
    attendanceId: string;
    sessionId: string;
    message: string;
    gpsValid?: boolean;
}

interface QrPayload {
    /** token */
    t: string;
    /** sessionId */
    s: string;
    /** timestamp */
    ts: number;
}

type ScanState =
    | 'requesting_permission'
    | 'scanning'
    | 'validating'
    | 'gps_loading'
    | 'success'
    | 'error'
    | 'already_checked_in'
    | 'camera_unavailable';

interface QrScannerProps {
    onClose: () => void;
    onSuccess: (attendance: AttendanceRecord) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const QR_READER_ID = 'qr-reader';
const GPS_TIMEOUT_MS = 10_000;
const SUCCESS_REDIRECT_MS = 3_000;

// ─────────────────────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────────────────────

function vibrate(pattern: number | number[]) {
    try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Animated corner brackets for the viewfinder */
const ViewfinderCorners: React.FC<{ active: boolean }> = ({ active }) => (
    <div className={`absolute inset-0 pointer-events-none ${active ? 'qr-corners-active' : ''}`}>
        {/* top-left */}
        <span className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg" />
        {/* top-right */}
        <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg" />
        {/* bottom-left */}
        <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg" />
        {/* bottom-right */}
        <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-primary rounded-br-lg" />
    </div>
);

/** Spinning loader circle */
const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 40, color = '#F2D00D' }) => (
    <svg
        className="qr-spinner"
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
    >
        <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle
            cx="20" cy="20" r="16"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="75 25"
        />
    </svg>
);

/** Success state */
const SuccessView: React.FC<{ record: AttendanceRecord; countdown: number }> = ({ record, countdown }) => {
    const circumference = 2 * Math.PI * 14; // ≈ 87.96
    const offset = circumference * (1 - countdown / (SUCCESS_REDIRECT_MS / 1000));

    return (
        <div className="qr-state-enter flex flex-col items-center gap-6 px-6 text-center">
            {/* Ring + check */}
            <div className="relative qr-success-container">
                <div className="qr-success-ring w-28 h-28 rounded-full bg-emerald-500/15 ring-4 ring-emerald-400 flex items-center justify-center">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-label="Success">
                        <path
                            className="qr-check-path"
                            d="M14 29l10 10 18-18"
                            stroke="#4ade80"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                {/* Countdown ring */}
                <svg
                    className="absolute inset-0 -rotate-90"
                    width="112" height="112" viewBox="0 0 32 32"
                    aria-hidden="true"
                >
                    <circle
                        cx="16" cy="16" r="14"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Attendance Recorded!</h2>
                <p className="text-sm text-slate-400">{record.message}</p>
            </div>

            {record.gpsValid !== undefined && (
                <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full ${
                    record.gpsValid
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                }`}>
                    <span>{record.gpsValid ? '📍 Location verified' : '⚠️ Location not verified'}</span>
                </div>
            )}

            <p className="text-xs text-slate-500">
                Redirecting in {countdown}s…
            </p>
        </div>
    );
};

/** Error state */
const ErrorView: React.FC<{
    message: string;
    isAlreadyCheckedIn?: boolean;
    onRetry: () => void;
    onClose: () => void;
}> = ({ message, isAlreadyCheckedIn, onRetry, onClose }) => (
    <div className="qr-state-enter qr-error-shake flex flex-col items-center gap-6 px-6 text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ring-4 ${
            isAlreadyCheckedIn
                ? 'bg-blue-500/15 ring-blue-400'
                : 'bg-red-500/15 ring-red-400'
        }`}>
            {isAlreadyCheckedIn ? (
                /* Info icon */
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-label="Already checked in">
                    <circle cx="12" cy="12" r="10" stroke="#60a5fa" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                </svg>
            ) : (
                /* X icon */
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-label="Error">
                    <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2" />
                    <path d="M15 9l-6 6M9 9l6 6" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            )}
        </div>

        <div>
            <h2 className="text-xl font-bold text-white mb-2">
                {isAlreadyCheckedIn ? "Already Checked In" : "Scan Failed"}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
            {!isAlreadyCheckedIn && (
                <button
                    id="qr-retry-btn"
                    onClick={onRetry}
                    className="w-full h-14 rounded-2xl bg-primary text-navy-950 font-bold text-base active:scale-95 transition-transform shadow-lg shadow-primary/20"
                >
                    Try Again
                </button>
            )}
            <button
                id="qr-close-after-error-btn"
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-white/8 text-slate-300 font-medium text-sm border border-white/10 active:scale-95 transition-transform"
            >
                {isAlreadyCheckedIn ? 'Go Back' : 'Cancel'}
            </button>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const QrScanner: React.FC<QrScannerProps> = ({ onClose, onSuccess }) => {
    const [state, setState] = useState<ScanState>('requesting_permission');
    const [errorMsg, setErrorMsg] = useState('');
    const [isAlreadyCheckedIn, setIsAlreadyCheckedIn] = useState(false);
    const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);
    const [redirectCountdown, setRedirectCountdown] = useState(SUCCESS_REDIRECT_MS / 1000);

    // Track whether we are actively scanning (to ignore decoded events after pause)
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isScanningRef = useRef(false);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── tear down camera ───────────────────────────────────────────────────
    const stopCamera = useCallback(async () => {
        isScanningRef.current = false;
        if (scannerRef.current) {
            try {
                const scanState = scannerRef.current.getState();
                if (
                    scanState === Html5QrcodeScannerState.SCANNING ||
                    scanState === Html5QrcodeScannerState.PAUSED
                ) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
            } catch {
                /* ignore teardown errors */
            }
            scannerRef.current = null;
        }
    }, []);

    // ── clean up on unmount ────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stopCamera();
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [stopCamera]);

    // ── success redirect countdown ─────────────────────────────────────────
    const startCountdown = useCallback((record: AttendanceRecord) => {
        setRedirectCountdown(SUCCESS_REDIRECT_MS / 1000);
        countdownRef.current = setInterval(() => {
            setRedirectCountdown((c) => {
                if (c <= 1) {
                    clearInterval(countdownRef.current!);
                    onSuccess(record);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    }, [onSuccess]);

    // ── GPS acquisition ────────────────────────────────────────────────────
    const getGpsCoords = (): Promise<{ gpsLat: number; gpsLng: number } | null> =>
        new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ gpsLat: pos.coords.latitude, gpsLng: pos.coords.longitude }),
                () => resolve(null),
                { timeout: GPS_TIMEOUT_MS, enableHighAccuracy: true, maximumAge: 0 },
            );
        });

    // ── API call ───────────────────────────────────────────────────────────
    const submitScan = useCallback(async (payload: QrPayload) => {
        setState('gps_loading');

        // Always try GPS — backend ignores it if not required for the session
        const gps = await getGpsCoords();

        setState('validating');

        try {
            const body: Record<string, unknown> = {
                token: payload.t,
                sessionId: payload.s,
            };
            if (gps) {
                body.gpsLat = gps.gpsLat;
                body.gpsLng = gps.gpsLng;
            }

            const { apiEndpoint } = await import('@/lib/config');
            const { apiRequest } = await import('@/lib/api-client');

            const data = await apiRequest<{ success?: boolean; attendanceId?: string; message?: string; gpsValid?: boolean; code?: string }>(
                apiEndpoint('/api/attendance/scan'),
                { method: 'POST', body: JSON.stringify(body) }
            );

            if (data.success) {
                vibrate([80, 50, 80]);
                const record: AttendanceRecord = {
                    attendanceId: data.attendanceId,
                    sessionId: payload.s,
                    message: data.message,
                    gpsValid: data.gpsValid,
                };
                setSuccessRecord(record);
                setState('success');
                startCountdown(record);
                return;
            }

            // Differentiate known errors (apiRequest throws on non-2xx, so we only get here if success was false)
            const code: string = data.code ?? '';
            const msg: string = data.message ?? 'Something went wrong. Please try again.';

            if (code === 'ALREADY_CHECKED_IN') {
                vibrate(200);
                setIsAlreadyCheckedIn(true);
                setState('already_checked_in');
                setErrorMsg(msg);
                return;
            }

            vibrate([200, 100, 200]);
            setIsAlreadyCheckedIn(false);
            setErrorMsg(msg);
            setState('error');
        } catch {
            vibrate([200, 100, 200]);
            setErrorMsg('Network error. Check your connection and try again.');
            setState('error');
        }
    }, [startCountdown]);

    // ── QR decode callback ─────────────────────────────────────────────────
    const handleDecode = useCallback(async (decodedText: string) => {
        if (!isScanningRef.current) return;
        isScanningRef.current = false;

        vibrate(60); // light buzz on successful read

        let payload: QrPayload;
        try {
            payload = JSON.parse(decodedText);
            if (!payload.t || !payload.s) throw new Error('bad payload');
        } catch {
            setErrorMsg('Invalid QR code format. Please scan a valid session QR code.');
            setState('error');
            return;
        }

        // Sanity: reject QR older than 15 minutes
        if (payload.ts && Date.now() - payload.ts > 15 * 60 * 1000) {
            setErrorMsg('This QR code has expired. Ask your teacher to display a new one.');
            setState('error');
            return;
        }

        // Pause camera — keeps the stream alive so we can restart on retry
        try { scannerRef.current?.pause(true); } catch { /* ignore */ }

        await submitScan(payload);
    }, [submitScan]);

    // ── Start camera & scanning ────────────────────────────────────────────
    const startScanning = useCallback(async () => {
        setState('scanning');
        setErrorMsg('');

        // Small delay so the DOM element is definitely mounted
        await new Promise((r) => setTimeout(r, 80));

        try {
            const el = document.getElementById(QR_READER_ID);
            if (!el) throw new Error('QR reader element missing.');

            const scanner = new Html5Qrcode(QR_READER_ID, { verbose: false });
            scannerRef.current = scanner;

            const config = {
                fps: 12,
                qrbox: { width: 260, height: 260 },
                aspectRatio: 1.333,
                disableFlip: false,
                formatsToSupport: [0 /* QR_CODE */],
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                handleDecode,
                (_errorMessage: string, _error: unknown) => { /* suppress per-frame decode errors */ },
            );

            isScanningRef.current = true;
        } catch (err: any) {
            const msg: string = err?.message ?? String(err);
            if (
                msg.toLowerCase().includes('permission') ||
                msg.toLowerCase().includes('denied') ||
                msg.toLowerCase().includes('notallowed')
            ) {
                setState('requesting_permission');
            } else if (
                msg.toLowerCase().includes('notfound') ||
                msg.toLowerCase().includes('no camera') ||
                msg.toLowerCase().includes('could not start')
            ) {
                setState('camera_unavailable');
            } else {
                setErrorMsg(`Camera error: ${msg}`);
                setState('error');
            }
        }
    }, [handleDecode]);

    // ── Retry: stop, reset, restart ────────────────────────────────────────
    const handleRetry = useCallback(async () => {
        setIsAlreadyCheckedIn(false);
        setErrorMsg('');
        await stopCamera();
        await startScanning();
    }, [stopCamera, startScanning]);

    // ── Request camera permission then start ──────────────────────────────
    const requestPermission = useCallback(async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            await startScanning();
        } catch {
            setState('requesting_permission'); // still denied
        }
    }, [startScanning]);

    // ── Bottom status text ─────────────────────────────────────────────────
    const statusText = (): { text: string; color: string } => {
        switch (state) {
            case 'requesting_permission': return { text: 'Camera access required', color: 'text-amber-400' };
            case 'scanning':              return { text: 'Point camera at QR code', color: 'text-slate-300' };
            case 'gps_loading':           return { text: 'Verifying your location…', color: 'text-blue-400' };
            case 'validating':            return { text: 'Recording attendance…', color: 'text-primary' };
            case 'success':               return { text: 'Attendance Recorded!', color: 'text-emerald-400' };
            case 'error':                 return { text: 'Scan failed', color: 'text-red-400' };
            case 'already_checked_in':    return { text: 'Already checked in', color: 'text-blue-400' };
            case 'camera_unavailable':    return { text: 'Camera unavailable', color: 'text-amber-400' };
            default:                      return { text: '', color: '' };
        }
    };

    const { text: statusLabel, color: statusColor } = statusText();
    const showViewfinder = state === 'scanning' || state === 'validating' || state === 'gps_loading';
    const showOverlay = state !== 'scanning';

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-navy-950 overflow-hidden"
            style={{ fontFamily: "'Lexend', sans-serif" }}
        >
            {/* ── Top bar ──────────────────────────────────────────────── */}
            <div className="qr-topbar relative z-20 flex items-center justify-between px-4 py-3 safe-top">
                <button
                    id="qr-back-btn"
                    onClick={async () => { await stopCamera(); onClose(); }}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/8 border border-white/10 text-white active:scale-90 transition-transform"
                    aria-label="Go back"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <div className="text-center">
                    <h1 className="text-base font-bold text-white leading-tight">Scan Session QR</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Smart Attendance</p>
                </div>

                {/* Right side — torch placeholder (keeps layout symmetric) */}
                <div className="w-11 h-11" aria-hidden="true" />
            </div>

            {/* ── Camera + viewfinder area ──────────────────────────────── */}
            <div className="relative flex-1 overflow-hidden">
                {/* html5-qrcode render target */}
                <div
                    id={QR_READER_ID}
                    className={`absolute inset-0 ${showViewfinder ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    aria-hidden={!showViewfinder}
                />

                {/* Vignette overlay — always present */}
                {showViewfinder && (
                    <div className="qr-overlay-gradient absolute inset-0 pointer-events-none z-10" aria-hidden="true" />
                )}

                {/* Viewfinder box */}
                {showViewfinder && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                        <div className="relative" style={{ width: 264, height: 264 }}>
                            {/* Dimming outside the finder */}
                            <ViewfinderCorners active={state === 'scanning'} />

                            {/* Scanning beam — only when actively scanning */}
                            {state === 'scanning' && (
                                <div
                                    className="qr-scan-beam absolute left-2 right-2 h-0.5 rounded-full z-10"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent, #F2D00D, transparent)',
                                        boxShadow: '0 0 12px 2px rgba(242,208,13,0.6)',
                                    }}
                                    aria-hidden="true"
                                />
                            )}

                            {/* Validating / GPS spinner overlay inside finder */}
                            {(state === 'validating' || state === 'gps_loading') && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy-950/70 rounded-2xl backdrop-blur-sm">
                                    {state === 'gps_loading' ? (
                                        <div className="qr-location-pulse">
                                            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-label="GPS loading">
                                                <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" fill="rgba(96,165,250,0.2)" stroke="#60a5fa" strokeWidth="2" />
                                                <circle cx="12" cy="9" r="2.5" fill="#60a5fa" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <Spinner />
                                    )}
                                    <span className="text-xs font-medium text-white/80">
                                        {state === 'gps_loading' ? 'Getting location…' : 'Submitting…'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Non-scanning states (full overlay) ────────────────── */}
                {showOverlay && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-navy-950/95 backdrop-blur-md">
                        {/* requesting_permission */}
                        {state === 'requesting_permission' && (
                            <div className="qr-state-enter flex flex-col items-center gap-6 px-8 text-center">
                                <div className="w-24 h-24 rounded-full bg-amber-500/15 ring-4 ring-amber-400 flex items-center justify-center">
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-label="Camera">
                                        <rect x="3" y="6" width="18" height="14" rx="2" stroke="#fbbf24" strokeWidth="2" />
                                        <circle cx="12" cy="13" r="3" stroke="#fbbf24" strokeWidth="2" />
                                        <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="#fbbf24" strokeWidth="2" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-2">Camera Access Needed</h2>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Allow camera access to scan the session QR code and record your attendance.
                                    </p>
                                </div>
                                <button
                                    id="qr-allow-camera-btn"
                                    onClick={requestPermission}
                                    className="w-full max-w-xs h-14 rounded-2xl bg-primary text-navy-950 font-bold text-base active:scale-95 transition-transform shadow-lg shadow-primary/20"
                                >
                                    Allow Camera Access
                                </button>
                                <button
                                    id="qr-cancel-permission-btn"
                                    onClick={onClose}
                                    className="text-sm text-slate-500 underline-offset-2 hover:underline"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* camera_unavailable */}
                        {state === 'camera_unavailable' && (
                            <div className="qr-state-enter flex flex-col items-center gap-6 px-8 text-center">
                                <div className="w-24 h-24 rounded-full bg-slate-500/15 ring-4 ring-slate-400 flex items-center justify-center">
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-label="No camera">
                                        <line x1="3" y1="3" x2="21" y2="21" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                                        <path d="M6.9 6H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5M20 14V7a1 1 0 0 0-1-1h-2.9M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
                                            stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-2">Camera Unavailable</h2>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        No camera was found or it could not be started. Ask your teacher to mark you present manually.
                                    </p>
                                </div>
                                <button
                                    id="qr-camera-unavailable-close-btn"
                                    onClick={onClose}
                                    className="w-full max-w-xs h-14 rounded-2xl bg-white/8 text-slate-200 font-semibold text-base border border-white/10 active:scale-95 transition-transform"
                                >
                                    Go Back
                                </button>
                            </div>
                        )}

                        {/* success */}
                        {state === 'success' && successRecord && (
                            <SuccessView record={successRecord} countdown={redirectCountdown} />
                        )}

                        {/* error */}
                        {state === 'error' && (
                            <ErrorView
                                message={errorMsg}
                                isAlreadyCheckedIn={false}
                                onRetry={handleRetry}
                                onClose={onClose}
                            />
                        )}

                        {/* already_checked_in */}
                        {state === 'already_checked_in' && (
                            <ErrorView
                                message={errorMsg}
                                isAlreadyCheckedIn={true}
                                onRetry={handleRetry}
                                onClose={onClose}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* ── Bottom status bar ─────────────────────────────────────── */}
            <div className="qr-status-bar relative z-20 flex flex-col items-center gap-1.5 px-6 py-4 safe-bottom">
                {/* State indicator dot + label */}
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-block w-2 h-2 rounded-full ${
                            state === 'scanning'           ? 'bg-emerald-400 animate-pulse' :
                            state === 'validating'         ? 'bg-primary animate-pulse' :
                            state === 'gps_loading'        ? 'bg-blue-400 animate-pulse' :
                            state === 'success'            ? 'bg-emerald-400' :
                            state === 'error'              ? 'bg-red-400' :
                            state === 'already_checked_in' ? 'bg-blue-400' :
                                                             'bg-slate-500'
                        }`}
                    />
                    <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
                </div>

                {/* Hint text */}
                {state === 'scanning' && (
                    <p className="text-xs text-slate-600 text-center">
                        Hold steady — the QR code will scan automatically
                    </p>
                )}
                {state === 'success' && (
                    <p className="text-xs text-slate-600 text-center">
                        Redirecting to dashboard in {redirectCountdown}s
                    </p>
                )}
            </div>
        </div>
    );
};

export default QrScanner;
