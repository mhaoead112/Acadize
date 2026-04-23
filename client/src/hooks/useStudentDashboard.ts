import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';

interface Course {
    id: string;
    title: string;
    description: string;
    teacherId: string;
    status: string;
    imageUrl?: string | null;
}

interface Enrollment {
    courseId: string;
    course: Course;
}

interface Announcement {
    id: string;
    courseId: string;
    teacherId: string;
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
    courseName?: string;
}

interface Assignment {
    id: string;
    title: string;
    dueDate: string;
    courseId: string;
    courseName?: string;
    status?: 'pending' | 'submitted' | 'graded';
    priority?: 'high' | 'medium' | 'low';
}

interface OverallProgress {
    totalScore: number;
    totalMaxScore: number;
    progressPercentage: number;
    totalBonusPoints: number;
    assignmentsCompleted: number;
    totalAssignments: number;
}

interface StreakInfo {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    weeklyGoalHours: number;
    currentWeekHours: number;
    weeklyProgress: number;
}

interface CourseProgress {
    courseId: string;
    courseName?: string;
    progressPercentage: number;
}

const fetchWithAuth = async (url: string, token: string | null) => {
    if (!token) throw new Error('No auth token');
    const res = await fetch(apiEndpoint(url), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
};

const extractList = <T>(payload: unknown): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { data?: unknown }).data)
    ) {
        return (payload as { data: T[] }).data;
    }
    return [];
};

export function useStudentEnrollments() {
    const { token } = useAuth();

    return useQuery<Enrollment[]>({
        queryKey: ['enrollments', 'student'],
        queryFn: async () => {
            const data = await fetchWithAuth('/api/enrollments/student', token);
            const enrollmentsList = extractList<any>(data);
            return enrollmentsList
                .filter((e: any) => e.course)
                .map((e: any) => ({
                    courseId: e.courseId,
                    course: {
                        id: e.course.id,
                        title: e.course.title,
                        description: e.course.description,
                        teacherId: e.course.teacherId,
                        status: e.course.isPublished ? 'published' : 'draft',
                        imageUrl: e.course.imageUrl,
                    }
                }));
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    });
}

export function useStudentProgress() {
    const { token } = useAuth();

    return useQuery<{ overallProgress: OverallProgress; courseProgress: CourseProgress[] }>({
        queryKey: ['progress', 'student'],
        queryFn: async () => {
            const [overallProgress, courseProgress] = await Promise.all([
                fetchWithAuth('/api/progress/overall', token),
                fetchWithAuth('/api/progress/courses', token),
            ]);

            return {
                overallProgress,
                courseProgress: Array.isArray(courseProgress) ? courseProgress : [],
            };
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    });
}

export function useStudentStreak() {
    const { token } = useAuth();

    return useQuery<StreakInfo>({
        queryKey: ['streak'],
        queryFn: () => fetchWithAuth('/api/streaks/me', token),
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCourseAnnouncements(courseId: string) {
    const { token } = useAuth();

    return useQuery<Announcement[]>({
        queryKey: ['announcements', 'course', courseId],
        queryFn: async () => {
            const data = await fetchWithAuth(`/api/announcements/course/${courseId}`, token);
            return data?.announcements || [];
        },
        enabled: !!token && !!courseId,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCourseAssignments(courseId: string) {
    const { token } = useAuth();

    return useQuery<Assignment[]>({
        queryKey: ['assignments', 'course', courseId],
        queryFn: async () => {
            const data = await fetchWithAuth(`/api/assignments/courses/${courseId}/assignments`, token);
            return Array.isArray(data) ? data : [];
        },
        enabled: !!token && !!courseId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Aggregate hook for student dashboard - fetches all data in parallel
 */
export function useStudentDashboard() {
    const enrollmentsQuery = useStudentEnrollments();
    const progressQuery = useStudentProgress();
    const streakQuery = useStudentStreak();

    const isLoading = enrollmentsQuery.isLoading || progressQuery.isLoading || streakQuery.isLoading;
    const isError = enrollmentsQuery.isError || progressQuery.isError || streakQuery.isError;

    return {
        enrollments: enrollmentsQuery.data || [],
        progress: progressQuery.data?.overallProgress || {
            totalScore: 0,
            totalMaxScore: 0,
            progressPercentage: 0,
            totalBonusPoints: 0,
            assignmentsCompleted: 0,
            totalAssignments: 0,
        },
        courseProgress: progressQuery.data?.courseProgress || [],
        streak: streakQuery.data || {
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            weeklyGoalHours: 10,
            currentWeekHours: 0,
            weeklyProgress: 0,
        },
        isLoading,
        isError,
        refetch: () => {
            enrollmentsQuery.refetch();
            progressQuery.refetch();
            streakQuery.refetch();
        },
    };
}
