/**
 * Face Detection Utility
 * Wrapper around face-api.js for exam proctoring
 * 
 * Features:
 * - Face detection with TinyFaceDetector
 * - Head pose estimation (yaw, pitch, roll)
 * - Gaze direction estimation
 * - Face position tracking (centered in frame)
 */
import * as faceapi from 'face-api.js';

// ============================================================================
// TYPES
// ============================================================================

export interface FaceDetectionResult {
    faceCount: number;
    isLookingAway: boolean;
    isFaceOutOfFrame: boolean;
    confidence: number;
    headPose?: HeadPose;
    facePosition?: FacePosition;
    landmarks?: faceapi.FaceLandmarks68;
    timestamp: Date;
}

export interface HeadPose {
    yaw: number;    // Left/right rotation (-1 to 1, 0 = centered)
    pitch: number;  // Up/down rotation (-1 to 1, 0 = centered)
    roll: number;   // Head tilt (-1 to 1, 0 = level)
}

export interface FacePosition {
    centerX: number;  // 0 to 1 (0.5 = centered horizontally)
    centerY: number;  // 0 to 1 (0.5 = centered vertically)
    size: number;     // Relative face size (0 to 1)
    isCentered: boolean;
    isTooFar: boolean;
    isTooClose: boolean;
}

export interface FaceDetectionConfig {
    scoreThreshold: number;
    inputSize: number;
    enableLandmarks: boolean;
    // Gaze detection thresholds
    gazeYawThreshold: number;      // Max allowed yaw before "looking away"
    gazePitchThreshold: number;    // Max allowed pitch before "looking away"
    facePositionThreshold: number; // How far from center is acceptable
    minFaceSize: number;           // Minimum face size (0-1)
    maxFaceSize: number;           // Maximum face size (0-1)
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: FaceDetectionConfig = {
    scoreThreshold: 0.25,  // Lower threshold for better detection with glasses
    inputSize: 320,        // Medium input - balance of speed and accuracy
    enableLandmarks: true,
    gazeYawThreshold: 0.50,      // Allow 50% head turn before flagging (more tolerant)
    gazePitchThreshold: 0.45,    // Allow 45% up/down before flagging
    facePositionThreshold: 0.45, // Face can be 45% off-center
    minFaceSize: 0.05,           // Face should be at least 5% of frame
    maxFaceSize: 0.85,           // Face shouldn't be more than 85% of frame
};

const MODEL_URL = '/models/face-api';

// ============================================================================
// STATE
// ============================================================================

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

// Smoothing buffer for reducing false positives
const gazeHistory: boolean[] = [];
const GAZE_HISTORY_SIZE = 2; // Require 2 consecutive lookaway frames (faster response)

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Load face detection models
 * Downloads TinyFaceDetector and optional landmark models
 */
export async function loadFaceDetectionModels(): Promise<void> {
    if (modelsLoaded) {
        return;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            console.log('[FACE-DETECTION] Loading models from:', MODEL_URL);

            // Load TinyFaceDetector (fastest, smallest model)
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            console.log('[FACE-DETECTION] TinyFaceDetector loaded');

            // Load face landmark model for gaze detection
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            console.log('[FACE-DETECTION] FaceLandmark68Net loaded');

            modelsLoaded = true;
            console.log('[FACE-DETECTION] All models loaded successfully');
        } catch (error) {
            console.error('[FACE-DETECTION] Failed to load models:', error);
            loadingPromise = null;
            throw error;
        }
    })();

    return loadingPromise;
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
    return modelsLoaded;
}

/**
 * Detect faces in a video element
 * Returns detection results including face count, gaze, and head pose
 */
export async function detectFaces(
    videoElement: HTMLVideoElement,
    config: Partial<FaceDetectionConfig> = {}
): Promise<FaceDetectionResult> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    if (!modelsLoaded) {
        throw new Error('Face detection models not loaded. Call loadFaceDetectionModels() first.');
    }

    if (!videoElement || videoElement.readyState < 2) {
        return {
            faceCount: 0,
            isLookingAway: false,
            isFaceOutOfFrame: true,
            confidence: 0,
            timestamp: new Date(),
        };
    }

    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: mergedConfig.inputSize,
            scoreThreshold: mergedConfig.scoreThreshold,
        });

        // Detect all faces with landmarks
        const detections = await faceapi
            .detectAllFaces(videoElement, options)
            .withFaceLandmarks();

        const faceCount = detections.length;
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;

        // Default result
        let isLookingAway = false;
        let isFaceOutOfFrame = faceCount === 0;
        let confidence = 0;
        let headPose: HeadPose | undefined;
        let facePosition: FacePosition | undefined;
        let landmarks: faceapi.FaceLandmarks68 | undefined;

        if (faceCount > 0) {
            const primaryFace = detections[0];
            confidence = primaryFace.detection.score;
            landmarks = primaryFace.landmarks;
            const box = primaryFace.detection.box;

            // Calculate face position in frame
            facePosition = calculateFacePosition(box, videoWidth, videoHeight, mergedConfig);
            isFaceOutOfFrame = !facePosition.isCentered || facePosition.isTooFar;

            // Estimate head pose from landmarks
            if (landmarks) {
                headPose = estimateHeadPose(landmarks, videoWidth, videoHeight);

                // Determine if looking away based on head pose
                const rawLookingAway =
                    Math.abs(headPose.yaw) > mergedConfig.gazeYawThreshold ||
                    Math.abs(headPose.pitch) > mergedConfig.gazePitchThreshold;

                // Apply smoothing to reduce false positives
                isLookingAway = smoothGazeDetection(rawLookingAway);
            }
        } else {
            // No face detected - clear gaze history
            gazeHistory.length = 0;
        }

        console.log('[FACE-DETECTION] Result:', {
            faceCount,
            isLookingAway,
            isFaceOutOfFrame,
            confidence: confidence.toFixed(2),
            headPose: headPose ? {
                yaw: headPose.yaw.toFixed(2),
                pitch: headPose.pitch.toFixed(2)
            } : null
        });

        return {
            faceCount,
            isLookingAway,
            isFaceOutOfFrame,
            confidence,
            headPose,
            facePosition,
            landmarks,
            timestamp: new Date(),
        };
    } catch (error) {
        console.error('[FACE-DETECTION] Detection error:', error);
        return {
            faceCount: 0,
            isLookingAway: false,
            isFaceOutOfFrame: true,
            confidence: 0,
            timestamp: new Date(),
        };
    }
}

/**
 * Calculate face position relative to frame
 */
function calculateFacePosition(
    box: faceapi.Box,
    videoWidth: number,
    videoHeight: number,
    config: FaceDetectionConfig
): FacePosition {
    const centerX = (box.x + box.width / 2) / videoWidth;
    const centerY = (box.y + box.height / 2) / videoHeight;
    const size = Math.max(box.width / videoWidth, box.height / videoHeight);

    const isCentered =
        Math.abs(centerX - 0.5) < config.facePositionThreshold &&
        Math.abs(centerY - 0.5) < config.facePositionThreshold;

    const isTooFar = size < config.minFaceSize;
    const isTooClose = size > config.maxFaceSize;

    return {
        centerX,
        centerY,
        size,
        isCentered,
        isTooFar,
        isTooClose,
    };
}

/**
 * Estimate head pose (yaw, pitch, roll) from facial landmarks
 * Uses geometric analysis of face landmark positions
 */
function estimateHeadPose(
    landmarks: faceapi.FaceLandmarks68,
    videoWidth: number,
    videoHeight: number
): HeadPose {
    const positions = landmarks.positions;

    // Key landmark points
    const noseTip = positions[30];           // Tip of nose
    const leftEye = getCenter(positions.slice(36, 42));   // Left eye center
    const rightEye = getCenter(positions.slice(42, 48));  // Right eye center
    const leftMouth = positions[48];         // Left mouth corner
    const rightMouth = positions[54];        // Right mouth corner
    const chin = positions[8];               // Bottom of chin
    const foreheadApprox = positions[27];    // Between eyebrows

    // Calculate eye distance as reference
    const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) +
        Math.pow(rightEye.y - leftEye.y, 2)
    );

    // YAW (left/right rotation)
    // Compare nose position relative to face center
    const faceCenter = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2,
    };

    // Calculate horizontal offset of nose from face center
    // Normalize by eye distance for scale invariance
    const noseOffset = (noseTip.x - faceCenter.x) / eyeDistance;

    // Also use mouth asymmetry to confirm yaw
    const leftMouthDist = Math.abs(noseTip.x - leftMouth.x);
    const rightMouthDist = Math.abs(noseTip.x - rightMouth.x);
    const mouthAsymmetry = (rightMouthDist - leftMouthDist) / eyeDistance;

    // Combine nose offset and mouth asymmetry for yaw
    const yaw = clamp((noseOffset * 0.7 + mouthAsymmetry * 0.3) * 2, -1, 1);

    // PITCH (up/down rotation)
    // Compare nose-to-forehead vs nose-to-chin distances
    const foreheadToNose = Math.abs(foreheadApprox.y - noseTip.y);
    const chinToNose = Math.abs(chin.y - noseTip.y);

    // If looking up, nose is closer to forehead; looking down, closer to chin
    const verticalRatio = (chinToNose - foreheadToNose) / (chinToNose + foreheadToNose);
    const pitch = clamp(verticalRatio * 2, -1, 1);

    // ROLL (head tilt)
    // Angle of the line connecting the eyes
    const eyeAngle = Math.atan2(
        rightEye.y - leftEye.y,
        rightEye.x - leftEye.x
    );
    const roll = clamp(eyeAngle / (Math.PI / 4), -1, 1); // Normalize to -1 to 1

    return { yaw, pitch, roll };
}

/**
 * Smooth gaze detection to reduce false positives
 * Requires multiple consecutive frames of "looking away" before flagging
 */
function smoothGazeDetection(isLookingAway: boolean): boolean {
    gazeHistory.push(isLookingAway);

    // Keep only recent history
    if (gazeHistory.length > GAZE_HISTORY_SIZE) {
        gazeHistory.shift();
    }

    // Only flag as looking away if all recent frames agree
    if (gazeHistory.length < GAZE_HISTORY_SIZE) {
        return false; // Not enough history yet
    }

    return gazeHistory.every(v => v);
}

/**
 * Get center point of a set of positions
 */
function getCenter(points: faceapi.Point[]): { x: number; y: number } {
    const sum = points.reduce(
        (acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y,
        }),
        { x: 0, y: 0 }
    );

    return {
        x: sum.x / points.length,
        y: sum.y / points.length,
    };
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Clean up resources
 */
export function disposeFaceDetection(): void {
    modelsLoaded = false;
    loadingPromise = null;
    gazeHistory.length = 0;
}

/**
 * Reset gaze history (useful when starting fresh)
 */
export function resetGazeHistory(): void {
    gazeHistory.length = 0;
}

export default {
    loadFaceDetectionModels,
    areModelsLoaded,
    detectFaces,
    disposeFaceDetection,
    resetGazeHistory,
};

