// server/src/api/recording-upload.routes.ts

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../db/index.js';
import { examAttempts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/recordings/', // Temporary storage
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max per chunk
    },
    fileFilter: (req, file, cb) => {
        // Accept video files only
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    },
});

// ============================================================================
// CLOUDINARY CONFIGURATION
// ============================================================================

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/recordings/upload-chunk
 * Upload a recording chunk to Cloudinary
 * 
 * Request: multipart/form-data
 * - chunk: File (video blob)
 * - chunkIndex: number
 * - attemptId: string
 * 
 * Response: 200 OK
 * {
 *   chunkUrl: string,
 *   chunkIndex: number,
 *   publicId: string
 * }
 */
router.post(
    '/upload-chunk',
    ...requireAuth,
    upload.single('chunk'),
    async (req: Request, res: Response) => {
        try {
            const { chunkIndex, attemptId } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            if (!attemptId || chunkIndex === undefined) {
                return res.status(400).json({
                    message: 'attemptId and chunkIndex are required'
                });
            }

            // Verify attempt belongs to user
            const [attempt] = await db
                .select()
                .from(examAttempts)
                .where(eq(examAttempts.id, attemptId))
                .limit(1);

            if (!attempt) {
                return res.status(404).json({ message: 'Exam attempt not found' });
            }

            if (attempt.studentId !== req.user!.id) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Upload to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(file.path, {
                resource_type: 'video',
                folder: `exam-recordings/${attempt.examId}/${attemptId}`,
                public_id: `chunk-${chunkIndex}`,
                format: 'mp4',
                transformation: [
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ],
            });

            // Delete temporary file
            await fs.unlink(file.path);

            console.log(`[RECORDING] Chunk ${chunkIndex} uploaded for attempt ${attemptId}`);

            res.status(200).json({
                chunkUrl: uploadResult.secure_url,
                chunkIndex: parseInt(chunkIndex),
                publicId: uploadResult.public_id,
            });

        } catch (error: any) {
            console.error('[RECORDING] Error uploading chunk:', error);

            // Clean up temp file on error
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }

            res.status(500).json({
                message: 'Failed to upload recording chunk',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * POST /api/recordings/finalize
 * Finalize recording and update exam attempt
 * 
 * Request: multipart/form-data
 * - recording: File (final video blob)
 * - attemptId: string
 * 
 * Response: 200 OK
 * {
 *   recordingUrl: string,
 *   publicId: string
 * }
 */
router.post(
    '/finalize',
    ...requireAuth,
    upload.single('recording'),
    async (req: Request, res: Response) => {
        try {
            const { attemptId } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            if (!attemptId) {
                return res.status(400).json({ message: 'attemptId is required' });
            }

            // Verify attempt belongs to user
            const [attempt] = await db
                .select()
                .from(examAttempts)
                .where(eq(examAttempts.id, attemptId))
                .limit(1);

            if (!attempt) {
                return res.status(404).json({ message: 'Exam attempt not found' });
            }

            if (attempt.studentId !== req.user!.id) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // Upload final recording to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(file.path, {
                resource_type: 'video',
                folder: `exam-recordings/${attempt.examId}/${attemptId}`,
                public_id: `final-recording`,
                format: 'mp4',
                transformation: [
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ],
            });

            // Update exam attempt with recording URL
            await db
                .update(examAttempts)
                .set({
                    screenRecordingUrl: uploadResult.secure_url,
                    metadata: {
                        recording: {
                            publicId: uploadResult.public_id,
                            duration: uploadResult.duration,
                            format: uploadResult.format,
                            uploadedAt: new Date().toISOString(),
                        }
                    } as any,
                })
                .where(eq(examAttempts.id, attemptId));

            // Delete temporary file
            await fs.unlink(file.path);

            console.log(`[RECORDING] Final recording uploaded for attempt ${attemptId}`);

            res.status(200).json({
                recordingUrl: uploadResult.secure_url,
                publicId: uploadResult.public_id,
            });

        } catch (error: any) {
            console.error('[RECORDING] Error finalizing recording:', error);

            // Clean up temp file on error
            if (req.file) {
                await fs.unlink(req.file.path).catch(() => { });
            }

            res.status(500).json({
                message: 'Failed to finalize recording',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * GET /api/recordings/:attemptId
 * Get recording URL for an attempt (teacher/admin only)
 * 
 * Response: 200 OK
 * {
 *   recordingUrl: string | null,
 *   metadata: object | null
 * }
 */
router.get(
    '/:attemptId',
    isAuthenticated,
    async (req: Request, res: Response) => {
        try {
            const { attemptId } = req.params;
            const userRole = req.user!.role;

            // Only teachers, admins, and proctors can view recordings
            if (!['teacher', 'admin', 'proctor'].includes(userRole)) {
                return res.status(403).json({ message: 'Access denied' });
            }

            const [attempt] = await db
                .select()
                .from(examAttempts)
                .where(eq(examAttempts.id, attemptId))
                .limit(1);

            if (!attempt) {
                return res.status(404).json({ message: 'Exam attempt not found' });
            }

            res.status(200).json({
                recordingUrl: attempt.screenRecordingUrl || null,
                metadata: attempt.metadata || null,
            });

        } catch (error: any) {
            console.error('[RECORDING] Error fetching recording:', error);
            res.status(500).json({
                message: 'Failed to fetch recording',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

export default router;
