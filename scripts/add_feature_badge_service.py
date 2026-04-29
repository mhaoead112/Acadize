
import os

filepath = r"d:\VIisual Studio Code\Eduverse-redesign\server\src\services\gamification.service.ts"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add toggleBadgeFeatured function at the end of the file before type exports or at a good spot.
# Let's find the last closing brace before the type exports.

insertion_point = content.find("export type GamificationSettings")
if insertion_point == -1:
    insertion_point = len(content)

new_service_func = """
/**
 * Toggles a badge's featured status on the user's profile.
 * Limit of 3 featured badges per user.
 */
export async function toggleBadgeFeatured(userId: string, badgeId: string): Promise<{ featured: boolean }> {
  try {
    // 1. Check if badge is earned
    const [earned] = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));

    if (!earned) {
      throw new Error("Cannot feature a badge you haven't earned yet.");
    }

    // 2. Check if already featured
    const [existing] = await db
      .select()
      .from(userFeaturedBadges)
      .where(and(eq(userFeaturedBadges.userId, userId), eq(userFeaturedBadges.badgeId, badgeId)));

    if (existing) {
      // Remove it
      await db
        .delete(userFeaturedBadges)
        .where(and(eq(userFeaturedBadges.userId, userId), eq(userFeaturedBadges.badgeId, badgeId)));
      return { featured: false };
    } else {
      // Add it - check limit first
      const featured = await db
        .select()
        .from(userFeaturedBadges)
        .where(eq(userFeaturedBadges.userId, userId));

      if (featured.length >= 3) {
        throw new Error("You can only feature up to 3 badges on your profile.");
      }

      await db.insert(userFeaturedBadges).values({
        userId,
        badgeId,
        displayOrder: featured.length,
      });
      return { featured: true };
    }
  } catch (err) {
    console.error('[toggleBadgeFeatured]', err);
    throw err;
  }
}

"""

new_content = content[:insertion_point] + new_service_func + content[insertion_point:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Added toggleBadgeFeatured to gamification.service.ts")
