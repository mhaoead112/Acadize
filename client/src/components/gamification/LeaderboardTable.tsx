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
import { Trophy, Users, Medal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('gamification');

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
        title={t('leaderboardPage.table.disabledTitle')}
        description={t('leaderboardPage.table.disabledDesc')}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12 text-muted-foreground" />}
        title={t('leaderboardPage.table.noPeersTitle')}
        description={t('leaderboardPage.table.noPeersDesc')}
      />
    );
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500 mx-auto" />;
      case 2:
        return <Medal className="h-6 w-6 text-slate-400 mx-auto" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600 mx-auto" />;
      default:
        return <span className="text-muted-foreground">#{rank}</span>;
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
            <span>{t('leaderboardPage.table.lvl')} {entry.currentLevelNumber}</span>
            <span>{entry.badgeCount} {t('leaderboardPage.table.badges')}</span>
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
              <span className="font-medium text-foreground">{t('leaderboardPage.table.yourRank')}</span>
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
              <TableHead className="w-20 text-center">{t('leaderboardPage.table.colRank')}</TableHead>
              <TableHead>{t('leaderboardPage.table.colName')}</TableHead>
              <TableHead className="text-center">{t('leaderboardPage.table.colLevel')}</TableHead>
              <TableHead className="text-center">{t('leaderboardPage.table.colPoints')}</TableHead>
              <TableHead className="text-center">{t('leaderboardPage.table.colBadges')}</TableHead>
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
                          {t('leaderboardPage.table.you')}
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
            <span className="font-medium">{t('leaderboardPage.table.yourRank')}</span>
            <span className="font-bold">#{userRank}</span>
          </div>
        )}
      </div>
    </div>
  );
}
