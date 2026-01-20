import { useState, useRef, useCallback, useEffect } from 'react';
import { loadFaceDetectionModels, detectFaces, areModelsLoaded, FaceDetectionResult } from '@/lib/face-detection';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';

// ============================================================================
// TYPES
// ============================================================================

export interface ProctoringStatus {
    status: 'initializing' | 'requesting_permission' | 'active' | 'paused' | 'error' | 'disabled';
    faceCount: number;
    isLookingAway: boolean;
    isFaceOutOfFrame: boolean;
    headPose?: { yaw: number; pitch: number; roll: number };
    lastDetection: Date | null;
    errorMessage: string | null;
    violationCount: number;
}

export interface ProctoringEvent {
    type: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface UseWebcamProctoringReturn {
    status: ProctoringStatus;
    webcamRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    startProctoring: () => Promise<boolean>;
    stopProctoring: () => void;
    pauseProctoring: () => void;
    resumeProctoring: () => void;
    isSupported: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DETECTION_INTERVAL_MS = 1000; // Check every 1 second (faster response)
const NO_FACE_THRESHOLD_MS = 5000; // Alert after 5 seconds of no face
const LOOKING_AWAY_THRESHOLD_MS = 4000; // Alert after 4 seconds of looking away

// ============================================================================
// HOOK
// ============================================================================

export function useWebcamProctoring(
    attemptId: string,
    enabled: boolean = true
): UseWebcamProctoringReturn {
    const { token } = useAuth();
    const webcamRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const internalVideoRef = useRef<HTMLVideoElement | null>(null); // Internal video for detection
    const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const noFaceTimerRef = useRef<Date | null>(null);
    const lookingAwayTimerRef = useRef<Date | null>(null);
    const isActiveRef = useRef(false); // Track active state for callbacks

    const [isSupported] = useState(() => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    });

    const [status, setStatus] = useState<ProctoringStatus>({
        status: 'initializing',
        faceCount: 0,
        isLookingAway: false,
        isFaceOutOfFrame: false,
        lastDetection: null,
        errorMessage: null,
        violationCount: 0,
    });

    // Send anti-cheat event to backend
    const sendEvent = useCallback(async (
        eventType: string,
        metadata?: Record<string, any>
    ) => {
        if (!token || !attemptId) return;

        try {
            await fetch(apiEndpoint('/api/anti-cheat/events'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({
                    attemptId,
                    eventType,
                    timestamp: new Date().toISOString(),
                    metadata,
                    deviceInfo: {
                        userAgent: navigator.userAgent,
                        screenResolution: `${screen.width}x${screen.height}`,
                        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
                    },
                }),
            });
        } catch (error) {
            console.error('[PROCTORING] Failed to send event:', error);
        }
    }, [token, attemptId]);

    // Run face detection
    const runDetection = useCallback(async () => {
        const videoElement = internalVideoRef.current;

        if (!videoElement || !isActiveRef.current) {
            console.log('[PROCTORING] Skipping detection - video not ready or not active, isActive:', isActiveRef.current);
            return;
        }

        // Ensure video is ready (readyState >= 2 means HAVE_CURRENT_DATA)
        if (videoElement.readyState < 2) {
            console.log('[PROCTORING] Video not ready, readyState:', videoElement.readyState);
            return;
        }

        try {
            console.log('[PROCTORING] Running face detection...');
            const result: FaceDetectionResult = await detectFaces(videoElement);
            const now = new Date();

            console.log('[PROCTORING] Detection result:', {
                faceCount: result.faceCount,
                isLookingAway: result.isLookingAway,
                isFaceOutOfFrame: result.isFaceOutOfFrame,
                headPose: result.headPose
            });

            // Update status with detection result
            setStatus(prev => ({
                ...prev,
                faceCount: result.faceCount,
                isLookingAway: result.isLookingAway,
                isFaceOutOfFrame: result.isFaceOutOfFrame,
                headPose: result.headPose,
                lastDetection: now,
            }));

            // Check for violations
            if (result.faceCount === 0) {
                // No face detected
                if (!noFaceTimerRef.current) {
                    noFaceTimerRef.current = now;
                } else if (now.getTime() - noFaceTimerRef.current.getTime() > NO_FACE_THRESHOLD_MS) {
                    // Violation: No face for too long
                    sendEvent('face_not_detected', { duration: now.getTime() - noFaceTimerRef.current.getTime() });
                    setStatus(prev => ({ ...prev, violationCount: prev.violationCount + 1 }));
                    noFaceTimerRef.current = now; // Reset timer
                }
            } else {
                noFaceTimerRef.current = null;

                // Check for multiple faces
                if (result.faceCount > 1) {
                    sendEvent('multiple_faces', { faceCount: result.faceCount });
                    setStatus(prev => ({ ...prev, violationCount: prev.violationCount + 1 }));
                }

                // Check for looking away
                if (result.isLookingAway) {
                    if (!lookingAwayTimerRef.current) {
                        lookingAwayTimerRef.current = now;
                    } else if (now.getTime() - lookingAwayTimerRef.current.getTime() > LOOKING_AWAY_THRESHOLD_MS) {
                        sendEvent('looking_away', { duration: now.getTime() - lookingAwayTimerRef.current.getTime() });
                        setStatus(prev => ({ ...prev, violationCount: prev.violationCount + 1 }));
                        lookingAwayTimerRef.current = now; // Reset timer
                    }
                } else {
                    lookingAwayTimerRef.current = null;
                }
            }
        } catch (error) {
            console.error('[PROCTORING] Detection error:', error);
        }
    }, [status.status, sendEvent]);

    // Start proctoring
    const startProctoring = useCallback(async (): Promise<boolean> => {
        if (!isSupported || !enabled) {
            setStatus(prev => ({ ...prev, status: 'disabled' }));
            return false;
        }

        try {
            setStatus(prev => ({ ...prev, status: 'initializing' }));

            // Load face detection models
            if (!areModelsLoaded()) {
                await loadFaceDetectionModels();
            }

            setStatus(prev => ({ ...prev, status: 'requesting_permission' }));

            // Request webcam permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
                audio: false,
            });

            streamRef.current = stream;

            // Create internal video element for face detection (doesn't need to be in DOM)
            const internalVideo = document.createElement('video');
            internalVideo.srcObject = stream;
            internalVideo.autoplay = true;
            internalVideo.playsInline = true;
            internalVideo.muted = true;
            internalVideo.width = 640;
            internalVideo.height = 480;
            internalVideoRef.current = internalVideo;

            // Wait for internal video to be ready
            await new Promise<void>((resolve) => {
                if (internalVideo.readyState >= 2) {
                    resolve();
                } else {
                    internalVideo.onloadeddata = () => resolve();
                }
            });
            await internalVideo.play();
            console.log('[PROCTORING] Internal video ready:', {
                readyState: internalVideo.readyState,
                videoWidth: internalVideo.videoWidth,
                videoHeight: internalVideo.videoHeight
            });

            // Also attach to external ref if available (for preview)
            if (webcamRef.current) {
                webcamRef.current.srcObject = stream;
                await webcamRef.current.play().catch(() => { });
            }

            // Send proctoring started event
            sendEvent('proctoring_started');

            // Set active ref BEFORE setting status (refs update synchronously)
            isActiveRef.current = true;

            // Set status to active
            setStatus(prev => ({
                ...prev,
                status: 'active',
                errorMessage: null,
            }));

            // Start detection interval immediately
            detectionIntervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);

            // Run first detection after a short delay for video stabilization
            setTimeout(runDetection, 1000);

            console.log('[PROCTORING] Started successfully for attempt:', attemptId);
            return true;
        } catch (error: any) {
            console.error('[PROCTORING] Failed to start:', error);

            let errorMessage = 'Failed to start proctoring';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera permission denied. Please allow camera access to continue.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera found. Please connect a camera to continue.';
            }

            setStatus(prev => ({
                ...prev,
                status: 'error',
                errorMessage,
            }));

            return false;
        }
    }, [isSupported, enabled, attemptId, sendEvent, runDetection]);

    // Stop proctoring
    const stopProctoring = useCallback(() => {
        // Mark as inactive first
        isActiveRef.current = false;

        // Stop detection interval
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        // Stop webcam stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Clear video element
        if (webcamRef.current) {
            webcamRef.current.srcObject = null;
        }

        // Clear internal video element
        if (internalVideoRef.current) {
            internalVideoRef.current.srcObject = null;
            internalVideoRef.current = null;
        }

        // Send proctoring stopped event
        sendEvent('proctoring_stopped');

        setStatus(prev => ({
            ...prev,
            status: 'disabled',
        }));

        console.log('[PROCTORING] Stopped for attempt:', attemptId);
    }, [attemptId, sendEvent]);

    // Pause proctoring (keep stream, stop detection)
    const pauseProctoring = useCallback(() => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        setStatus(prev => ({ ...prev, status: 'paused' }));
    }, []);

    // Resume proctoring
    const resumeProctoring = useCallback(() => {
        if (streamRef.current && status.status === 'paused') {
            detectionIntervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
            setStatus(prev => ({ ...prev, status: 'active' }));
        }
    }, [status.status, runDetection]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        status,
        webcamRef,
        canvasRef,
        startProctoring,
        stopProctoring,
        pauseProctoring,
        resumeProctoring,
        isSupported,
    };
}

export default useWebcamProctoring;
