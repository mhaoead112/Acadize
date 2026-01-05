import express from 'express';
import { db } from '../db/index.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Settings file path (in production, this would be in a database)
const SETTINGS_FILE = path.resolve(__dirname, '../../data/system-settings.json');

// Default system settings
const defaultSettings = {
  general: {
    siteName: 'EduVerse',
    siteDescription: 'A modern learning management system',
    logoUrl: '/logo.png',
    favicon: '/favicon.ico',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h'
  },
  security: {
    allowRegistration: true,
    requireEmailVerification: false,
    sessionTimeout: 120, // minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15, // minutes
    passwordMinLength: 6,
    passwordRequireUppercase: false,
    passwordRequireNumber: false,
    passwordRequireSpecial: false
  },
  features: {
    aiStudyBuddy: true,
    studyGroups: true,
    videoConferencing: false,
    reportCards: true,
    parentPortal: true,
    notifications: true,
    darkMode: true
  },
  email: {
    smtpEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpSecure: true,
    fromEmail: 'noreply@eduverse.com',
    fromName: 'EduVerse'
  },
  uploads: {
    maxFileSize: 50, // MB
    allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'zip'],
    maxFilesPerUpload: 5,
    storageLocation: 'local' // 'local', 's3', 'gcs'
  },
  notifications: {
    emailNotifications: true,
    assignmentReminders: true,
    gradeNotifications: true,
    announcementNotifications: true,
    messageNotifications: true,
    reminderHoursBefore: 24
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: 'The system is currently under maintenance. Please try again later.',
    allowAdminAccess: true
  }
};

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load settings from file
function loadSettings(): typeof defaultSettings {
  try {
    ensureDataDirectory();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
}

// Save settings to file
function saveSettings(settings: typeof defaultSettings): boolean {
  try {
    ensureDataDirectory();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * GET /api/admin/settings
 * Get all system settings (admin only)
 */
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const settings = loadSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/settings/:category
 * Get settings for a specific category
 */
router.get('/:category', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const settings = loadSettings();

    if (!(category in settings)) {
      return res.status(404).json({ error: `Settings category '${category}' not found` });
    }

    res.json({ 
      category,
      settings: settings[category as keyof typeof settings] 
    });
  } catch (error) {
    console.error('Error fetching settings category:', error);
    res.status(500).json({
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update all system settings
 */
router.put('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { settings: newSettings } = req.body;

    if (!newSettings) {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const currentSettings = loadSettings();
    const mergedSettings = deepMerge(currentSettings, newSettings);

    if (saveSettings(mergedSettings)) {
      res.json({
        message: 'Settings updated successfully',
        settings: mergedSettings
      });
    } else {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/admin/settings/:category
 * Update settings for a specific category
 */
router.patch('/:category', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const categorySettings = req.body;

    const currentSettings = loadSettings();

    if (!(category in currentSettings)) {
      return res.status(404).json({ error: `Settings category '${category}' not found` });
    }

    // Merge with existing category settings
    (currentSettings as any)[category] = {
      ...(currentSettings as any)[category],
      ...categorySettings
    };

    if (saveSettings(currentSettings)) {
      res.json({
        message: `${category} settings updated successfully`,
        category,
        settings: (currentSettings as any)[category]
      });
    } else {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  } catch (error) {
    console.error('Error updating settings category:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/settings/reset
 * Reset settings to defaults
 */
router.post('/reset', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { category } = req.body;

    if (category) {
      // Reset specific category
      const currentSettings = loadSettings();
      if (!(category in defaultSettings)) {
        return res.status(404).json({ error: `Settings category '${category}' not found` });
      }
      (currentSettings as any)[category] = (defaultSettings as any)[category];
      
      if (saveSettings(currentSettings)) {
        res.json({
          message: `${category} settings reset to defaults`,
          settings: currentSettings
        });
      } else {
        res.status(500).json({ error: 'Failed to reset settings' });
      }
    } else {
      // Reset all settings
      if (saveSettings(defaultSettings)) {
        res.json({
          message: 'All settings reset to defaults',
          settings: defaultSettings
        });
      } else {
        res.status(500).json({ error: 'Failed to reset settings' });
      }
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      error: 'Failed to reset settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/settings/public
 * Get public settings (no auth required)
 * Only returns non-sensitive settings needed by the frontend
 */
router.get('/public/config', async (req, res) => {
  try {
    const settings = loadSettings();
    
    // Only return public, non-sensitive settings
    const publicSettings = {
      siteName: settings.general.siteName,
      siteDescription: settings.general.siteDescription,
      logoUrl: settings.general.logoUrl,
      allowRegistration: settings.security.allowRegistration,
      features: {
        aiStudyBuddy: settings.features.aiStudyBuddy,
        studyGroups: settings.features.studyGroups,
        darkMode: settings.features.darkMode
      },
      maintenanceMode: settings.maintenance.maintenanceMode,
      maintenanceMessage: settings.maintenance.maintenanceMessage
    };

    res.json({ settings: publicSettings });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Helper function for deep merge
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

export default router;
