import express from 'express';
import { db } from '../db/index.js';
import { organizations } from '../db/schema.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SUPPORTED_LOCALES = ['en', 'ar'];

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
 * GET /api/admin/settings/locale
 * Get current org's i18n settings (defaultLocale, enabledLocales)
 */
router.get('/locale', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization context required' });
    const [org] = await db.select({ defaultLocale: organizations.defaultLocale, enabledLocales: organizations.enabledLocales }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({
      defaultLocale: org.defaultLocale ?? 'en',
      enabledLocales: Array.isArray(org.enabledLocales) ? org.enabledLocales : ['en'],
    });
  } catch (error) {
    console.error('Error fetching locale settings:', error);
    res.status(500).json({ error: 'Failed to fetch locale settings' });
  }
});

/**
 * PATCH /api/admin/settings/locale
 * Update current org's defaultLocale and enabledLocales (admin only)
 */
router.patch('/locale', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization context required' });
    const { defaultLocale, enabledLocales } = req.body;
    const updates: { defaultLocale?: string; enabledLocales?: string[] } = {};
    if (defaultLocale !== undefined) {
      const loc = String(defaultLocale).trim().toLowerCase();
      if (!SUPPORTED_LOCALES.includes(loc)) return res.status(400).json({ error: `defaultLocale must be one of: ${SUPPORTED_LOCALES.join(', ')}` });
      updates.defaultLocale = loc;
    }
    if (enabledLocales !== undefined) {
      if (!Array.isArray(enabledLocales)) return res.status(400).json({ error: 'enabledLocales must be an array' });
      const list = enabledLocales.map((l: string) => String(l).trim().toLowerCase()).filter((l: string) => SUPPORTED_LOCALES.includes(l));
      if (list.length === 0) return res.status(400).json({ error: 'At least one enabled locale required' });
      updates.enabledLocales = list;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Provide defaultLocale and/or enabledLocales' });
    const [updated] = await db.update(organizations).set(updates).where(eq(organizations.id, orgId)).returning({ defaultLocale: organizations.defaultLocale, enabledLocales: organizations.enabledLocales });
    if (!updated) return res.status(404).json({ error: 'Organization not found' });
    const { clearTenantCache } = await import('../middleware/tenant.middleware.js');
    clearTenantCache((req as any).tenant?.subdomain);
    res.json({
      message: 'Locale settings updated',
      defaultLocale: updated.defaultLocale ?? 'en',
      enabledLocales: Array.isArray(updated.enabledLocales) ? updated.enabledLocales : ['en'],
    });
  } catch (error) {
    console.error('Error updating locale settings:', error);
    res.status(500).json({ error: 'Failed to update locale settings' });
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

    if (category === 'features') {
      const tenant = (req as any).tenant;
      if (tenant && tenant.organizationId) {
        const [org] = await db
          .select({ config: organizations.config })
          .from(organizations)
          .where(eq(organizations.id, tenant.organizationId))
          .limit(1);

        const orgFeatures = org?.config && typeof org.config === 'object' && 'features' in org.config
          ? (org.config as any).features
          : {};

        return res.json({
          category,
          settings: {
            ...settings.features,
            ...orgFeatures
          }
        });
      }
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

    if (category === 'features') {
      const tenant = (req as any).tenant;
      if (tenant && tenant.organizationId) {
        const [org] = await db
          .select({ config: organizations.config })
          .from(organizations)
          .where(eq(organizations.id, tenant.organizationId))
          .limit(1);

        if (org) {
          const currentOrgConfig = org.config && typeof org.config === 'object' ? org.config : {};
          const updatedConfig = {
            ...currentOrgConfig,
            features: {
              ...(currentOrgConfig as any).features,
              ...categorySettings
            }
          };

          await db
            .update(organizations)
            .set({ config: updatedConfig })
            .where(eq(organizations.id, tenant.organizationId));

          const { clearTenantCache } = await import('../middleware/tenant.middleware.js');
          clearTenantCache(tenant.subdomain);

          return res.json({
            message: `${category} settings updated successfully for organization`,
            category,
            settings: updatedConfig.features
          });
        }
      }
    }

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
