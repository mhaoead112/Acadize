/**
 * coach.service.ts — Sprint D: AI Coach & Smart Nudges
 *
 * Provides two exported functions:
 *   buildCoachContext  — assembles the student's current state from the DB
 *   generateCoachMessage — calls the AI proxy with the Alex persona
 *
 * Design decisions:
 *  • Reuses the HackClub AI proxy (same baseURL / model as ai-chat.routes.ts).
 *  • 5-minute in-memory cache per userId to avoid hammering the proxy on every
 *    page load.  Cache is intentionally volatile (resets on server restart) —
 *    coach messages are non-critical.
 *  • generateCoachMessage NEVER throws — it falls back to a hand-crafted
 *    motivational string so the API endpoint always returns 200.
 */

import OpenAI from 'openai';
import { db } from '../db/index.js';
import {
  studyStreaks,
  gamificationEvents,
  userQuestProgress,
  questTemplates,
  userBuffs,
} from '../db/schema.js';
import { eq, and, desc, lt, gt } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CoachContext {
  currentStreak: number;
  lastActivityDate: Date | null;
  recentLowScores: number[];          // pointsAwarded values < LOW_SCORE_THRESHOLD
  nearlyExpiredQuest: {
    title: string;
    pctComplete: number;
    hoursLeft: number;
  } | null;
  hasActiveMultiplier: boolean;
}

interface CacheEntry {
  message: string;
  generatedAt: string;
  expiresAt: number;                  // ms timestamp
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
const LOW_SCORE_THRESHOLD = 15;       // points — quiz events scoring below this are "low"
const EXPIRY_WARN_HOURS = 6;          // quest expiring within 6 h = "nearly expired"
const MODEL = 'google/gemini-2.5-flash-lite-preview-09-2025';

const FALLBACK_MESSAGES = [
  "Hey! Every lesson you complete is one step closer to mastering this. You've totally got this — let's go! 🚀",
  "You're doing amazing! Just one more lesson today and your brain will thank you later. Let's keep the streak alive! 🔥",
  "Learning is a superpower, and you're leveling up every single day. Don't stop now — greatness is just around the corner! ⚡",
  "Progress > perfection! Even a small win today keeps you ahead of yesterday's you. Open a lesson and let's crush it! 💪",
];

// ─────────────────────────────────────────────────────────────
// Module-level state
// ─────────────────────────────────────────────────────────────

const messageCache = new Map<string, CacheEntry>();

// Lazy-init the AI client so the module loads safely even if API key is absent
let _openai: OpenAI | null = null;
function getAiClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.AI_API_KEY || 'no-key',
      baseURL: 'https://ai.hackclub.com/proxy/v1',
    });
  }
  return _openai;
}

// ─────────────────────────────────────────────────────────────
// buildCoachContext
// ─────────────────────────────────────────────────────────────

export async function buildCoachContext(
  userId: string,
  orgId: string,
): Promise<CoachContext> {
  try {
    const now = new Date();

    // 1. Streak
    const [streakRow] = await db
      .select({
        currentStreak: studyStreaks.currentStreak,
        lastActivityDate: studyStreaks.lastActivityDate,
      })
      .from(studyStreaks)
      .where(eq(studyStreaks.userId, userId))
      .limit(1);

    // 2. Last 5 gamification events — filter for low-scoring quiz/exam events
    const recentEvents = await db
      .select({
        eventType: gamificationEvents.eventType,
        pointsAwarded: gamificationEvents.pointsAwarded,
      })
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.organizationId, orgId),
        ),
      )
      .orderBy(desc(gamificationEvents.occurredAt))
      .limit(5);

    const recentLowScores = recentEvents
      .filter(
        (e) =>
          (e.eventType === 'quiz_complete' || e.eventType === 'exam_complete') &&
          e.pointsAwarded !== null &&
          e.pointsAwarded < LOW_SCORE_THRESHOLD,
      )
      .map((e) => e.pointsAwarded as number);

    // 3. Active (not expired, not completed) quest progress — joined with template for title
    const activeQuests = await db
      .select({
        title: questTemplates.title,
        progress: userQuestProgress.progress,
        conditionValue: userQuestProgress.conditionValue,
        expiresAt: userQuestProgress.expiresAt,
        completed: userQuestProgress.completed,
      })
      .from(userQuestProgress)
      .innerJoin(questTemplates, eq(userQuestProgress.questTemplateId, questTemplates.id))
      .where(
        and(
          eq(userQuestProgress.userId, userId),
          eq(userQuestProgress.organizationId, orgId),
          eq(userQuestProgress.completed, false),
          gt(userQuestProgress.expiresAt, now),
        ),
      )
      .orderBy(userQuestProgress.expiresAt) // soonest expiry first
      .limit(5);

    // Find the most urgently expiring incomplete quest
    let nearlyExpiredQuest: CoachContext['nearlyExpiredQuest'] = null;
    for (const q of activeQuests) {
      const hoursLeft = (q.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursLeft <= EXPIRY_WARN_HOURS) {
        const pctComplete = q.conditionValue > 0
          ? Math.round((q.progress / q.conditionValue) * 100)
          : 0;
        nearlyExpiredQuest = { title: q.title, pctComplete, hoursLeft: Math.round(hoursLeft) };
        break;
      }
    }

    // 4. Active XP multiplier buff
    const [activeBuff] = await db
      .select({ id: userBuffs.id })
      .from(userBuffs)
      .where(
        and(
          eq(userBuffs.userId, userId),
          eq(userBuffs.buffType, 'xp_multiplier'),
          gt(userBuffs.expiresAt, now),
        ),
      )
      .limit(1);

    return {
      currentStreak: streakRow?.currentStreak ?? 0,
      lastActivityDate: streakRow?.lastActivityDate ?? null,
      recentLowScores,
      nearlyExpiredQuest,
      hasActiveMultiplier: !!activeBuff,
    };
  } catch (err) {
    logger.error('[CoachService] buildCoachContext failed', { userId, orgId, error: String(err) });
    // Return a safe no-data context — coach message will still be generated from defaults
    return {
      currentStreak: 0,
      lastActivityDate: null,
      recentLowScores: [],
      nearlyExpiredQuest: null,
      hasActiveMultiplier: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// generateCoachMessage
// ─────────────────────────────────────────────────────────────

export async function generateCoachMessage(
  userId: string,
  context: CoachContext,
): Promise<{ message: string; generatedAt: string }> {
  // Check cache
  const cached = messageCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { message: cached.message, generatedAt: cached.generatedAt };
  }

  // Build situational context lines for the prompt
  const contextLines: string[] = [];

  if (context.currentStreak >= 3) {
    contextLines.push(`The student has a ${context.currentStreak}-day learning streak — mention it!`);
  } else if (context.currentStreak === 0) {
    contextLines.push(`The student hasn't studied in a while. Gently encourage them to restart.`);
  }

  if (context.recentLowScores.length > 0) {
    contextLines.push(
      `They recently scored low on a quiz (${context.recentLowScores.join(', ')} points). Acknowledge the struggle without being negative — growth mindset!`,
    );
  }

  if (context.nearlyExpiredQuest) {
    const q = context.nearlyExpiredQuest;
    contextLines.push(
      `They have a quest "${q.title}" that expires in ${q.hoursLeft} hour(s) and is ${q.pctComplete}% done. Nudge them to finish it!`,
    );
  }

  if (context.hasActiveMultiplier) {
    contextLines.push(`They have an active 2× XP multiplier right now — tell them this is the perfect time to grind lessons!`);
  }

  if (contextLines.length === 0) {
    contextLines.push(`Give a general upbeat encouragement to keep learning today.`);
  }

  const prompt = `You are Alex, the Fun Learner — Eduverse's AI study coach persona.
Your style: casual, energetic, uses light humour and maybe one emoji per sentence. NO cringe. NO corporate speak.

STUDENT CONTEXT (use this to personalise your message):
${contextLines.map((l, i) => `${i + 1}. ${l}`).join('\n')}

INSTRUCTIONS:
- Write EXACTLY 2-3 short sentences.
- Address the student directly ("you", "your").
- Do NOT use lists, headers, or markdown.
- End with an action cue (e.g. "Open a lesson now!", "Smash that quest!").

Your message:`;

  try {
    if (!process.env.AI_API_KEY) throw new Error('AI_API_KEY not set');

    const client = getAiClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.85,
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty AI response');

    const generatedAt = new Date().toISOString();
    const entry: CacheEntry = { message: raw, generatedAt, expiresAt: Date.now() + CACHE_TTL_MS };
    messageCache.set(userId, entry);

    return { message: raw, generatedAt };
  } catch (err) {
    logger.warn('[CoachService] AI generation failed, using fallback', { userId, error: String(err) });

    // Deterministic fallback pick based on userId so different students get variety
    const pick = FALLBACK_MESSAGES[userId.charCodeAt(0) % FALLBACK_MESSAGES.length];
    const generatedAt = new Date().toISOString();
    // Cache the fallback too (shorter TTL — 2 min — so a retry will try AI again sooner)
    messageCache.set(userId, {
      message: pick,
      generatedAt,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
    return { message: pick, generatedAt };
  }
}
