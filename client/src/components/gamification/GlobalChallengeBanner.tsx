import { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { 
  Trophy, 
  Timer, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Target
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  premiumCardVariants, 
  premiumMotionEase, 
  premiumMotionDurations 
} from "@/lib/animations";

interface GlobalChallengeBannerProps {
  challengeProgress: {
    challenge: {
      id: string;
      title: string;
      description: string;
      conditionType: string;
      conditionValue: number;
      xpReward: number;
      buffType: string;
      buffValue: string;
      buffDurationMinutes: number;
    } | null;
    completed: boolean;
    completedAt: string | null;
    progress: number;
    remainingSeconds: number;
  } | null;
  activeBuffs: Array<{
    id: string;
    buffType: string;
    buffValue: string;
    expiresAt: string;
  }>;
}

export function GlobalChallengeBanner({ challengeProgress, activeBuffs }: GlobalChallengeBannerProps) {
  const [timeLeft, setTimeLeft] = useState(challengeProgress?.remainingSeconds ?? 0);

  useEffect(() => {
    if (challengeProgress?.remainingSeconds) {
      setTimeLeft(challengeProgress.remainingSeconds);
    }
  }, [challengeProgress?.remainingSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const activeMultiplier = useMemo(() => {
    const xpBuff = activeBuffs.find(b => b.buffType === 'xp_multiplier');
    return xpBuff ? xpBuff.buffValue : null;
  }, [activeBuffs]);

  if (!challengeProgress?.challenge) return null;

  const { challenge, completed, progress } = challengeProgress;
  const progressPercent = Math.min(100, (progress / challenge.conditionValue) * 100);

  return (
    <m.div
      variants={premiumCardVariants}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#0d1b3e]"
    >
      {/* Background Accent */}
      <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/5"></div>
      <div className="absolute left-0 bottom-0 -ml-16 -mb-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-400/5"></div>

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          
          <div className="space-y-4 md:max-w-[60%]">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                <Target className="mr-1 h-3 w-3" />
                Global Daily Challenge
              </Badge>
              {completed ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Completed
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-200 text-orange-600 dark:border-orange-900/50 dark:text-orange-400">
                  <Timer className="mr-1 h-3 w-3" />
                  {formatTime(timeLeft)}
                </Badge>
              )}
              {activeMultiplier && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse">
                  <Zap className="mr-1 h-3 w-3" />
                  {activeMultiplier}x XP Multiplier Active
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                {challenge.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 md:text-lg">
                {challenge.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Progress: {progress} / {challenge.conditionValue}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-3 bg-slate-100 dark:bg-[#1a2b53]" 
                indicatorClassName={cn(
                  "transition-all duration-500",
                  completed ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
                )}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-6 dark:bg-[#152347] md:min-w-[240px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg dark:bg-[#1a2b53]">
              <Trophy className={cn("h-8 w-8", completed ? "text-amber-500" : "text-slate-400")} />
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Reward upon completion</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">+{challenge.xpReward} XP</span>
                <span className="text-slate-400">&</span>
                <span className="text-xl font-bold text-amber-500">{challenge.buffValue}x Buff</span>
              </div>
            </div>

            {!completed && (
              <Button asChild className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#FFD700] dark:text-slate-900 dark:hover:bg-yellow-500">
                <Link href="/student/courses">
                  Start Learning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

        </div>
      </div>
    </m.div>
  );
}
