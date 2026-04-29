
import os

filepath = r"d:\VIisual Studio Code\Eduverse-redesign\server\src\services\gamification.service.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update recentBadgeRows select
old_badge_select = """        awardedAt: userBadges.awardedAt,
      })"""
new_badge_select = """        awardedAt: userBadges.awardedAt,
        rarity: gamificationBadges.rarity,
        storyText: gamificationBadges.storyText,
      })"""

# 2. Add featuredBadgeRows query
old_featured_marker = """.limit(5);"""
new_featured_query = """.limit(5);

    // Featured badges (max 3)
    const featuredBadgeRows = await db
      .select({
        id: gamificationBadges.id,
        name: gamificationBadges.name,
        description: gamificationBadges.description,
        storyText: gamificationBadges.storyText,
        emoji: gamificationBadges.emoji,
        rarity: gamificationBadges.rarity,
        awardedAt: userBadges.awardedAt,
        displayOrder: userFeaturedBadges.displayOrder,
      })
      .from(userFeaturedBadges)
      .innerJoin(gamificationBadges, eq(userFeaturedBadges.badgeId, gamificationBadges.id))
      .innerJoin(userBadges, and(
        eq(userBadges.userId, userFeaturedBadges.userId),
        eq(userBadges.badgeId, userFeaturedBadges.badgeId)
      ))
      .where(
        and(
          eq(userFeaturedBadges.userId, userId),
        )
      )
      .orderBy(userFeaturedBadges.displayOrder)
      .limit(3);"""

# 3. Update return object
old_return_badges = """      recentBadges: recentBadgeRows.map((b) => ({
        id: b.id,
        organizationId: b.organizationId,
        name: b.name,
        description: b.description,
        emoji: b.emoji,
        criteriaType: b.criteriaType as any,
        criteriaValue: b.criteriaValue,
        courseId: b.courseId,
        isActive: b.isActive,
        archivedAt: toISO(b.archivedAt),
        createdAt: toISO(b.createdAt)!,
        updatedAt: toISO(b.updatedAt),
        awardedAt: toISO(b.awardedAt)!,
      })),"""

new_return_badges = """      recentBadges: recentBadgeRows.map((b) => ({
        ...b,
        criteriaType: b.criteriaType as any,
        archivedAt: toISO(b.archivedAt),
        createdAt: toISO(b.createdAt)!,
        updatedAt: toISO(b.updatedAt),
        awardedAt: toISO(b.awardedAt)!,
      })),
      featuredBadges: featuredBadgeRows.map((b) => ({
        ...b,
        awardedAt: toISO(b.awardedAt)!,
      })),"""

if old_badge_select in content:
    content = content.replace(old_badge_select, new_badge_select)
else:
    print("Could not find old_badge_select")

if old_featured_marker in content:
    content = content.replace(old_featured_marker, new_featured_query, 1) # Only first one
else:
    print("Could not find old_featured_marker")

if old_return_badges in content:
    content = content.replace(old_return_badges, new_return_badges)
else:
    print("Could not find old_return_badges")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done via Python")
