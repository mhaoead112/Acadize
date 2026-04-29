import { useEffect } from 'react';

interface XPToastProps {
  xpGained: number;
  reason: string;
  leveledUp?: boolean;
  newLevel?: number;
  onDismiss: () => void;
}

export function XPToast({ xpGained, reason, leveledUp, newLevel, onDismiss }: XPToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const reasonLabels: Record<string, string> = {
    lesson_complete: 'Lesson Complete',
    quiz_pass_first_try: 'First Try Pass!',
    exam_pass: 'Exam Passed!',
    exam_pass_above_90pct: 'Outstanding Exam!',
    streak_milestone: 'Streak Milestone!',
    assignment_submit: 'Assignment Submitted',
    daily_login: 'Daily Login Bonus'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 bg-yellow-400 text-slate-900 px-5 py-3 rounded-2xl shadow-xl font-bold">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-sm">{reasonLabels[reason] ?? reason}</p>
          <p className="text-lg">+{xpGained} XP</p>
        </div>
        {leveledUp && (
          <div className="ml-2 bg-slate-900 text-yellow-400 px-3 py-1 rounded-xl text-sm whitespace-nowrap animate-pulse">
            🎉 Level {newLevel}!
          </div>
        )}
      </div>
    </div>
  );
}
