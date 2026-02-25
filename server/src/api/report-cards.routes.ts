import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { reportCards, users } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'report-cards');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `report-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Upload a report card (teachers only)
router.post('/upload', ...requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = req.user;

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers can upload report cards' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { studentId, period, academicYear } = req.body;

    if (!studentId || !period || !academicYear) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Student ID, period, and academic year are required' });
    }

    // Verify student exists and is a student
    const [student] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, studentId),
        eq(users.role, 'student')
      ));

    if (!student) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if report card already exists for this student/period/year
    const [existing] = await db
      .select()
      .from(reportCards)
      .where(and(
        eq(reportCards.studentId, studentId),
        eq(reportCards.period, period),
        eq(reportCards.academicYear, academicYear)
      ));

    if (existing) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: `A report card for ${period} - ${academicYear} already exists for this student`
      });
    }

    // Create report card record
    const [reportCard] = await db
      .insert(reportCards)
      .values({
        studentId,
        period,
        academicYear,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size.toString(),
        uploadedBy: user.id,
      })
      .returning();

    res.json({
      message: 'Report card uploaded successfully',
      reportCard
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Clean up file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({ message: 'Failed to upload report card' });
  }
});

// Get all report cards (teachers only)
router.get('/all', ...requireAuth, async (req, res) => {
  try {
    const user = req.user;

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reports = await db
      .select({
        id: reportCards.id,
        studentId: reportCards.studentId,
        studentName: users.fullName,
        studentEmail: users.email,
        period: reportCards.period,
        academicYear: reportCards.academicYear,
        fileName: reportCards.fileName,
        filePath: reportCards.filePath,
        fileSize: reportCards.fileSize,
        uploadedBy: reportCards.uploadedBy,
        uploadedAt: reportCards.uploadedAt,
        createdAt: reportCards.createdAt,
      })
      .from(reportCards)
      .leftJoin(users, eq(reportCards.studentId, users.id))
      .orderBy(desc(reportCards.uploadedAt));

    res.json(reports);
  } catch (error) {
    console.error('Fetch all reports error:', error);
    res.status(500).json({ message: 'Failed to fetch report cards' });
  }
});

// Get report cards for current student
router.get('/student', ...requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { academicYear, period } = req.query;

    if (user?.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    let query = db
      .select({
        id: reportCards.id,
        studentId: reportCards.studentId,
        period: reportCards.period,
        academicYear: reportCards.academicYear,
        fileName: reportCards.fileName,
        filePath: reportCards.filePath,
        fileSize: reportCards.fileSize,
        uploadedBy: reportCards.uploadedBy,
        uploaderName: users.fullName,
        uploadedAt: reportCards.uploadedAt,
        createdAt: reportCards.createdAt,
      })
      .from(reportCards)
      .leftJoin(users, eq(reportCards.uploadedBy, users.id))
      .where(eq(reportCards.studentId, user.id));

    // Apply filters if provided
    const conditions = [eq(reportCards.studentId, user.id)];

    if (academicYear) {
      conditions.push(eq(reportCards.academicYear, academicYear as string));
    }

    if (period) {
      conditions.push(eq(reportCards.period, period as any));
    }

    const reports = await db
      .select({
        id: reportCards.id,
        studentId: reportCards.studentId,
        period: reportCards.period,
        academicYear: reportCards.academicYear,
        fileName: reportCards.fileName,
        filePath: reportCards.filePath,
        fileSize: reportCards.fileSize,
        uploadedBy: reportCards.uploadedBy,
        uploaderName: users.fullName,
        uploadedAt: reportCards.uploadedAt,
        createdAt: reportCards.createdAt,
      })
      .from(reportCards)
      .leftJoin(users, eq(reportCards.uploadedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(reportCards.uploadedAt));

    res.json(reports);
  } catch (error) {
    console.error('Fetch student reports error:', error);
    res.status(500).json({ message: 'Failed to fetch report cards' });
  }
});

// View a report card
router.get('/:id/view', ...requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const [report] = await db
      .select()
      .from(reportCards)
      .where(eq(reportCards.id, id));

    if (!report) {
      return res.status(404).json({ message: 'Report card not found' });
    }

    // Check permissions
    if (user?.role === 'student' && report.studentId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user?.role !== 'student' && user?.role !== 'teacher' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(report.filePath)) {
      return res.status(404).json({ message: 'Report file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.fileName}"`);

    const fileStream = fs.createReadStream(report.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('View report error:', error);
    res.status(500).json({ message: 'Failed to view report card' });
  }
});

// Download a report card
router.get('/:id/download', ...requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const [report] = await db
      .select()
      .from(reportCards)
      .where(eq(reportCards.id, id));

    if (!report) {
      return res.status(404).json({ message: 'Report card not found' });
    }

    // Check permissions
    if (user?.role === 'student' && report.studentId !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user?.role !== 'student' && user?.role !== 'teacher' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!fs.existsSync(report.filePath)) {
      return res.status(404).json({ message: 'Report file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);

    const fileStream = fs.createReadStream(report.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ message: 'Failed to download report card' });
  }
});

// Delete a report card (teachers only)
router.delete('/:id', ...requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers can delete report cards' });
    }

    const [report] = await db
      .select()
      .from(reportCards)
      .where(eq(reportCards.id, id));

    if (!report) {
      return res.status(404).json({ message: 'Report card not found' });
    }

    // Delete the file
    if (fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }

    // Delete the database record
    await db
      .delete(reportCards)
      .where(eq(reportCards.id, id));

    res.json({ message: 'Report card deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Failed to delete report card' });
  }
});

export default router;
