import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/avatars');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error as Error, uploadPath);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `avatar-${uniqueSuffix}-${sanitizedName}`);
  }
});

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  }
});

// Get all users (for adding to groups)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.isActive, true));

    res.json(allUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all students (for teachers/admins)
router.get('/students', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (user?.role !== 'teacher' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const students = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'student'));

    res.json(students);
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

/**
 * PROTECTED
 * GET /api/users/:id
 * Get specific user by ID (for teacher viewing student profiles)
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Allow teachers/admins to view any student, students to view themselves
    if (requestingUser.role !== 'teacher' && requestingUser.role !== 'admin' && requestingUser.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        bio: users.bio,
        profilePicture: users.profilePicture,
        grade: users.grade,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Fetch user by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

/**
 * PROTECTED
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [profile] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        bio: users.bio,
        avatarUrl: users.profilePicture,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

/**
 * PROTECTED
 * PUT /api/users/me
 * Update current user profile
 */
router.put('/me', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { fullName, email, phone, bio } = req.body;

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        fullName: fullName !== undefined ? fullName : user.fullName,
        email: email !== undefined ? email : user.email,
        phone: phone !== undefined ? phone : user.phone,
        bio: bio !== undefined ? bio : user.bio,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/**
 * PROTECTED
 * POST /api/users/upload-avatar
 * Upload user avatar
 */
router.post('/upload-avatar', isAuthenticated, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Delete old avatar if exists
    if (user.profilePicture) {
      try {
        const oldPath = path.join(__dirname, '../..', user.profilePicture);
        await fs.unlink(oldPath);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error);
      }
    }

    // Update user with new avatar URL
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const [updated] = await db
      .update(users)
      .set({
        profilePicture: avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    res.json({ avatarUrl: updated.profilePicture });
  } catch (error) {
    console.error('Upload avatar error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

/**
 * PROTECTED
 * PUT /api/users/change-password
 * Change user password
 */
router.put('/change-password', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const [userWithPassword] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userWithPassword) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

/**
 * PROTECTED
 * POST /api/users/enable-2fa
 * Enable two-factor authentication (placeholder)
 */
router.post('/enable-2fa', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // This is a placeholder - actual 2FA implementation would require:
    // - Generating a secret key
    // - Creating QR code
    // - Verifying TOTP codes
    // - Storing 2FA secret in database

    res.json({ 
      message: '2FA setup initiated', 
      secret: 'PLACEHOLDER_SECRET',
      qrCode: 'data:image/png;base64,placeholder'
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ message: 'Failed to enable 2FA' });
  }
});

/**
 * PROTECTED
 * PUT /api/users/notifications
 * Update notification preferences
 */
router.put('/notifications', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { emailNotifications, pushNotifications, assignmentReminders, gradeUpdates } = req.body;

    // Store notification preferences (would require adding these columns to users table)
    // For now, just return success
    res.json({ 
      message: 'Notification preferences updated',
      preferences: {
        emailNotifications,
        pushNotifications,
        assignmentReminders,
        gradeUpdates
      }
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ message: 'Failed to update notification preferences' });
  }
});

export default router;
