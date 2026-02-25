-- i18n audit: detect missing translation rows per entity/locale.
-- Run against your DB to see counts and find entities with no Arabic (or other locale).
-- See docs/i18n-audit-and-correction-strategy.md §4.4

-- Count by entity and locale
SELECT 'course' AS entity, locale, COUNT(*) AS cnt
FROM course_translations
GROUP BY locale
UNION ALL
SELECT 'lesson', locale, COUNT(*)
FROM lesson_translations
GROUP BY locale
UNION ALL
SELECT 'announcement', locale, COUNT(*)
FROM announcement_translations
GROUP BY locale
UNION ALL
SELECT 'exam', locale, COUNT(*)
FROM exam_translations
GROUP BY locale
ORDER BY entity, locale;

-- Courses with no Arabic translation
SELECT c.id, c.title
FROM courses c
WHERE NOT EXISTS (
  SELECT 1 FROM course_translations ct
  WHERE ct.course_id = c.id AND ct.locale = 'ar'
)
LIMIT 50;

-- Lessons with no Arabic translation
SELECT l.id, l.title
FROM lessons l
WHERE NOT EXISTS (
  SELECT 1 FROM lesson_translations lt
  WHERE lt.lesson_id = l.id AND lt.locale = 'ar'
)
LIMIT 50;
