import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';

interface QuestToastProps {
  title: string;
  xpAwarded: number;
  onDismiss: () => void;
}

export function QuestToast({ title, xpAwarded, onDismiss }: QuestToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-24 right-6 z-50 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        className="pointer-events-auto bg-slate-900 dark:bg-primary text-white p-1 rounded-2xl shadow-2xl overflow-hidden min-w-[300px]"
      >
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl flex items-center gap-4 border border-white/20">
          <div className="bg-yellow-400 text-slate-900 p-2 rounded-lg shrink-0 animate-bounce">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Quest Completed!</span>
              <Sparkles className="w-3 h-3 text-yellow-400" />
            </div>
            <h4 className="font-bold text-base leading-tight mt-0.5">{title}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-black text-yellow-400">+{xpAwarded} XP</span>
              <span className="text-[10px] text-white/60">added to your profile</span>
            </div>
          </div>
        </div>
        {/* Animated progress bar for auto-dismiss */}
        <motion.div 
          className="h-1 bg-yellow-400/50"
          initial={{ width: '100%' }}
          animate={{ width: 0 }}
          transition={{ duration: 5, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}
