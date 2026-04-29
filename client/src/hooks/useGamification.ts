import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import type {
    GamificationMeResponse,
    GamificationBadgesResponse,
    GamificationLeaderboardResponse,
    GamificationActivityResponse,
} from '@shared/gamification.types';

// ---------------------------------------------------------------------------
// Internal fetch helper (mirrors the pattern in useStudentDashboard.ts)
// ---------------------------------------------------------------------------

const fetchWithAuth = async (url: string, token: string | null) => {
    if (!token) throw new Error('No auth token');
    const res = await fetch(apiEndpoint(url), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return res.json();
};

// ---------------------------------------------------------------------------
// Hook: useGamificationProfile
// GET /api/gamification/me
// ---------------------------------------------------------------------------

/**
 * Returns the authenticated student's full gamification profile including
 * recent badges and recent point events.
 */
export function useGamificationProfile() {
    const { token } = useAuth();

    return useQuery<GamificationMeResponse>({
        queryKey: ['gamification', 'profile'],
        queryFn: () => fetchWithAuth('/api/gamification/me', token),
        enabled: !!token,
        staleTime: 60 * 1000, // 1 min – profile updates on point awards
    });
}

// ---------------------------------------------------------------------------
// Hook: useMyBadges
// GET /api/gamification/me/badges?earned=...
// ---------------------------------------------------------------------------

export type BadgeFilter = 'all' | 'earned' | 'available';

/**
 * Returns the student's earned badges and/or the org's available badges
 * depending on the filter.
 *
 * @param filter - 'all' (default) | 'earned' | 'available'
 */
export function useMyBadges(filter: BadgeFilter = 'all') {
    const { token } = useAuth();

    return useQuery<GamificationBadgesResponse>({
        queryKey: ['gamification', 'badges', filter],
        queryFn: () =>
            fetchWithAuth(`/api/gamification/me/badges?earned=${filter}`, token),
        enabled: !!token,
        staleTime: 2 * 60 * 1000, // 2 min
    });
}

// ---------------------------------------------------------------------------
// Hook: useLeaderboard
// GET /api/gamification/leaderboard?courseId=...
// ---------------------------------------------------------------------------

/**
 * Returns the course-scoped leaderboard, the current user's rank, and
 * whether the leaderboard feature is enabled for the org.
 *
 * The query is disabled (no request made) when courseId is falsy.
 *
 * @param courseId - The course to scope the leaderboard to. Pass null to skip.
 */
export function useLeaderboard(courseId: string | null) {
    const { token } = useAuth();

    return useQuery<GamificationLeaderboardResponse>({
        queryKey: ['gamification', 'leaderboard', courseId],
        queryFn: () =>
            fetchWithAuth(`/api/gamification/leaderboard?courseId=${courseId}`, token),
        enabled: !!token && !!courseId,
        staleTime: 30 * 1000, // 30 s – leaderboard is relatively live
    });
}

// ---------------------------------------------------------------------------
// Hook: useGamificationActivity
// GET /api/gamification/activity?limit=...&offset=...
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of the student's point-award events (activity feed).
 *
 * @param page  - 1-indexed page number (default: 1)
 * @param limit - Number of events per page (default: 20)
 */
export function useGamificationActivity(page = 1, limit = 20) {
    const { token } = useAuth();
    const offset = (page - 1) * limit;

    return useQuery<GamificationActivityResponse>({
        queryKey: ['gamification', 'activity', page],
        queryFn: () =>
            fetchWithAuth(
                `/api/gamification/activity?limit=${limit}&offset=${offset}`,
                token,
            ),
        enabled: !!token,
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData, // keep old page visible while fetching next
    });
}
// ---------------------------------------------------------------------------
// Mutation: useToggleFeatureBadge
// POST /api/gamification/badges/:id/feature
// ---------------------------------------------------------------------------

/**
 * Toggles a badge's featured status on the learner's profile.
 * Invalidates the profile query on success.
 */
export function useToggleFeatureBadge() {
    const { token } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (badgeId: string) => {
            if (!token) throw new Error('No auth token');
            const res = await fetch(apiEndpoint(`/api/gamification/badges/${badgeId}/feature`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || 'Failed to toggle featured status');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamification', 'profile'] });
        },
    });
}
