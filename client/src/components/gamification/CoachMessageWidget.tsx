/**
 * CoachMessageWidget.tsx — Sprint D: AI Coach
 *
 * Renders a premium animated card showing a personalized message from
 * "Alex", the Eduverse AI learning coach.
 *
 * Features:
 *  • Shimmer skeleton while loading
 *  • Word-group typewriter reveal via framer-motion stagger
 *  • Pulsing avatar ring when AI is generating
 *  • "New message ↻" button with 30-second cooldown
 *  • Gracefully shows fallback UI on API error
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import { MascotCompanion } from '@/components/MascotCompanion';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CoachResponse {
  message: string;
  persona: string;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const COOLDOWN_SEC = 30;

// ─────────────────────────────────────────────────────────────
// TypewriterText — staggered word-group reveal
// ─────────────────────────────────────────────────────────────

function TypewriterText({ text }: { text: string }) {
  // Split into ~3-word groups for natural pacing
  const groups: string[] = [];
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    groups.push(words.slice(i, i + 3).join(' '));
  }

  return (
    <motion.p
      className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
      initial="hidden"
      animate="visible"
      key={text}              // re-mounts when message changes → re-runs animation
    >
      {groups.map((group, i) => (
        <motion.span
          key={i}
          className="inline"
          variants={{
            hidden: { opacity: 0, x: 8 },
            visible: {
              opacity: 1,
              x: 0,
              transition: {
                delay: i * 0.08,
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
              },
            },
          }}
        >
          {group}
          {i < groups.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.p>
  );
}

// ─────────────────────────────────────────────────────────────
// Shimmer skeleton
// ─────────────────────────────────────────────────────────────

function CoachSkeleton() {
  return (
    <div className="flex items-start gap-4 animate-pulse">
      {/* Avatar placeholder */}
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
      {/* Lines */}
      <div className="flex-1 space-y-3 pt-1">
        <div className="h-3 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-5/6 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────────────────────

export function CoachMessageWidget() {
  const { token } = useAuth();
  const [data, setData] = useState<CoachResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cooldown, setCooldown] = useState(0);          // seconds remaining
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessage = useCallback(
    async (force = false) => {
      if (!token) return;
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(
          apiEndpoint('/api/gamification/coach-message'),
          {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            // Pass cache-bust param when user explicitly requests a refresh
            ...(force ? { cache: 'no-store' } : {}),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: CoachResponse = await res.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  // Initial load
  useEffect(() => {
    fetchMessage(false);
  }, [fetchMessage]);

  // Cooldown tick
  const startCooldown = () => {
    setCooldown(COOLDOWN_SEC);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const handleRefresh = () => {
    if (cooldown > 0) return;
    startCooldown();
    // Invalidate cache by busting the server-side 5-min cache via a cache-bust query param
    // The server still returns the same cached msg if within TTL, but we force a UI re-render
    fetchMessage(true);
  };

  return (
    <motion.section
      className={cn(
        'relative overflow-hidden rounded-2xl border',
        'border-slate-200 bg-white dark:border-slate-800/70 dark:bg-[#0d1b3e]',
        'p-5 shadow-sm',
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle glow spot behind avatar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
      />

      <div className="relative flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <motion.div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              'border-2 border-primary/40 bg-primary/10 text-primary',
              loading && 'border-primary/70',
            )}
            animate={
              loading
                ? { boxShadow: ['0 0 0 0px rgba(var(--primary-rgb),0.3)', '0 0 0 8px rgba(var(--primary-rgb),0)', '0 0 0 0px rgba(var(--primary-rgb),0.3)'] }
                : {}
            }
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MascotCompanion state={loading ? 'thinking' : 'idle'} size={32} />
          </motion.div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-widest text-primary uppercase">
                Aiden · AI Coach
              </span>
              <Sparkles className="h-3 w-3 text-amber-400" />
            </div>

            {/* Refresh button */}
            <motion.button
              onClick={handleRefresh}
              disabled={cooldown > 0 || loading}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium',
                'border border-slate-200 dark:border-slate-700',
                'text-slate-500 dark:text-slate-400',
                'transition-colors hover:border-primary/50 hover:text-primary',
                'disabled:cursor-not-allowed disabled:opacity-40',
              )}
              whileTap={{ scale: 0.94 }}
            >
              <RefreshCw
                className={cn('h-3 w-3', loading && 'animate-spin')}
              />
              {cooldown > 0 ? `${cooldown}s` : 'New message'}
            </motion.button>
          </div>

          {/* Message area */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="skeleton" exit={{ opacity: 0 }}>
                <CoachSkeleton />
              </motion.div>
            ) : error ? (
              <motion.p
                key="error"
                className="text-sm text-slate-500 dark:text-slate-400 italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Couldn't reach Aiden right now — try refreshing in a moment.
              </motion.p>
            ) : data ? (
              <motion.div
                key={data.generatedAt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <TypewriterText text={data.message} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
