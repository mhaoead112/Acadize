/**
 * Locale/settings for i18n: current locale, dir, and tenant-enabled locales.
 * No auth required so landing and login can show the correct language switcher.
 */
import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  const tenant = (req as any).tenant;
  const locale = (req as any).locale ?? 'en';
  const dir = (req as any).dir ?? 'ltr';
  const enabledLocales = tenant?.enabledLocales ?? ['en'];
  const defaultLocale = tenant?.defaultLocale ?? 'en';
  res.json({
    locale,
    dir,
    enabledLocales,
    defaultLocale,
  });
});

export default router;
