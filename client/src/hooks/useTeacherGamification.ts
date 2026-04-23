import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import type { TeacherGamificationOverviewResponse } from '@shared/gamification.types';

// ---------------------------------------------------------------------------
// Internal fetch helper — identical pattern to useStudentDashboard.ts
// ---------------------------------------------------------------------------

const fetchWithAuth = async (url: string, token: string | null) => {
    if (!token) throw new Error('No auth token');
    const res = await fetch(apiEndpoint(url), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed: ${res.status}`);
    }
    return res.json();
};

// ===========================================================================
// useTeacherGamificationOverview
// GET /api/teacher/gamification/overview?courseId=...
// ===========================================================================

/**
 * Fetches the teacher's gamification overview for a given course.
 *
 * Returns:
 *   - leaderboard        — ranked list of students with points + badge count
 *   - topAchievers       — students with the most badges
 *   - lowEngagement      — students with the fewest points (intervention candidates)
 *   - badgeDistribution  — how many times each badge has been awarded in the course
 *
 * The query is disabled (no network request) when courseId is null or empty.
 *
 * @param courseId - The course to scope the overview to. Pass null to skip.
 */
export function useTeacherGamificationOverview(courseId: string | null) {
    const { token } = useAuth();

    return useQuery<TeacherGamificationOverviewResponse>({
        queryKey: ['teacher', 'gamification', 'overview', courseId],
        queryFn: () =>
            fetchWithAuth(
                `/api/teacher/gamification/overview?courseId=${courseId}`,
                token,
            ),
        enabled: !!token && !!courseId,
        staleTime: 60 * 1000, // 1 min — live enough for a teacher dashboard widget
    });
}
