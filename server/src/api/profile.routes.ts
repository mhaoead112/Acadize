import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { uploadFile, deleteFile, isCloudStorageConfigured } from '../services/cloud-storage.service.js';

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Get current user profile
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture,
        grade: users.grade,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile (name and grade)
router.put('/me', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { fullName, grade } = req.body;

    if (!fullName || fullName.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters' });
    }

    const updateData: any = {
      fullName: fullName.trim(),
      updatedAt: new Date(),
    };

    // Only update grade if provided
    if (grade !== undefined) {
      updateData.grade = grade.trim() || null;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture,
        grade: users.grade,
      });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile picture
router.post('/me/picture', isAuthenticated, (req, res, next) => {
  // Handle multer upload with explicit error handling
  upload.single('profilePicture')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error (file too large, etc.)
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      // Other error (invalid file type, etc.)
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      const userId = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded. Please select an image file.' });
      }

      // Get current user to delete old profile picture
      const [currentUser] = await db
        .select({ profilePicture: users.profilePicture })
        .from(users)
        .where(eq(users.id, userId));

      // Delete old profile picture from storage (cloud or local)
      if (currentUser?.profilePicture) {
        await deleteFile(currentUser.profilePicture);
      }

      // Upload new profile picture to cloud storage
      const localFilePath = req.file.path;
      const uploadResult = await uploadFile(localFilePath, {
        folder: 'profile-pictures',
        resourceType: 'image'
      });

      const [updatedUser] = await db
        .update(users)
        .set({
          profilePicture: uploadResult.url,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          profilePicture: users.profilePicture,
          grade: users.grade,
        });

      console.log(`Profile picture uploaded to ${uploadResult.isCloudinary ? 'Cloudinary' : 'local storage'}: ${uploadResult.url}`);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      res.status(500).json({ error: 'Failed to upload profile picture' });
    }
  });
});

// Delete profile picture
router.delete('/me/picture', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get current user to delete the file
    const [currentUser] = await db
      .select({ profilePicture: users.profilePicture })
      .from(users)
      .where(eq(users.id, userId));

    // Delete from cloud or local storage
    if (currentUser?.profilePicture) {
      await deleteFile(currentUser.profilePicture);
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        profilePicture: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        profilePicture: users.profilePicture,
        grade: users.grade,
      });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({ error: 'Failed to delete profile picture' });
  }
});

export default router;
