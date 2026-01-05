// server/src/api/lesson.routes.ts

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { createLesson, getLessonsByCourse, getLessonById, deleteLesson, updateLesson, reorderLessons } from '../services/lesson.service.js';
import { getCourseById } from '../services/course.service.js';
import { uploadFile, deleteFile, isCloudStorageConfigured } from '../services/cloud-storage.service.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/lessons');
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error as Error, uploadPath);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, Word, PowerPoint, Images, and Text files are allowed.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * POST /api/lessons/upload
 * Upload a new lesson file
 */
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const { courseId, lessonTitle } = req.body;
        const file = req.file;

        if (!courseId || !lessonTitle) {
            return res.status(400).json({ message: 'Course ID and lesson title are required.' });
        }

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        // Verify course exists and user owns it
        const course = await getCourseById(courseId);
        if (!course) {
            // Delete uploaded file if course doesn't exist
            await fs.unlink(file.path).catch(() => {});
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            // Delete uploaded file if user doesn't own the course
            await fs.unlink(file.path).catch(() => {});
            return res.status(403).json({ message: "You don't have permission to add lessons to this course." });
        }

        // Upload file to cloud storage (or keep locally if cloud not configured)
        const uploadResult = await uploadFile(file.path, {
            folder: 'lessons',
            resourceType: 'raw' // Use 'raw' for documents, not just images
        });

        // Create lesson record in database with cloud URL
        const newLesson = await createLesson({
            courseId,
            title: lessonTitle,
            fileName: file.originalname,
            filePath: uploadResult.url, // Now stores cloud URL or local path
            fileType: file.mimetype,
            fileSize: file.size.toString()
        });

        console.log(`Lesson uploaded to ${uploadResult.isCloudinary ? 'Cloudinary' : 'local storage'}: ${uploadResult.url}`);

        // Trigger AI digestion in background (non-blocking)
        // This indexes the lesson content for the AI Study Buddy
        // Note: AI digestion works best with local files, so we check if file still exists
        try {
            const { processLessonFile } = await import('../services/lesson-digestion.service.js');
            const lessonId = `${courseId}-${newLesson.id}`;
            
            // If using cloud storage, the local file was deleted after upload
            // For AI indexing with cloud files, we'd need to download first (future enhancement)
            // For now, only process if file still exists locally (non-cloud mode)
            const localPath = uploadResult.isCloudinary ? null : path.join(process.cwd(), uploadResult.url);
            
            if (localPath) {
                // Process in background - don't wait for completion
                processLessonFile(localPath, lessonId)
                    .then(result => {
                        if (result.success) {
                            console.log(`✅ AI indexed lesson: ${lessonId} (${result.chunksProcessed} chunks)`);
                        } else {
                            console.warn(`⚠️ AI indexing skipped for ${lessonId}: ${result.message}`);
                        }
                    })
                    .catch(err => {
                        console.warn(`⚠️ AI indexing failed for ${lessonId}:`, err.message);
                    });
            }
        } catch (err) {
            // Don't fail the upload if AI indexing fails
            console.warn('AI digestion service not available:', err);
        }

        res.status(201).json({
            message: 'Lesson uploaded successfully',
            lesson: newLesson
        });
    } catch (error) {
        console.error('Error uploading lesson:', error);
        // Clean up uploaded file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({
            message: 'Failed to upload lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUBLIC/PROTECTED
 * GET /api/lessons/course/:courseId
 * Get all lessons for a course
 */
router.get('/course/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;

        const courseLessons = await getLessonsByCourse(courseId);

        res.status(200).json({
            lessons: courseLessons
        });
    } catch (error) {
        console.error('Error fetching lessons:', error);
        res.status(500).json({
            message: 'Failed to fetch lessons',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUBLIC/PROTECTED
 * GET /api/lessons/:id
 * Get a specific lesson by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const lesson = await getLessonById(req.params.id);

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found.' });
        }

        res.status(200).json(lesson);
    } catch (error) {
        console.error('Error fetching lesson:', error);
        res.status(500).json({
            message: 'Failed to fetch lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * PATCH /api/lessons/:id
 * Update a lesson (title or metadata)
 */
router.patch('/:id', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const lessonId = req.params.id;
        const { title } = req.body;

        // Get lesson to verify ownership
        const lesson = await getLessonById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found.' });
        }

        // Get course to verify ownership
        const course = await getCourseById(lesson.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to update this lesson." });
        }

        // Update lesson
        const updatedLesson = await updateLesson(lessonId, { title });

        res.status(200).json({
            message: 'Lesson updated successfully',
            lesson: updatedLesson
        });
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({
            message: 'Failed to update lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * POST /api/lessons/reorder
 * Reorder lessons in a course
 */
router.post('/reorder', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const { lessons: lessonOrders } = req.body;

        if (!Array.isArray(lessonOrders)) {
            return res.status(400).json({ message: 'Lessons array is required.' });
        }

        // Verify ownership of first lesson to check course ownership
        if (lessonOrders.length > 0) {
            const firstLesson = await getLessonById(lessonOrders[0].id);
            if (firstLesson) {
                const course = await getCourseById(firstLesson.courseId);
                if (course && course.teacherId !== user.id && user.role !== 'admin') {
                    return res.status(403).json({ message: "You don't have permission to reorder these lessons." });
                }
            }
        }

        const updatedLessons = await reorderLessons(lessonOrders);

        res.status(200).json({
            message: 'Lessons reordered successfully',
            lessons: updatedLessons
        });
    } catch (error) {
        console.error('Error reordering lessons:', error);
        res.status(500).json({
            message: 'Failed to reorder lessons',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * DELETE /api/lessons/:id
 * Delete a lesson
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const lessonId = req.params.id;

        // Get lesson to verify ownership
        const lesson = await getLessonById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found.' });
        }

        // Get course to verify ownership
        const course = await getCourseById(lesson.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to delete this lesson." });
        }

        // Delete file from cloud or local storage
        try {
            await deleteFile(lesson.filePath);
        } catch (error) {
            console.warn('Failed to delete file from storage:', error);
            // Continue with database deletion even if file deletion fails
        }

        // Delete lesson from database
        await deleteLesson(lessonId);

        res.status(200).json({
            message: 'Lesson deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({
            message: 'Failed to delete lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUBLIC/PROTECTED
 * GET /api/lessons/:id/download
 * Download or view a lesson file
 * Query param: ?view=inline for inline viewing (PDFs, images, etc.)
 */
router.get('/:id/download', async (req, res) => {
    try {
        const lesson = await getLessonById(req.params.id);

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found.' });
        }

        // Check if file is stored in cloud (Cloudinary URL)
        if (lesson.filePath.startsWith('http://') || lesson.filePath.startsWith('https://')) {
            // Redirect to cloud URL for direct access
            return res.redirect(lesson.filePath);
        }

        // For local files, check if file exists
        const localPath = lesson.filePath.startsWith('/') 
            ? path.join(process.cwd(), lesson.filePath)
            : lesson.filePath;
            
        try {
            await fs.access(localPath);
        } catch {
            return res.status(404).json({ message: 'File not found on server.' });
        }

        // Determine if inline view or download
        const isInlineView = req.query.view === 'inline';
        const disposition = isInlineView ? 'inline' : 'attachment';
        
        // Set headers
        res.setHeader('Content-Type', lesson.fileType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${lesson.fileName}"`);
        
        // Allow cross-origin for viewing in iframes
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Stream file to response
        res.sendFile(localPath);
    } catch (error) {
        console.error('Error downloading lesson:', error);
        res.status(500).json({
            message: 'Failed to download lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
