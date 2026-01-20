import { db } from '../db/index.js';
import { mistakePool, examAttempts, examAnswers, exams, users } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AnswerEvaluationService } from './answer-evaluation.service.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RetakeSubmissionOptions {
  attemptId: string;
  studentId: string;
  examId: string;
  mode: 'practice' | 'graded';
  preventInfiniteLoops?: boolean;
  updateMastery?: boolean;
}

export interface MistakeResolutionResult {
  questionId: string;
  originalMistakeId: string;
  wasResolved: boolean;
  attemptsToResolve: number;
  persistedForFutureRetake: boolean;
}

export interface MasteryAnalytics {
  studentId: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  masteryLevel: 'beginner' | 'developing' | 'proficient' | 'mastered';
  masteryPercentage: number;
  improvementFromLastAttempt: number;
  retakesCompleted: number;
  lastUpdated: Date;
}

export interface RetakeSubmissionResult {
  attemptId: string;
  studentId: string;
  examId: string;
  mode: 'practice' | 'graded';
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  mistakesResolved: number;
  mistakesPersisted: number;
  mistakeResolutions: MistakeResolutionResult[];
  masteryUpdates: MasteryAnalytics[];
  retakeAllowed: boolean;
  retakeReason?: string;
  gradeSaved: boolean;
  feedback: string[];
}

export interface InfiniteLoopProtection {
  enabled: boolean;
  maxConsecutiveRetakes: number;
  cooldownHours: number;
  requireImprovement: boolean;
  minImprovementPercentage: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RetakeSubmissionService {
  
  /**
   * Process retake exam submission
   * Handles both practice and graded modes
   */
  static async submitRetakeExam(
    options: RetakeSubmissionOptions
  ): Promise<RetakeSubmissionResult> {
    const { attemptId, studentId, examId, mode } = options;

    console.log(`[RETAKE SUBMISSION] Processing ${mode} mode submission for attempt ${attemptId}`);

    // Step 1: Grade the attempt
    const gradingResult = await AnswerEvaluationService.gradeAttempt(attemptId);

    // Step 2: Fetch attempt details
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new Error('Retake attempt not found');
    }

    // Fetch answers separately
    const answers = await db
      .select()
      .from(examAnswers)
      .where(eq(examAnswers.attemptId, attemptId));

    // Fetch exam details
    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, attempt.examId))
      .limit(1);

    // Step 3: Verify this is a retake exam
    if (!attempt.isRetake) {
      throw new Error('This submission handler is for retake exams only');
    }

    // Step 4: Process mistake resolutions
    const mistakeResolutions = await this.processMistakeResolutions(
      studentId,
      attemptId,
      gradingResult.gradedAnswers
    );

    const mistakesResolved = mistakeResolutions.filter(r => r.wasResolved).length;
    const mistakesPersisted = mistakeResolutions.filter(r => r.persistedForFutureRetake).length;

    console.log(`[RETAKE SUBMISSION] Resolved ${mistakesResolved}, Persisted ${mistakesPersisted}`);

    // Step 5: Update mastery analytics (if enabled)
    let masteryUpdates: MasteryAnalytics[] = [];
    if (options.updateMastery !== false) {
      masteryUpdates = await this.updateMasteryAnalytics(
        studentId,
        examId,
        gradingResult
      );
    }

    // Step 6: Check infinite loop protection
    let retakeAllowed = true;
    let retakeReason: string | undefined;

    if (options.preventInfiniteLoops !== false) {
      const loopCheck = await this.checkInfiniteLoopProtection(
        studentId,
        examId,
        gradingResult.percentage
      );
      retakeAllowed = loopCheck.allowed;
      retakeReason = loopCheck.reason;
    }

    // Step 7: Save grade (only in graded mode)
    let gradeSaved = false;
    if (mode === 'graded') {
      await this.saveGradedRetake(attemptId, gradingResult);
      gradeSaved = true;
    } else {
      // Practice mode: mark as practice attempt
      await db.update(examAttempts)
        .set({
          isPracticeMode: true,
          gradedForRecord: false,
        } as any)
        .where(eq(examAttempts.id, attemptId));
    }

    // Step 8: Generate feedback
    const feedback = this.generateFeedback(
      mode,
      gradingResult,
      mistakesResolved,
      mistakesPersisted,
      retakeAllowed
    );

    console.log(`[RETAKE SUBMISSION] Submission complete - ${mode} mode, grade saved: ${gradeSaved}`);

    return {
      attemptId,
      studentId,
      examId,
      mode,
      score: gradingResult.totalScore,
      maxScore: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      passed: gradingResult.passed,
      mistakesResolved,
      mistakesPersisted,
      mistakeResolutions,
      masteryUpdates,
      retakeAllowed,
      retakeReason,
      gradeSaved,
      feedback,
    };
  }

  /**
   * Process mistake resolutions
   * Mark resolved mistakes, persist unresolved ones
   */
  private static async processMistakeResolutions(
    studentId: string,
    attemptId: string,
    gradedAnswers: Array<{ answerId: string; isCorrect: boolean }>
  ): Promise<MistakeResolutionResult[]> {
    const resolutions: MistakeResolutionResult[] = [];

    for (const answer of gradedAnswers) {
      // Find the answer record to get questionId
      const answerRecord = await db.query.examAnswers.findFirst({
        where: eq(examAnswers.id, answer.answerId),
      });

      if (!answerRecord) continue;

      // Find associated mistakes
      const mistakes = await db.query.mistakePool.findMany({
        where: and(
          eq(mistakePool.studentId, studentId),
          eq(mistakePool.questionId, answerRecord.questionId)
        ),
        orderBy: [desc(mistakePool.createdAt)],
      });

      if (mistakes.length === 0) continue;

      const latestMistake = mistakes[0];
      const wasResolved = answer.isCorrect;

      // Calculate attempts to resolve
      const attemptsToResolve = mistakes.length;

      if (wasResolved) {
        // Mark all related mistakes as resolved
        for (const mistake of mistakes) {
          await db.update(mistakePool)
            .set({
              remediationStatus: 'completed',
              resolvedAt: new Date(),
            } as any)
            .where(eq(mistakePool.id, mistake.id));
        }

        console.log(`[RETAKE SUBMISSION] ✓ Resolved mistake for question ${answerRecord.questionId}`);

        resolutions.push({
          questionId: answerRecord.questionId,
          originalMistakeId: latestMistake.id,
          wasResolved: true,
          attemptsToResolve,
          persistedForFutureRetake: false,
        });
      } else {
        // Persist unresolved mistake
        // Create a new mistake entry for this retake attempt
        await db.insert(mistakePool).values({
          studentId,
          attemptId,
          answerId: answer.answerId,
          questionId: answerRecord.questionId,
          examId: latestMistake.examId,
          mistakeType: this.determineMistakeType(answerRecord),
          topic: latestMistake.topic,
          subtopic: latestMistake.subtopic,
          skillTag: latestMistake.skillTag,
          difficultyLevel: latestMistake.difficultyLevel,
          studentAnswer: answerRecord.studentAnswer,
          correctAnswer: latestMistake.correctAnswer,
          pointsLost: (answerRecord.pointsPossible || 0) - (answerRecord.pointsAwarded || 0),
          pointsPossible: answerRecord.pointsPossible || 0,
          isRepeatedMistake: true,
          repetitionCount: attemptsToResolve + 1,
          remediationStatus: 'in_progress',
          includedInRetake: false,
          occurredAt: new Date(),
        } as any);

        console.log(`[RETAKE SUBMISSION] ✗ Persisted unresolved mistake for question ${answerRecord.questionId} (attempt ${attemptsToResolve + 1})`);

        resolutions.push({
          questionId: answerRecord.questionId,
          originalMistakeId: latestMistake.id,
          wasResolved: false,
          attemptsToResolve: attemptsToResolve + 1,
          persistedForFutureRetake: true,
        });
      }
    }

    return resolutions;
  }

  /**
   * Update mastery analytics for each topic
   */
  private static async updateMasteryAnalytics(
    studentId: string,
    examId: string,
    gradingResult: any
  ): Promise<MasteryAnalytics[]> {
    const analytics: MasteryAnalytics[] = [];

    // Group answers by topic
    const topicPerformance = new Map<string, { correct: number; total: number }>();

    for (const answer of gradingResult.gradedAnswers) {
      // Get question to determine topic
      const answerRecord = await db.query.examAnswers.findFirst({
        where: eq(examAnswers.id, answer.answerId),
      });

      if (!answerRecord) continue;

      const questionRecord = await db.query.examQuestions.findFirst({
        where: eq(examAnswers.questionId, answerRecord.questionId),
      });

      if (!questionRecord) continue;

      const topic = questionRecord.topic || 'Unknown';
      
      if (!topicPerformance.has(topic)) {
        topicPerformance.set(topic, { correct: 0, total: 0 });
      }

      const performance = topicPerformance.get(topic)!;
      performance.total++;
      if (answer.isCorrect) {
        performance.correct++;
      }
    }

    // Calculate mastery for each topic
    for (const [topic, performance] of topicPerformance.entries()) {
      const masteryPercentage = (performance.correct / performance.total) * 100;
      
      // Determine mastery level
      let masteryLevel: 'beginner' | 'developing' | 'proficient' | 'mastered';
      if (masteryPercentage >= 90) {
        masteryLevel = 'mastered';
      } else if (masteryPercentage >= 75) {
        masteryLevel = 'proficient';
      } else if (masteryPercentage >= 50) {
        masteryLevel = 'developing';
      } else {
        masteryLevel = 'beginner';
      }

      // Get previous mastery percentage for improvement calculation
      const previousAttempts = await db.query.examAttempts.findMany({
        where: and(
          eq(examAttempts.studentId, studentId),
          eq(examAttempts.examId, examId),
          eq(examAttempts.isRetake, true)
        ),
        orderBy: [desc(examAttempts.createdAt)],
        limit: 2,
      });

      const improvement = previousAttempts.length > 1
        ? masteryPercentage - (previousAttempts[1].percentage || 0)
        : 0;

      analytics.push({
        studentId,
        topic,
        totalQuestions: performance.total,
        correctAnswers: performance.correct,
        masteryLevel,
        masteryPercentage: Math.round(masteryPercentage * 100) / 100,
        improvementFromLastAttempt: Math.round(improvement * 100) / 100,
        retakesCompleted: previousAttempts.length,
        lastUpdated: new Date(),
      });

      console.log(`[RETAKE SUBMISSION] Mastery updated for ${topic}: ${masteryLevel} (${masteryPercentage.toFixed(1)}%)`);
    }

    return analytics;
  }

  /**
   * Check infinite loop protection
   * Prevents students from taking unlimited retakes without improvement
   */
  private static async checkInfiniteLoopProtection(
    studentId: string,
    examId: string,
    currentPercentage: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get protection settings
    const protection: InfiniteLoopProtection = {
      enabled: true,
      maxConsecutiveRetakes: 5,
      cooldownHours: 24,
      requireImprovement: true,
      minImprovementPercentage: 5,
    };

    if (!protection.enabled) {
      return { allowed: true };
    }

    // Get recent retake attempts
    const recentAttempts = await db.query.examAttempts.findMany({
      where: and(
        eq(examAttempts.studentId, studentId),
        eq(examAttempts.examId, examId),
        eq(examAttempts.isRetake, true)
      ),
      orderBy: [desc(examAttempts.createdAt)],
      limit: protection.maxConsecutiveRetakes + 1,
    });

    // Check 1: Maximum consecutive retakes
    if (recentAttempts.length >= protection.maxConsecutiveRetakes) {
      return {
        allowed: false,
        reason: `Maximum consecutive retakes (${protection.maxConsecutiveRetakes}) reached. Please review your study materials.`,
      };
    }

    // Check 2: Cooldown period
    if (recentAttempts.length > 0) {
      const lastAttempt = recentAttempts[0];
      const hoursSinceLastAttempt = (Date.now() - lastAttempt.createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastAttempt < protection.cooldownHours) {
        const hoursRemaining = Math.ceil(protection.cooldownHours - hoursSinceLastAttempt);
        return {
          allowed: false,
          reason: `Cooldown period active. Please wait ${hoursRemaining} hours before next retake.`,
        };
      }
    }

    // Check 3: Require improvement
    if (protection.requireImprovement && recentAttempts.length >= 2) {
      const lastTwoAttempts = recentAttempts.slice(0, 2);
      const previousPercentage = lastTwoAttempts[1].percentage || 0;
      const improvement = currentPercentage - previousPercentage;

      if (improvement < protection.minImprovementPercentage) {
        return {
          allowed: false,
          reason: `Insufficient improvement (${improvement.toFixed(1)}%). Please study more before retaking.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Save graded retake (counts toward final grade)
   */
  private static async saveGradedRetake(
    attemptId: string,
    gradingResult: any
  ): Promise<void> {
    await db.update(examAttempts)
      .set({
        gradedForRecord: true,
        isPracticeMode: false,
        finalScore: gradingResult.totalScore,
        finalPercentage: gradingResult.percentage,
        gradedAt: new Date(),
      } as any)
      .where(eq(examAttempts.id, attemptId));

    console.log(`[RETAKE SUBMISSION] Graded retake saved with score ${gradingResult.totalScore}/${gradingResult.maxScore}`);
  }

  /**
   * Generate feedback for student
   */
  private static generateFeedback(
    mode: 'practice' | 'graded',
    gradingResult: any,
    mistakesResolved: number,
    mistakesPersisted: number,
    retakeAllowed: boolean
  ): string[] {
    const feedback: string[] = [];

    // Mode-specific feedback
    if (mode === 'practice') {
      feedback.push('✏️ Practice Mode: This attempt was for learning purposes and will not affect your grade.');
    } else {
      feedback.push('✅ Graded Mode: This score has been recorded in your gradebook.');
    }

    // Score feedback
    if (gradingResult.passed) {
      feedback.push(`🎉 Congratulations! You passed with ${gradingResult.percentage.toFixed(1)}%.`);
    } else {
      feedback.push(`📊 Score: ${gradingResult.percentage.toFixed(1)}% (Passing: 70%)`);
    }

    // Mistake resolution feedback
    if (mistakesResolved > 0) {
      feedback.push(`✓ Great progress! You resolved ${mistakesResolved} mistake(s) from previous attempts.`);
    }

    if (mistakesPersisted > 0) {
      feedback.push(`⚠️ ${mistakesPersisted} mistake(s) still need attention. Review these topics for your next attempt.`);
    }

    // Retake availability feedback
    if (retakeAllowed) {
      if (mistakesPersisted > 0) {
        feedback.push('🔄 Another retake is available to address remaining mistakes.');
      } else {
        feedback.push('🌟 Excellent work! All mistakes from previous attempts have been resolved.');
      }
    } else {
      feedback.push('⏸️ Retake limit reached or cooldown active. Please review your study materials.');
    }

    return feedback;
  }

  /**
   * Get retake submission history
   */
  static async getRetakeHistory(
    studentId: string,
    examId?: string
  ): Promise<{
    totalRetakes: number;
    practiceRetakes: number;
    gradedRetakes: number;
    mistakesResolved: number;
    mistakesPersisted: number;
    averageImprovement: number;
    retakes: Array<{
      attemptId: string;
      examId: string;
      mode: string;
      score: number;
      percentage: number;
      passed: boolean;
      completedAt: Date;
    }>;
  }> {
    const conditions = [
      eq(examAttempts.studentId, studentId),
      eq(examAttempts.isRetake, true),
    ];

    if (examId) {
      conditions.push(eq(examAttempts.examId, examId));
    }

    const retakes = await db.query.examAttempts.findMany({
      where: and(...conditions),
      orderBy: [desc(examAttempts.createdAt)],
    });

    const practiceRetakes = retakes.filter(r => (r as any).isPracticeMode).length;
    const gradedRetakes = retakes.filter(r => (r as any).gradedForRecord).length;

    // Calculate average improvement
    let totalImprovement = 0;
    for (let i = 0; i < retakes.length - 1; i++) {
      const current = retakes[i].percentage || 0;
      const previous = retakes[i + 1].percentage || 0;
      totalImprovement += current - previous;
    }
    const averageImprovement = retakes.length > 1 ? totalImprovement / (retakes.length - 1) : 0;

    // Count mistakes
    const resolvedMistakes = await db.query.mistakePool.findMany({
      where: and(
        eq(mistakePool.studentId, studentId),
        eq(mistakePool.remediationStatus, 'completed' as any)
      ),
    });

    const persistedMistakes = await db.query.mistakePool.findMany({
      where: and(
        eq(mistakePool.studentId, studentId),
        eq(mistakePool.remediationStatus, 'in_progress' as any)
      ),
    });

    return {
      totalRetakes: retakes.length,
      practiceRetakes,
      gradedRetakes,
      mistakesResolved: resolvedMistakes.length,
      mistakesPersisted: persistedMistakes.length,
      averageImprovement: Math.round(averageImprovement * 100) / 100,
      retakes: retakes.map(r => ({
        attemptId: r.id,
        examId: r.examId,
        mode: (r as any).isPracticeMode ? 'practice' : 'graded',
        score: r.score || 0,
        percentage: r.percentage || 0,
        passed: r.passed || false,
        completedAt: r.createdAt,
      })),
    };
  }

  /**
   * Get mastery progress across all topics
   */
  static async getMasteryProgress(
    studentId: string
  ): Promise<{
    overallMastery: number;
    topicMastery: Array<{
      topic: string;
      masteryLevel: string;
      masteryPercentage: number;
      questionsAttempted: number;
      lastImprovement: number;
    }>;
  }> {
    // Get all mistakes grouped by topic
    const mistakes = await db.query.mistakePool.findMany({
      where: eq(mistakePool.studentId, studentId),
    });

    const topicStats = new Map<string, {
      total: number;
      resolved: number;
      lastImprovement: number;
    }>();

    mistakes.forEach(m => {
      const topic = m.topic || 'Unknown';
      if (!topicStats.has(topic)) {
        topicStats.set(topic, { total: 0, resolved: 0, lastImprovement: 0 });
      }
      
      const stats = topicStats.get(topic)!;
      stats.total++;
      if (m.remediationStatus === 'completed') {
        stats.resolved++;
      }
    });

    const topicMastery = Array.from(topicStats.entries()).map(([topic, stats]) => {
      const masteryPercentage = (stats.resolved / stats.total) * 100;
      
      let masteryLevel: string;
      if (masteryPercentage >= 90) masteryLevel = 'mastered';
      else if (masteryPercentage >= 75) masteryLevel = 'proficient';
      else if (masteryPercentage >= 50) masteryLevel = 'developing';
      else masteryLevel = 'beginner';

      return {
        topic,
        masteryLevel,
        masteryPercentage: Math.round(masteryPercentage * 100) / 100,
        questionsAttempted: stats.total,
        lastImprovement: stats.lastImprovement,
      };
    });

    // Calculate overall mastery
    const totalResolved = Array.from(topicStats.values()).reduce((sum, s) => sum + s.resolved, 0);
    const totalMistakes = Array.from(topicStats.values()).reduce((sum, s) => sum + s.total, 0);
    const overallMastery = totalMistakes > 0 ? (totalResolved / totalMistakes) * 100 : 0;

    return {
      overallMastery: Math.round(overallMastery * 100) / 100,
      topicMastery,
    };
  }

  /**
   * Determine mistake type from answer record
   */
  private static determineMistakeType(answer: any): 'wrong_answer' | 'partial_credit' | 'timeout' | 'skipped' {
    if (!answer.studentAnswer || answer.studentAnswer === '') {
      return 'skipped';
    }
    if (answer.partialCredit && answer.partialCredit > 0) {
      return 'partial_credit';
    }
    if ((answer.metadata as any)?.timedOut) {
      return 'timeout';
    }
    return 'wrong_answer';
  }
}

export default RetakeSubmissionService;
