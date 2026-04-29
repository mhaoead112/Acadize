import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type XPAwardEvent = {
  xpGained: number;
  reason: string;
  leveledUp: boolean;
  newLevel: number;
};

export type QuestCompletionEvent = {
  title: string;
  xpAwarded: number;
};

export function triggerXPAward(detail: XPAwardEvent) {
  window.dispatchEvent(new CustomEvent<XPAwardEvent>('xp-awarded', { detail }));
}

export function triggerQuestCompletion(detail: QuestCompletionEvent) {
  window.dispatchEvent(new CustomEvent<QuestCompletionEvent>('quest-completed', { detail }));
}

export function useXPAward() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<XPAwardEvent | null>(null);
  const [questToast, setQuestToast] = useState<QuestCompletionEvent | null>(null);

  useEffect(() => {
    const xpHandler = (e: CustomEvent<XPAwardEvent>) => {
      const xpResult = e.detail;
      if (!xpResult || xpResult.xpGained === 0) return;
      setToast(xpResult);
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
    };

    const questHandler = (e: CustomEvent<QuestCompletionEvent>) => {
      setQuestToast(e.detail);
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/quests'] });
    };

    window.addEventListener('xp-awarded', xpHandler as EventListener);
    window.addEventListener('quest-completed', questHandler as EventListener);
    return () => {
      window.removeEventListener('xp-awarded', xpHandler as EventListener);
      window.removeEventListener('quest-completed', questHandler as EventListener);
    };
  }, [queryClient]);

  const dismissToast = useCallback(() => setToast(null), []);
  const dismissQuestToast = useCallback(() => setQuestToast(null), []);

  return { toast, dismissToast, questToast, dismissQuestToast };
}
