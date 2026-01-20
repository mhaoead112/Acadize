import { useState, useRef, useCallback } from 'react';
// ============================================================================
// TYPES
// ============================================================================

export interface UseScreenRecordingReturn {
    isRecording: boolean;
    isSupported: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    error: string | null;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Custom hook for managing screen recording during exams
 * Uses MediaRecorder API with chunked recording for reliability
 * 
 * @param attemptId - Exam attempt ID for organizing recordings
 * @param onChunkReady - Callback when a recording chunk is ready for upload
 * @returns Recording controls and state
 */
export function useScreenRecording(
    attemptId: string,
    onChunkReady?: (chunk: Blob, chunkIndex: number) => void
): UseScreenRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSupported] = useState(() => {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const chunkIndexRef = useRef(0);

    /**
     * Start screen recording
     * Requests screen share permission and begins recording
     */
    const startRecording = useCallback(async () => {
        if (!isSupported) {
            setError('Screen recording is not supported in this browser');
            return;
        }

        if (isRecording) {
            console.warn('[RECORDING] Already recording');
            return;
        }

        try {
            // Request screen capture permission
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: false // Don't capture audio for privacy
            });

            streamRef.current = stream;

            // Create MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
                ? 'video/webm; codecs=vp9'
                : 'video/webm';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            // Handle data available (chunks)
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);

                    // If callback provided, send chunk for upload
                    if (onChunkReady) {
                        const chunkIndex = chunkIndexRef.current++;
                        onChunkReady(event.data, chunkIndex);
                    }
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = () => {
                console.log('[RECORDING] Recording stopped');
                setIsRecording(false);

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            // Handle errors
            mediaRecorder.onerror = (event: any) => {
                console.error('[RECORDING] MediaRecorder error:', event.error);
                setError(event.error?.message || 'Recording error occurred');
                setIsRecording(false);
            };

            // Start recording with 5-minute chunks
            // This prevents memory issues and allows progressive upload
            mediaRecorder.start(5 * 60 * 1000); // 5 minutes in milliseconds

            setIsRecording(true);
            setError(null);

            console.log('[RECORDING] Screen recording started for attempt:', attemptId);

            // Handle user stopping the share via browser UI
            stream.getVideoTracks()[0].onended = () => {
                console.log('[RECORDING] User stopped screen share');
                stopRecording();
            };

        } catch (err: any) {
            console.error('[RECORDING] Failed to start recording:', err);

            if (err.name === 'NotAllowedError') {
                setError('Screen recording permission denied');
            } else if (err.name === 'NotFoundError') {
                setError('No screen available to record');
            } else {
                setError(err.message || 'Failed to start recording');
            }

            setIsRecording(false);
        }
    }, [isSupported, isRecording, attemptId, onChunkReady]);

    /**
     * Stop screen recording
     * Returns the complete recording as a Blob
     */
    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        if (!mediaRecorderRef.current || !isRecording) {
            console.warn('[RECORDING] Not currently recording');
            return null;
        }

        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current!;

            // Override onstop to resolve with final blob
            mediaRecorder.onstop = () => {
                console.log('[RECORDING] Recording stopped, creating final blob');
                setIsRecording(false);

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // Create final blob from all chunks
                if (chunksRef.current.length > 0) {
                    const finalBlob = new Blob(chunksRef.current, {
                        type: mediaRecorder.mimeType
                    });

                    console.log('[RECORDING] Final recording size:', (finalBlob.size / 1024 / 1024).toFixed(2), 'MB');

                    resolve(finalBlob);
                } else {
                    resolve(null);
                }

                // Clear chunks
                chunksRef.current = [];
                chunkIndexRef.current = 0;
            };

            // Stop the recorder
            mediaRecorder.stop();
        });
    }, [isRecording]);

    return {
        isRecording,
        isSupported,
        startRecording,
        stopRecording,
        error,
    };
}

export default useScreenRecording;
