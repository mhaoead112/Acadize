import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Trophy, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Quest {
  id: string;
  title: string;
  description: string;
  questType: 'daily' | 'weekly';
  progress: number;
  goal: number;
  xpReward: number;
  completed: boolean;
  expiresAt: string;
  pct: number;
}

interface QuestsResponse {
  daily: Quest[];
  weekly: Quest[];
}

function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

const QuestCard = React.forwardRef<HTMLDivElement, { quest: Quest; isWeekly?: boolean }>(
  function QuestCard({ quest, isWeekly }, ref) {
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 group hover:shadow-md border-border/40",
        quest.completed 
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40" 
          : isWeekly 
            ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/40" 
            : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 backdrop-blur-sm"
      )}>
        {quest.completed && (
          <div className="absolute top-0 right-0 p-1">
             <div className="bg-emerald-500 text-white dark:bg-emerald-600 rounded-bl-lg px-2 py-0.5 text-[9px] font-black flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" /> COMPLETED
             </div>
          </div>
        )}

        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1">
              <h4 className={cn(
                "font-bold text-base leading-tight flex items-center gap-2",
                quest.completed ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-slate-100"
              )}>
                {quest.title}
                {quest.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                {quest.description}
              </p>
            </div>
            
            <div className="text-right ml-4 shrink-0">
              <div className="text-sm font-black text-amber-500 dark:text-amber-400 flex items-center justify-end gap-1">
                <Trophy className="h-3.5 w-3.5" />
                +{quest.xpReward} XP
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Progress</span>
              <span className={cn(quest.completed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300")}>
                {quest.progress} / {quest.goal}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${quest.pct}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  quest.completed ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] dark:shadow-[0_0_10px_rgba(16,185,129,0.15)]" : isWeekly ? "bg-purple-500" : "bg-amber-500"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

export function DailyQuestPanel() {
  const { data, isLoading } = useQuery<QuestsResponse>({
    queryKey: ['/api/gamification/quests'],
  });

  if (isLoading) {
    return (
      <Card className="w-full h-[400px] animate-pulse bg-muted/50 border-dashed" />
    );
  }

  const dailyQuests = data?.daily || [];
  const weeklyQuests = data?.weekly || [];

  return (
    <div className="space-y-8 p-1">
      {/* Daily Quests Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Daily Quests</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Resets in {getTimeUntilReset()}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-200">
            {dailyQuests.filter(q => q.completed).length}/{dailyQuests.length} Done
          </Badge>
        </div>

        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {dailyQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Weekly Quests Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Trophy className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Weekly Milestone</h3>
              <p className="text-xs text-muted-foreground">Big rewards for consistent effort</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {weeklyQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} isWeekly />
          ))}
        </div>
      </section>
    </div>
  );
}
