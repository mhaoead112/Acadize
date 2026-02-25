-- i18n: backfill Arabic rows from English where missing.
-- Use when you want ar to show the same content as en until real translations exist.
-- See docs/i18n-audit-and-correction-strategy.md §4.4

-- Course translations: copy en -> ar where ar missing
INSERT INTO course_translations (id, course_id, locale, title, description, updated_at)
SELECT 'ct_' || ct.course_id || '_ar', ct.course_id, 'ar', ct.title, ct.description, now()
FROM course_translations ct
WHERE ct.locale = 'en'
  AND NOT EXISTS (
    SELECT 1 FROM course_translations ar
    WHERE ar.course_id = ct.course_id AND ar.locale = 'ar'
  );

-- Lesson translations: copy en -> ar where ar missing
INSERT INTO lesson_translations (id, lesson_id, locale, title, content, updated_at)
SELECT 'lt_' || lt.lesson_id || '_ar', lt.lesson_id, 'ar', lt.title, lt.content, now()
FROM lesson_translations lt
WHERE lt.locale = 'en'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_translations ar
    WHERE ar.lesson_id = lt.lesson_id AND ar.locale = 'ar'
  );

-- Announcement translations: copy en -> ar where ar missing
INSERT INTO announcement_translations (id, announcement_id, locale, title, body, updated_at)
SELECT 'at_' || at.announcement_id || '_ar', at.announcement_id, 'ar', at.title, at.body, now()
FROM announcement_translations at
WHERE at.locale = 'en'
  AND NOT EXISTS (
    SELECT 1 FROM announcement_translations ar
    WHERE ar.announcement_id = at.announcement_id AND ar.locale = 'ar'
  );

-- Exam translations: copy en -> ar where ar missing
INSERT INTO exam_translations (id, exam_id, locale, title, instructions, updated_at)
SELECT 'et_' || et.exam_id || '_ar', et.exam_id, 'ar', et.title, et.instructions, now()
FROM exam_translations et
WHERE et.locale = 'en'
  AND NOT EXISTS (
    SELECT 1 FROM exam_translations ar
    WHERE ar.exam_id = et.exam_id AND ar.locale = 'ar'
  );
