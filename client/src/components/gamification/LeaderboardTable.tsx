import { GamificationLeaderboardEntry } from '@shared/gamification.types';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Trophy, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LeaderboardTableProps {
  entries: GamificationLeaderboardEntry[];
  currentUserId: string;
  userRank: number | null;
  enabled: boolean;
  isLoading: boolean;
}

export default function LeaderboardTable({
  entries,
  currentUserId,
  userRank,
  enabled,
  isLoading,
}: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[80px]" />
            </div>
            <Skeleton className="h-4 w-[60px]" />
          </div>
        ))}
      </div>
    );
  }

  if (!enabled) {
    return (
      <EmptyState
        icon={<Trophy className="h-12 w-12 text-muted-foreground" />}
        title="Leaderboard Disabled"
        description="Leaderboard is disabled for this course."
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12 text-muted-foreground" />}
        title="No ranked peers yet"
        description="There are no users to display on the leaderboard right now."
      />
    );
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const currentUserInEntries = entries.some((e) => e.userId === currentUserId);
  const showPinnedUserRank = !currentUserInEntries && userRank !== null;

  const renderRowCard = (entry: GamificationLeaderboardEntry) => {
    const isCurrentUser = entry.userId === currentUserId;

    return (
      <Card
        key={entry.userId}
        className={cn(
          'flex items-center gap-4 p-4 md:hidden',
          isCurrentUser && 'border-l-4 border-l-yellow-500 bg-yellow-500/10 dark:bg-yellow-500/5'
        )}
      >
        <div className="flex w-8 items-center justify-center font-bold text-lg">
          {getRankBadge(entry.rank)}
        </div>
        <Avatar className="h-10 w-10 border bg-background">
          <AvatarImage src={entry.avatarUrl || undefined} alt={entry.fullName} />
          <AvatarFallback>{getInitials(entry.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <div className="truncate font-medium">{entry.fullName}</div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Lvl {entry.currentLevelNumber}</span>
            <span>{entry.badgeCount} badges</span>
          </div>
        </div>
        <div className="font-bold text-primary">{entry.totalPoints} XP</div>
      </Card>
    );
  };

  return (
    <div className="w-full">
      {/* Mobile Card Layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {entries.map(renderRowCard)}
        {showPinnedUserRank && (
          <>
            <div className="my-2 border-t border-dashed" />
            <div className="flex items-center justify-between rounded-lg border-l-4 border-l-yellow-500 bg-yellow-500/10 p-4 dark:bg-yellow-500/5">
              <span className="font-medium text-foreground">Your rank:</span>
              <span className="font-bold">#{userRank}</span>
            </div>
          </>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-center">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead className="text-center">Points</TableHead>
              <TableHead className="text-center">Badges</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;

              return (
                <TableRow
                  key={entry.userId}
                  className={cn(
                    isCurrentUser && 'border-l-4 border-l-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 dark:bg-yellow-500/5 dark:hover:bg-yellow-500/10'
                  )}
                >
                  <TableCell className="text-center font-bold text-lg">
                    {getRankBadge(entry.rank)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border bg-background">
                        <AvatarImage src={entry.avatarUrl || undefined} alt={entry.fullName} />
                        <AvatarFallback>{getInitials(entry.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{entry.fullName}</span>
                      {isCurrentUser && (
                        <span className="ml-2 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                          You
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{entry.currentLevelNumber}</TableCell>
                  <TableCell className="text-center font-bold">{entry.totalPoints}</TableCell>
                  <TableCell className="text-center">{entry.badgeCount}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {showPinnedUserRank && (
          <div className="flex items-center justify-between border-t border-l-4 border-dashed border-l-yellow-500 bg-yellow-500/10 px-6 py-4 dark:bg-yellow-500/5">
            <span className="font-medium">Your rank:</span>
            <span className="font-bold">#{userRank}</span>
          </div>
        )}
      </div>
    </div>
  );
}
