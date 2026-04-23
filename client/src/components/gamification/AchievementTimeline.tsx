import { formatDistanceToNow } from 'date-fns';
import { BookOpen, CheckSquare, FileText, GraduationCap, Medal, PlayCircle } from 'lucide-react';
import { GamificationEvent, GamificationEventType } from '@shared/gamification.types';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AchievementTimelineProps {
  events: GamificationEvent[];
  isLoading: boolean;
}

const getEventIcon = (eventType: GamificationEventType) => {
  switch (eventType) {
    case 'lesson_completion':
      return <PlayCircle className="h-4 w-4" />;
    case 'quiz_completion':
      return <CheckSquare className="h-4 w-4" />;
    case 'exam_completion':
      return <GraduationCap className="h-4 w-4" />;
    case 'assignment_submission':
    case 'assignment_graded_pass':
      return <FileText className="h-4 w-4" />;
    case 'course_completion':
      return <BookOpen className="h-4 w-4" />;
    default:
      return <Medal className="h-4 w-4" />;
  }
};

const getEventDescription = (event: GamificationEvent) => {
  switch (event.eventType) {
    case 'lesson_completion':
      return 'Completed a lesson';
    case 'quiz_completion':
      return 'Completed a quiz';
    case 'exam_completion':
      return 'Passed an exam';
    case 'assignment_submission':
      return 'Submitted an assignment';
    case 'assignment_graded_pass':
      return 'Received a passing grade on an assignment';
    case 'course_completion':
      return 'Completed a course';
    default:
      return `Completed ${event.entityType}`;
  }
};

export default function AchievementTimeline({ events, isLoading }: AchievementTimelineProps) {
  if (isLoading) {
    return (
      <div className="relative space-y-6 pl-8">
        <div className="absolute bottom-0 left-3.5 top-2 w-[2px] bg-border" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative">
            <div className="absolute -left-8 top-1 flex h-7 w-7 items-center justify-center rounded-full border bg-background">
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={<Medal className="h-12 w-12 text-muted-foreground" />}
        title="No activity yet"
        description="Start learning to earn your first XP!"
      />
    );
  }

  return (
    <div className="relative space-y-6 pl-8">
      {/* Connecting vertical line */}
      <div className="absolute bottom-4 left-[15px] top-4 w-[2px] bg-border/50" />

      {events.map((event) => (
        <div key={event.id} className="relative group">
          {/* Timeline marker */}
          <div className="absolute -left-8 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm transition-colors group-hover:border-primary group-hover:text-primary z-10">
            {getEventIcon(event.eventType)}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent/50">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                {getEventDescription(event)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
              </p>
            </div>
            
            <div className="mt-2 sm:mt-0 flex w-fit items-center justify-center rounded-full bg-yellow-500/10 px-3 py-1 border border-yellow-500/20 text-xs font-bold text-yellow-600 dark:text-yellow-500">
              +{event.pointsAwarded} XP
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
