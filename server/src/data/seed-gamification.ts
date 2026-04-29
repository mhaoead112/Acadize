import { db } from '../db/index.js';
import { 
  organizations, users, courses, enrollments,
  gamificationSettings, gamificationLevels, gamificationBadges, 
  userGamificationProfiles, userBadges 
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

async function seedGlobalGamification() {
  console.log('🌱 Starting Global Gamification Seeder (Icon Edition)...');

  // 1. Get all organizations
  const allOrgs = await db.select().from(organizations);
  console.log(`✅ Found ${allOrgs.length} organizations.`);

  for (const org of allOrgs) {
    console.log(`\n🏢 Seeding Organization: ${org.name} (${org.id})`);

    // 2. Enable gamification settings
    await db.insert(gamificationSettings).values({
      organizationId: org.id,
      enabled: true,
      pointsEnabled: true,
      levelsEnabled: true,
      badgesEnabled: true,
      leaderboardEnabled: true,
    }).onConflictDoUpdate({
      target: gamificationSettings.organizationId,
      set: { enabled: true, leaderboardEnabled: true, pointsEnabled: true, levelsEnabled: true, badgesEnabled: true }
    });
    console.log('   ✅ Gamification enabled');

    // 3. Create Levels (Using Lucide Icon Names)
    const defaultLevels = [
      { levelNumber: 1, name: 'Novice Learner', minPoints: 0, badgeEmoji: 'egg' },
      { levelNumber: 2, name: 'Apprentice', minPoints: 100, badgeEmoji: 'sparkles' },
      { levelNumber: 3, name: 'Scholar', minPoints: 300, badgeEmoji: 'graduation-cap' },
      { levelNumber: 4, name: 'Master', minPoints: 600, badgeEmoji: 'crown' },
      { levelNumber: 5, name: 'Legend', minPoints: 1000, badgeEmoji: 'star' }
    ];
    
    for (const lvl of defaultLevels) {
      await db.insert(gamificationLevels).values({
        id: createId(),
        organizationId: org.id,
        ...lvl
      }).onConflictDoUpdate({
        target: [gamificationLevels.organizationId, gamificationLevels.levelNumber],
        set: { name: lvl.name, minPoints: lvl.minPoints, badgeEmoji: lvl.badgeEmoji }
      });
    }
    console.log('   ✅ Levels updated (icons)');

    // 4. Create Badges (Using Lucide Icon Names)
    const badgesData = [
      { name: 'First Steps', description: 'Earned by completing your first lesson.', emoji: 'footprints', criteriaType: 'action_count', criteriaValue: 1 },
      { name: 'Perfect Score', description: 'Got 100% on an exam.', emoji: 'target', criteriaType: 'exam_score', criteriaValue: 100 },
      { name: '7-Day Streak', description: 'Logged in for 7 days in a row.', emoji: 'flame', criteriaType: 'login_streak', criteriaValue: 7 },
    ];
    
    for (const badge of badgesData) {
      await db.insert(gamificationBadges).values({
        id: createId(),
        organizationId: org.id,
        ...badge
      }).onConflictDoUpdate({
        target: [gamificationBadges.organizationId, gamificationBadges.name],
        set: { description: badge.description, emoji: badge.emoji, criteriaType: badge.criteriaType, criteriaValue: badge.criteriaValue }
      });
    }
    console.log('   ✅ Badges updated (icons)');

    // Fetch all badges and levels for this org
    const orgBadges = await db.select().from(gamificationBadges).where(eq(gamificationBadges.organizationId, org.id));
    const orgLevels = await db.select().from(gamificationLevels).where(eq(gamificationLevels.organizationId, org.id));
    const level1 = orgLevels.find(l => l.levelNumber === 1);

    // 5. Seed Users in this org
    const orgUsers = await db.select().from(users).where(eq(users.organizationId, org.id));
    const teachers = orgUsers.filter(u => u.role === 'teacher');
    const students = orgUsers.filter(u => u.role === 'student');

    console.log(`   ✅ Found ${teachers.length} teachers and ${students.length} students.`);

    // Ensure teachers have at least one course
    if (teachers.length > 0) {
      for (const teacher of teachers) {
        const teacherCourses = await db.select().from(courses).where(and(eq(courses.teacherId, teacher.id), eq(courses.organizationId, org.id)));
        if (teacherCourses.length === 0) {
          await db.insert(courses).values({
            id: createId(),
            organizationId: org.id,
            teacherId: teacher.id,
            title: `Introduction to ${org.name} Course`,
            description: 'A default course created for testing.',
            status: 'published',
            isPublished: true
          });
          console.log(`      ✅ Created course for teacher: ${teacher.email}`);
        }
      }
    }

    // Assign XP and Badges to students
    if (students.length > 0) {
      let xp = 500;
      const orgCourses = await db.select().from(courses).where(eq(courses.organizationId, org.id));
      
      for (const student of students) {
        // Update/Insert Profile
        await db.insert(userGamificationProfiles).values({
          id: createId(),
          userId: student.id,
          organizationId: org.id,
          totalPoints: xp,
          currentLevelNumber: 1,
          currentLevelId: level1?.id
        }).onConflictDoUpdate({
          target: [userGamificationProfiles.userId, userGamificationProfiles.organizationId],
          set: { totalPoints: xp }
        });

        // Give a badge
        if (orgBadges.length > 0) {
          await db.insert(userBadges).values({
            id: createId(),
            organizationId: org.id,
            userId: student.id,
            badgeId: orgBadges[0].id
          }).onConflictDoNothing();
        }

        // Enroll in first course if exists
        if (orgCourses.length > 0) {
          await db.insert(enrollments).values({
            id: createId(),
            studentId: student.id,
            courseId: orgCourses[0].id
          }).onConflictDoNothing();
        }

        xp = Math.max(0, xp - 50);
      }
      console.log('   ✅ XP and enrollments seeded for students');
    }
  }

  console.log('\n🎉 Global Gamification Seeding Complete (Icons)!');
  process.exit(0);
}

seedGlobalGamification().catch(err => {
  console.error(err);
  process.exit(1);
});
