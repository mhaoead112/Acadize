import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import type {
    GamificationSettings,
    GamificationPointRule,
    GamificationBadge,
    GamificationReportSummary,
} from '@shared/gamification.types';

// ---------------------------------------------------------------------------
// Local types for request payloads not already in shared types
// ---------------------------------------------------------------------------

export type UpdateSettingsPayload = Partial<
    Pick<
        GamificationSettings,
        | 'enabled'
        | 'pointsEnabled'
        | 'levelsEnabled'
        | 'badgesEnabled'
        | 'leaderboardEnabled'
        | 'levelNaming'
        | 'pointNaming'
    >
>;

export type UpdateRuleItem = {
    eventType: GamificationPointRule['eventType'];
    points: number;
    isActive: boolean;
};

export type UpdateRulesPayload = { rules: UpdateRuleItem[] };

export type CreateBadgePayload = {
    name: string;
    description: string;
    emoji?: string | null;
    criteriaType: GamificationBadge['criteriaType'];
    criteriaValue: number;
    courseId?: string | null;
    isActive?: boolean;
};

export type UpdateBadgePayload = Partial<CreateBadgePayload> & {
    archived?: boolean; // true = archive, false = restore
};

export type ReportFilters = {
    courseId?: string;
    startDate?: Date | string;
    endDate?: Date | string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Shared auth fetch — mirrors the pattern in useStudentDashboard.ts */
const fetchWithAuth = async (url: string, token: string | null) => {
    if (!token) throw new Error('No auth token');
    const res = await fetch(apiEndpoint(url), {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    if (!res.ok) {
        // Surface backend error message when present (matches admin-settings.tsx pattern)
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Request failed: ${res.status}`);
    }
    return res.json();
};

const mutateWithAuth = async (
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    token: string | null,
    body?: unknown,
) => {
    if (!token) throw new Error('No auth token');
    const res = await fetch(apiEndpoint(url), {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `Request failed: ${res.status}`);
    }
    return res.json();
};

// ---------------------------------------------------------------------------
// Query keys (centralised so mutations can invalidate precisely)
// ---------------------------------------------------------------------------

const QK = {
    settings: ['gamification-settings'] as const,
    rules: ['gamification-rules'] as const,
    badges: (includeArchived: boolean) => ['gamification-badges', includeArchived] as const,
    report: (filters: ReportFilters) => ['gamification-report', filters] as const,
    quests: ['gamification-quests-admin'] as const,
} as const;

// ===========================================================================
// 1. useGamificationSettings  —  GET /api/admin/gamification/settings
// ===========================================================================

/**
 * Fetches the org's gamification feature flags and naming configuration.
 * Returns defaults from the server when the org has no row yet.
 */
export function useGamificationSettings() {
    const { token } = useAuth();

    return useQuery<GamificationSettings>({
        queryKey: QK.settings,
        queryFn: () => fetchWithAuth('/api/admin/gamification/settings', token),
        enabled: !!token,
        staleTime: 2 * 60 * 1000,
    });
}

// ===========================================================================
// 2. useUpdateGamificationSettings  —  PUT /api/admin/gamification/settings
// ===========================================================================

/**
 * Updates gamification feature flags and naming.
 * Invalidates the settings query on success.
 */
export function useUpdateGamificationSettings() {
    const { token } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation<GamificationSettings, Error, UpdateSettingsPayload>({
        mutationFn: (payload) =>
            mutateWithAuth('/api/admin/gamification/settings', 'PUT', token, payload),
        onSuccess: () => {
            toast({
                title: 'Settings saved',
                description: 'Gamification settings have been updated.',
            });
            queryClient.invalidateQueries({ queryKey: QK.settings });
            // Also invalidate the rules list in case seeding just happened
            queryClient.invalidateQueries({ queryKey: QK.rules });
        },
        onError: (err) =>
            toast({
                title: 'Failed to save settings',
                description: err.message,
                variant: 'destructive',
            }),
    });
}

// ===========================================================================
// 3. useGamificationRules  —  GET /api/admin/gamification/rules
// ===========================================================================

/**
 * Fetches the org's 6 point rules (one per event type).
 * Seeds defaults server-side when none exist.
 */
export function useGamificationRules() {
    const { token } = useAuth();

    return useQuery<GamificationPointRule[]>({
        queryKey: QK.rules,
        queryFn: async () => {
            const data = await fetchWithAuth('/api/admin/gamification/rules', token);
            // API may return { rules: [...] } or a bare array — normalise both
            return Array.isArray(data) ? data : (data.rules ?? []);
        },
        enabled: !!token,
        staleTime: 2 * 60 * 1000,
    });
}

// ===========================================================================
// 4. useUpdateGamificationRules  —  PUT /api/admin/gamification/rules
// ===========================================================================

/**
 * Bulk-updates point rules for all 6 event types.
 * Invalidates the rules query on success.
 */
export function useUpdateGamificationRules() {
    const { token } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation<GamificationPointRule[], Error, UpdateRulesPayload>({
        mutationFn: (payload) =>
            mutateWithAuth('/api/admin/gamification/rules', 'PUT', token, payload),
        onSuccess: () => {
            toast({
                title: 'Rules updated',
                description: 'Point rules have been saved successfully.',
            });
            queryClient.invalidateQueries({ queryKey: QK.rules });
        },
        onError: (err) =>
            toast({
                title: 'Failed to update rules',
                description: err.message,
                variant: 'destructive',
            }),
    });
}

// ===========================================================================
// 5. useAdminBadges  —  GET /api/admin/gamification/badges
// ===========================================================================

/**
 * Fetches all badges for the org.
 *
 * @param includeArchived - When true, archived badges are included (default: false)
 */
export function useAdminBadges(includeArchived = false) {
    const { token } = useAuth();

    return useQuery<GamificationBadge[]>({
        queryKey: QK.badges(includeArchived),
        queryFn: async () => {
            const url = `/api/admin/gamification/badges${includeArchived ? '?includeArchived=true' : ''}`;
            const data = await fetchWithAuth(url, token);
            return Array.isArray(data) ? data : (data.badges ?? []);
        },
        enabled: !!token,
        staleTime: 2 * 60 * 1000,
    });
}

// ===========================================================================
// 6. useCreateBadge  —  POST /api/admin/gamification/badges
// ===========================================================================

/**
 * Creates a new gamification badge for the org.
 * Invalidates both archived and non-archived badge lists on success.
 */
export function useCreateBadge() {
    const { token } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation<GamificationBadge, Error, CreateBadgePayload>({
        mutationFn: (payload) =>
            mutateWithAuth('/api/admin/gamification/badges', 'POST', token, payload),
        onSuccess: (badge) => {
            toast({
                title: 'Badge created',
                description: `"${badge.name}" has been added to your badge collection.`,
            });
            // Invalidate both list variants
            queryClient.invalidateQueries({ queryKey: ['gamification-badges'] });
        },
        onError: (err) =>
            toast({
                title: 'Failed to create badge',
                description: err.message,
                variant: 'destructive',
            }),
    });
}

// ===========================================================================
// 7. useUpdateBadge  —  PUT /api/admin/gamification/badges/:id
// ===========================================================================

/**
 * Updates an existing badge by ID.
 * Pass `archived: true` to soft-delete or `archived: false` to restore.
 * Invalidates all badge list queries on success.
 */
export function useUpdateBadge() {
    const { token } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation<GamificationBadge, Error, { id: string; payload: UpdateBadgePayload }>({
        mutationFn: ({ id, payload }) =>
            mutateWithAuth(`/api/admin/gamification/badges/${id}`, 'PUT', token, payload),
        onSuccess: (badge, { payload }) => {
            const action = payload.archived === true
                ? 'archived'
                : payload.archived === false
                    ? 'restored'
                    : 'updated';
            toast({
                title: `Badge ${action}`,
                description: `"${badge.name}" has been ${action} successfully.`,
            });
            queryClient.invalidateQueries({ queryKey: ['gamification-badges'] });
        },
        onError: (err) =>
            toast({
                title: 'Failed to update badge',
                description: err.message,
                variant: 'destructive',
            }),
    });
}

// ===========================================================================
// 8. useGamificationReport  —  GET /api/admin/gamification/reports
// ===========================================================================

/**
 * Fetches the aggregated gamification analytics report for the org.
 *
 * @param filters - Optional courseId, startDate, and endDate filters
 */
export function useGamificationReport(filters: ReportFilters = {}) {
    const { token } = useAuth();

    // Build query string from non-empty filters
    const params = new URLSearchParams();
    if (filters.courseId) params.set('courseId', filters.courseId);
    if (filters.startDate) {
        params.set(
            'startDate',
            filters.startDate instanceof Date
                ? filters.startDate.toISOString()
                : filters.startDate,
        );
    }
    if (filters.endDate) {
        params.set(
            'endDate',
            filters.endDate instanceof Date
                ? filters.endDate.toISOString()
                : filters.endDate,
        );
    }
    const qs = params.toString();
    const url = `/api/admin/gamification/reports${qs ? `?${qs}` : ''}`;

    return useQuery<GamificationReportSummary>({
        queryKey: QK.report(filters),
        queryFn: () => fetchWithAuth(url, token),
        enabled: !!token,
        staleTime: 5 * 60 * 1000, // reports can be cached longer
    });
}

// ===========================================================================
// 9. useQuestTemplates  —  GET /api/admin/gamification/quests
// ===========================================================================

/** Fetches all quest templates for the organization. */
export function useQuestTemplates() {
    const { token } = useAuth();

    return useQuery<any[]>({
        queryKey: QK.quests,
        queryFn: () => fetchWithAuth('/api/admin/gamification/quests', token),
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    });
}

// ===========================================================================
// 10. useUpdateQuestTemplate  —  PATCH /api/admin/gamification/quests/:id
// ===========================================================================

/** Updates a quest template. */
export function useUpdateQuestTemplate() {
    const { token } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: string; payload: any }>({
        mutationFn: ({ id, payload }) =>
            mutateWithAuth(`/api/admin/gamification/quests/${id}`, 'PATCH', token, payload),
        onSuccess: () => {
            toast({
                title: 'Quest updated',
                description: 'The quest template has been saved successfully.',
            });
            queryClient.invalidateQueries({ queryKey: QK.quests });
        },
        onError: (err) =>
            toast({
                title: 'Failed to update quest',
                description: err.message,
                variant: 'destructive',
            }),
    });
}
