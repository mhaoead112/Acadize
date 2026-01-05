// server/src/services/cloud-storage.service.ts
// Cloud storage service using Cloudinary for persistent file storage

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary from environment variables
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️ Cloudinary not configured. Files will be stored locally (will be lost on redeploy).');
    console.warn('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in environment.');
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  console.log('✅ Cloudinary configured successfully');
  return true;
};

const isCloudinaryConfigured = configureCloudinary();

interface UploadOptions {
  folder: string; // 'profile-pictures', 'lessons', 'submissions'
  publicId?: string; // Optional custom public ID
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
}

interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  isCloudinary: boolean;
}

/**
 * Upload a file to cloud storage (Cloudinary) or fall back to local storage
 */
export async function uploadFile(
  filePath: string,
  options: UploadOptions
): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    // Fall back to local storage - just return the local path
    const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
    return {
      url: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
      publicId: path.basename(filePath),
      format: path.extname(filePath).slice(1),
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      isCloudinary: false
    };
  }

  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder: `eduverse/${options.folder}`,
      public_id: options.publicId,
      resource_type: options.resourceType || 'auto',
      use_filename: true,
      unique_filename: true,
      access_mode: 'public',
    });

    // Delete local file after successful upload to cloud
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      isCloudinary: true
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    // Fall back to local storage on error
    const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
    return {
      url: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
      publicId: path.basename(filePath),
      format: path.extname(filePath).slice(1),
      size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0,
      isCloudinary: false
    };
  }
}

/**
 * Upload a file from buffer (for processing without saving to disk first)
 */
export async function uploadBuffer(
  buffer: Buffer,
  originalName: string,
  options: UploadOptions
): Promise<UploadResult> {
  if (!isCloudinaryConfigured) {
    // Fall back to local storage - save buffer to disk
    const uploadsDir = path.join(process.cwd(), 'uploads', options.folder);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const uniqueName = `${Date.now()}-${originalName}`;
    const localPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(localPath, buffer);
    
    return {
      url: `/uploads/${options.folder}/${uniqueName}`,
      publicId: uniqueName,
      format: path.extname(originalName).slice(1),
      size: buffer.length,
      isCloudinary: false
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `eduverse/${options.folder}`,
        public_id: options.publicId,
        resource_type: options.resourceType || 'auto',
        use_filename: true,
        unique_filename: true,
        access_mode: 'public',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary buffer upload error:', error);
          reject(error);
          return;
        }

        if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            isCloudinary: true
          });
        } else {
          reject(new Error('No result from Cloudinary'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a file from cloud storage
 */
export async function deleteFile(urlOrPublicId: string): Promise<boolean> {
  // If it's a local file path
  if (urlOrPublicId.startsWith('/uploads/') || !urlOrPublicId.includes('cloudinary')) {
    const localPath = path.join(process.cwd(), urlOrPublicId);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      return true;
    }
    return false;
  }

  // If Cloudinary is not configured, nothing to do
  if (!isCloudinaryConfigured) {
    return false;
  }

  try {
    // Extract public ID from Cloudinary URL
    let publicId = urlOrPublicId;
    
    if (urlOrPublicId.includes('cloudinary.com')) {
      // Extract public ID from full URL
      // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567/folder/file.ext
      const matches = urlOrPublicId.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (matches) {
        publicId = matches[1];
      }
    }

    // Try deleting as different resource types
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
      } catch {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      }
    }

    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

/**
 * Check if Cloudinary is properly configured
 */
export function isCloudStorageConfigured(): boolean {
  return isCloudinaryConfigured;
}

/**
 * Get the appropriate URL for a file (handles both local and cloud URLs)
 */
export function getFileUrl(storedUrl: string | null | undefined): string | null {
  if (!storedUrl) return null;
  
  // If it's already a full URL (Cloudinary), return as-is
  if (storedUrl.startsWith('http://') || storedUrl.startsWith('https://')) {
    return storedUrl;
  }
  
  // For local files, return the relative path (frontend will prepend API URL)
  return storedUrl;
}

export default {
  uploadFile,
  uploadBuffer,
  deleteFile,
  isCloudStorageConfigured,
  getFileUrl
};
