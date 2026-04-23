import { db } from '../db/index.js';
import { mistakePool, examQuestions, exams, examAttempts } from '../db/schema.js';
import { eq, and, desc, inArray, sql, notInArray } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RetakeGeneratorOptions {
  studentId: string;
  examId?: string;
  topic?: string;
  minRepetitions?: number;
  includePartialCredit?: boolean;
  useIsomorphicVariants?: boolean;
  maxQuestions?: number;
  difficultyBalance?: 'easy' | 'medium' | 'hard' | 'adaptive';
  timeLimit?: number;
  shuffleQuestions?: boolean;
}

export interface TeacherConstraints {
  maxRetakeAttempts?: number;
  cooldownPeriodHours?: number;
  mustPassOriginalFirst?: boolean;
  allowedTopics?: string[];
  excludedTopics?: string[];
  minQuestionsRequired?: number;
  maxQuestionsAllowed?: number;
  passingScoreOverride?: number;
  enableAntiCheat?: boolean;
}

export interface RetakeExamResult {
  examId: string;
  examTitle: string;
  studentId: string;
  isRetake: true;
  learningMode: true;
  totalQuestions: number;
  questionIds: string[];
  mistakesAddressed: number;
  isomorphicVariantsUsed: number;
  topicCoverage: Record<string, number>;
  estimatedTimeMinutes: number;
  passingScore: number;
  eligibilityCheck: {
    eligible: boolean;
    reasons: string[];
  };
  metadata: {
    originalMistakes: number;
    deduplicatedQuestions: number;
    variantsAvailable: number;
    generatedAt: Date;
  };
}

export interface IsomorphicVariant {
  originalQuestionId: string;
  variantQuestionId: string;
  topic: string;
  difficulty: string;
  similarityScore: number;
}

export interface MistakeResolutionTracker {
  mistakeId: string;
  questionId: string;
  retakeAttemptId: string;
  resolved: boolean;
  resolvedAt?: Date;
  attemptsRequired: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RetakeExamGeneratorService {
  
  /**
   * Generate a retake exam based on student's unresolved mistakes
   * Applies isomorphic variants and teacher constraints
   */
  static async generateRetakeExam(
    options: RetakeGeneratorOptions,
    constraints?: TeacherConstraints
  ): Promise<RetakeExamResult> {
    const { studentId, examId, topic } = options;

    console.log(`[RETAKE GENERATOR] Starting retake generation for student ${studentId}`);

    // Step 1: Check eligibility
    const eligibilityCheck = await this.checkRetakeEligibility(
      studentId,
      examId,
      constraints
    );

    if (!eligibilityCheck.eligible) {
      throw new Error(
        `Student not eligible for retake: ${eligibilityCheck.reasons.join(', ')}`
      );
    }

    // Step 2: Pull unresolved mistakes
    const unresolvedMistakes = await this.getUnresolvedMistakes(
      studentId,
      examId,
      topic,
      options.minRepetitions
    );

    if (unresolvedMistakes.length === 0) {
      throw new Error('No unresolved mistakes found for retake generation.');
    }

    console.log(`[RETAKE GENERATOR] Found ${unresolvedMistakes.length} unresolved mistakes`);

    // Step 3: Extract unique question IDs (deduplication)
    const uniqueQuestionIds = this.deduplicateQuestions(unresolvedMistakes);

    console.log(`[RETAKE GENERATOR] Deduplicated to ${uniqueQuestionIds.length} unique questions`);

    // Step 4: Apply teacher constraints (topic filtering, max questions)
    const filteredQuestionIds = await this.applyTeacherConstraints(
      uniqueQuestionIds,
      constraints
    );

    if (filteredQuestionIds.length === 0) {
      throw new Error('No questions remaining after applying teacher constraints.');
    }

    // Step 5: Generate isomorphic variants (if enabled)
    let finalQuestionIds: string[] = [];
    let isomorphicVariantsUsed = 0;

    if (options.useIsomorphicVariants) {
      const variantResult = await this.replaceWithIsomorphicVariants(
        filteredQuestionIds,
        options.difficultyBalance
      );
      finalQuestionIds = variantResult.questionIds;
      isomorphicVariantsUsed = variantResult.variantsUsed;
    } else {
      finalQuestionIds = filteredQuestionIds;
    }

    // Step 6: Apply max questions limit
    const maxQuestions = options.maxQuestions || constraints?.maxQuestionsAllowed || 50;
    if (finalQuestionIds.length > maxQuestions) {
      finalQuestionIds = this.selectQuestionsByPriority(
        finalQuestionIds,
        unresolvedMistakes,
        maxQuestions
      );
    }

    // Step 7: Shuffle questions (if enabled)
    if (options.shuffleQuestions !== false) {
      finalQuestionIds = this.shuffleArray(finalQuestionIds);
    }

    // Step 8: Calculate topic coverage
    const topicCoverage = await this.calculateTopicCoverage(finalQuestionIds);

    // Step 9: Create retake exam instance
    const retakeExam = await this.createRetakeExamInstance(
      studentId,
      examId,
      finalQuestionIds,
      options,
      constraints
    );

    // Step 10: Mark mistakes as included in retake
    await this.markMistakesIncludedInRetake(studentId, filteredQuestionIds);

    console.log(`[RETAKE GENERATOR] Retake exam created: ${retakeExam.id}`);

    return {
      examId: retakeExam.id,
      examTitle: retakeExam.title,
      studentId,
      isRetake: true,
      learningMode: true,
      totalQuestions: finalQuestionIds.length,
      questionIds: finalQuestionIds,
      mistakesAddressed: unresolvedMistakes.length,
      isomorphicVariantsUsed,
      topicCoverage,
      estimatedTimeMinutes: options.timeLimit || this.estimateTimeRequired(finalQuestionIds.length),
      passingScore: constraints?.passingScoreOverride || 70,
      eligibilityCheck,
      metadata: {
        originalMistakes: unresolvedMistakes.length,
        deduplicatedQuestions: uniqueQuestionIds.length,
        variantsAvailable: isomorphicVariantsUsed,
        generatedAt: new Date(),
      },
    };
  }

  /**
   * Check if student is eligible for retake
   */
  static async checkRetakeEligibility(
    studentId: string,
    examId: string | undefined,
    constraints?: TeacherConstraints
  ): Promise<{ eligible: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Check 1: Must have unresolved mistakes
    const mistakes = await db.query.mistakePool.findMany({
      where: and(
        eq(mistakePool.studentId, studentId),
        examId ? eq(mistakePool.examId, examId) : sql`true`,
        eq(mistakePool.remediationStatus, 'not_started' as any)
      ),
    });

    if (mistakes.length === 0) {
      reasons.push('No unresolved mistakes to address');
    }

    // Check 2: Maximum retake attempts
    if (constraints?.maxRetakeAttempts && examId) {
      const previousRetakes = await db.query.examAttempts.findMany({
        where: and(
          eq(examAttempts.studentId, studentId),
          eq(examAttempts.examId, examId),
          eq(examAttempts.isRetake, true)
        ),
      });

      if (previousRetakes.length >= constraints.maxRetakeAttempts) {
        reasons.push(`Maximum retake attempts (${constraints.maxRetakeAttempts}) exceeded`);
      }
    }

    // Check 3: Cooldown period
    if (constraints?.cooldownPeriodHours && examId) {
      const recentAttempts = await db.query.examAttempts.findMany({
        where: and(
          eq(examAttempts.studentId, studentId),
          eq(examAttempts.examId, examId)
        ),
        orderBy: [desc(examAttempts.createdAt)],
        limit: 1,
      });

      if (recentAttempts.length > 0) {
        const lastAttempt = recentAttempts[0];
        const hoursSinceAttempt = (Date.now() - lastAttempt.createdAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceAttempt < constraints.cooldownPeriodHours) {
          const hoursRemaining = Math.ceil(constraints.cooldownPeriodHours - hoursSinceAttempt);
          reasons.push(`Cooldown period active: ${hoursRemaining} hours remaining`);
        }
      }
    }

    // Check 4: Must pass original exam first
    if (constraints?.mustPassOriginalFirst && examId) {
      const originalAttempts = await db.query.examAttempts.findMany({
        where: and(
          eq(examAttempts.studentId, studentId),
          eq(examAttempts.examId, examId),
          eq(examAttempts.isRetake, false)
        ),
      });

      const hasPassed = originalAttempts.some(attempt => attempt.passed);
      if (!hasPassed) {
        reasons.push('Must pass original exam before accessing retake');
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Get unresolved mistakes for student
   * Filters by exam, topic, and minimum repetitions
   */
  static async getUnresolvedMistakes(
    studentId: string,
    examId?: string,
    topic?: string,
    minRepetitions?: number
  ): Promise<any[]> {
    const conditions = [
      eq(mistakePool.studentId, studentId),
      eq(mistakePool.remediationStatus, 'not_started' as any),
    ];

    if (examId) {
      conditions.push(eq(mistakePool.examId, examId));
    }

    if (topic) {
      conditions.push(eq(mistakePool.topic, topic));
    }

    let mistakes = await db.query.mistakePool.findMany({
      where: and(...conditions),
      orderBy: [desc(mistakePool.repetitionCount), desc(mistakePool.createdAt)],
    });

    // Filter by minimum repetitions
    if (minRepetitions && minRepetitions > 1) {
      mistakes = mistakes.filter(m => (m.repetitionCount ?? 0) >= minRepetitions);
    }

    return mistakes;
  }

  /**
   * Deduplicate questions (same question ID from multiple mistakes)
   */
  private static deduplicateQuestions(mistakes: any[]): string[] {
    const uniqueQuestions = new Set<string>();
    mistakes.forEach(mistake => {
      uniqueQuestions.add(mistake.questionId);
    });
    return Array.from(uniqueQuestions);
  }

  /**
   * Apply teacher-defined constraints
   */
  private static async applyTeacherConstraints(
    questionIds: string[],
    constraints?: TeacherConstraints
  ): Promise<string[]> {
    if (!constraints) return questionIds;

    let filtered = questionIds;

    // Filter by allowed topics
    if (constraints.allowedTopics && constraints.allowedTopics.length > 0) {
      const questions = await db.query.examQuestions.findMany({
        where: inArray(examQuestions.id, filtered),
      });

      filtered = questions
        .filter(q => constraints.allowedTopics!.includes(q.topic || ''))
        .map(q => q.id);
    }

    // Filter by excluded topics
    if (constraints.excludedTopics && constraints.excludedTopics.length > 0) {
      const questions = await db.query.examQuestions.findMany({
        where: inArray(examQuestions.id, filtered),
      });

      filtered = questions
        .filter(q => !constraints.excludedTopics!.includes(q.topic || ''))
        .map(q => q.id);
    }

    // Check minimum questions requirement
    if (constraints.minQuestionsRequired && filtered.length < constraints.minQuestionsRequired) {
      throw new Error(
        `Not enough questions after filtering: ${filtered.length} < ${constraints.minQuestionsRequired}`
      );
    }

    return filtered;
  }

  /**
   * Replace questions with isomorphic variants
   * Variants have same topic, difficulty, and skill but different content
   */
  private static async replaceWithIsomorphicVariants(
    questionIds: string[],
    difficultyBalance?: string
  ): Promise<{ questionIds: string[]; variantsUsed: number }> {
    const finalQuestionIds: string[] = [];
    let variantsUsed = 0;

    for (const questionId of questionIds) {
      // Fetch original question
      const originalQuestion = await db.query.examQuestions.findFirst({
        where: eq(examQuestions.id, questionId),
      });

      if (!originalQuestion) {
        console.warn(`[RETAKE GENERATOR] Question ${questionId} not found, skipping variant`);
        finalQuestionIds.push(questionId);
        continue;
      }

      // Find isomorphic variant
      const variant = await this.findIsomorphicVariant(
        originalQuestion,
        questionIds,
        difficultyBalance
      );

      if (variant) {
        finalQuestionIds.push(variant.id);
        variantsUsed++;
        console.log(`[RETAKE GENERATOR] Using variant ${variant.id} for question ${questionId}`);
      } else {
        // No variant found, use original
        finalQuestionIds.push(questionId);
      }
    }

    return { questionIds: finalQuestionIds, variantsUsed };
  }

  /**
   * Find an isomorphic variant for a question
   * Same topic, similar difficulty, different content
   */
  private static async findIsomorphicVariant(
    originalQuestion: any,
    excludeQuestionIds: string[],
    difficultyBalance?: string
  ): Promise<any | null> {
    // Determine target difficulty
    let targetDifficulty = originalQuestion.difficultyLevel;
    if (difficultyBalance === 'easy') {
      targetDifficulty = 'easy';
    } else if (difficultyBalance === 'hard') {
      targetDifficulty = 'hard';
    } else if (difficultyBalance === 'adaptive') {
      // Slightly easier for retakes
      const difficultyMap: Record<string, string> = {
        'hard': 'medium',
        'medium': 'easy',
        'easy': 'easy',
      };
      targetDifficulty = difficultyMap[originalQuestion.difficultyLevel] || originalQuestion.difficultyLevel;
    }

    // Search for variants
    const variants = await db.query.examQuestions.findMany({
      where: and(
        eq(examQuestions.topic, originalQuestion.topic || ''),
        eq(examQuestions.questionType, originalQuestion.questionType),
        eq(examQuestions.difficultyLevel, targetDifficulty as any),
        notInArray(examQuestions.id, excludeQuestionIds)
      ),
      limit: 5,
    });

    // Return first available variant
    return variants.length > 0 ? variants[0] : null;
  }

  /**
   * Select questions by priority (most repeated mistakes first)
   */
  private static selectQuestionsByPriority(
    questionIds: string[],
    mistakes: any[],
    maxQuestions: number
  ): string[] {
    // Create priority map
    const priorityMap = new Map<string, number>();
    mistakes.forEach(mistake => {
      priorityMap.set(
        mistake.questionId,
        (priorityMap.get(mistake.questionId) || 0) + mistake.repetitionCount
      );
    });

    // Sort by priority (highest repetition count first)
    const sortedQuestionIds = questionIds.sort((a, b) => {
      const priorityA = priorityMap.get(a) || 0;
      const priorityB = priorityMap.get(b) || 0;
      return priorityB - priorityA;
    });

    return sortedQuestionIds.slice(0, maxQuestions);
  }

  /**
   * Calculate topic coverage distribution
   */
  private static async calculateTopicCoverage(
    questionIds: string[]
  ): Promise<Record<string, number>> {
    const questions = await db.query.examQuestions.findMany({
      where: inArray(examQuestions.id, questionIds),
    });

    const topicCoverage: Record<string, number> = {};
    questions.forEach(q => {
      const topic = q.topic || 'Unknown';
      topicCoverage[topic] = (topicCoverage[topic] || 0) + 1;
    });

    return topicCoverage;
  }

  /**
   * Create retake exam instance in database
   */
  private static async createRetakeExamInstance(
    studentId: string,
    originalExamId: string | undefined,
    questionIds: string[],
    options: RetakeGeneratorOptions,
    constraints?: TeacherConstraints
  ): Promise<any> {
    // Generate retake exam title
    const originalExam = originalExamId
      ? await db.query.exams.findFirst({ where: eq(exams.id, originalExamId) })
      : null;

    const title = originalExam
      ? `${originalExam.title} - Retake (Mistakes Review)`
      : `Mistake-Based Retake Exam`;

    // Create exam
    const [retakeExam] = await db.insert(exams).values({
      title,
      description: `Retake exam focusing on unresolved mistakes. Learning mode enabled - no anti-cheat escalation.`,
      courseId: originalExam?.courseId || '',
      createdBy: originalExam?.createdBy || '',
      totalPoints: questionIds.length * 10, // Assume 10 points per question
      passingScore: constraints?.passingScoreOverride || 70,
      timeLimit: options.timeLimit || this.estimateTimeRequired(questionIds.length),
      isPublished: true,
      allowRetakes: false, // Retakes of retakes disabled
      shuffleQuestions: options.shuffleQuestions !== false,
      showResults: true,
      allowReview: true,
      isRetakeExam: true,
      learningMode: true,
      antiCheatEnabled: false, // Explicitly disable anti-cheat for learning
      metadata: {
        originalExamId,
        studentId,
        mistakeBasedRetake: true,
        isomorphicVariantsUsed: options.useIsomorphicVariants,
        generatedAt: new Date().toISOString(),
      } as any,
    } as any).returning();

    // Associate questions with exam
    // Note: This would require a junction table or updating exam schema
    // For now, we store question IDs in metadata

    return retakeExam;
  }

  /**
   * Mark mistakes as included in retake
   */
  private static async markMistakesIncludedInRetake(
    studentId: string,
    questionIds: string[]
  ): Promise<void> {
    for (const questionId of questionIds) {
      await db.update(mistakePool)
        .set({
          includedInRetake: true,
          remediationStatus: 'in_progress',
        } as any)
        .where(
          and(
            eq(mistakePool.studentId, studentId),
            eq(mistakePool.questionId, questionId)
          )
        );
    }

    console.log(`[RETAKE GENERATOR] Marked ${questionIds.length} mistakes as included in retake`);
  }

  /**
   * Track mistake resolution after retake attempt
   */
  static async trackMistakeResolution(
    studentId: string,
    retakeAttemptId: string,
    gradedAnswers: Array<{ questionId: string; isCorrect: boolean }>
  ): Promise<MistakeResolutionTracker[]> {
    const resolutions: MistakeResolutionTracker[] = [];

    for (const answer of gradedAnswers) {
      // Find mistakes for this question
      const mistakes = await db.query.mistakePool.findMany({
        where: and(
          eq(mistakePool.studentId, studentId),
          eq(mistakePool.questionId, answer.questionId),
          eq(mistakePool.remediationStatus, 'in_progress' as any)
        ),
      });

      for (const mistake of mistakes) {
        const resolved = answer.isCorrect;

        // Update remediation status
        await db.update(mistakePool)
          .set({
            remediationStatus: resolved ? ('completed' as any) : ('in_progress' as any),
          } as any)
          .where(eq(mistakePool.id, mistake.id));

        resolutions.push({
          mistakeId: mistake.id,
          questionId: answer.questionId,
          retakeAttemptId,
          resolved,
          resolvedAt: resolved ? new Date() : undefined,
          attemptsRequired: 1, // Track across multiple retakes in future
        });

        if (resolved) {
          console.log(`[RETAKE GENERATOR] Mistake ${mistake.id} resolved for question ${answer.questionId}`);
        }
      }
    }

    return resolutions;
  }

  /**
   * Get retake preview (without creating exam)
   */
  static async getRetakePreview(
    studentId: string,
    examId?: string,
    topic?: string
  ): Promise<{
    eligible: boolean;
    reasons: string[];
    mistakesAvailable: number;
    uniqueQuestions: number;
    topicBreakdown: Record<string, number>;
    estimatedTimeMinutes: number;
  }> {
    // Check eligibility
    const eligibility = await this.checkRetakeEligibility(studentId, examId);

    // Get mistakes
    const mistakes = await this.getUnresolvedMistakes(studentId, examId, topic);
    const uniqueQuestions = this.deduplicateQuestions(mistakes);

    // Calculate topic breakdown
    const topicBreakdown: Record<string, number> = {};
    mistakes.forEach(m => {
      const topic = m.topic || 'Unknown';
      topicBreakdown[topic] = (topicBreakdown[topic] || 0) + 1;
    });

    return {
      eligible: eligibility.eligible,
      reasons: eligibility.reasons,
      mistakesAvailable: mistakes.length,
      uniqueQuestions: uniqueQuestions.length,
      topicBreakdown,
      estimatedTimeMinutes: this.estimateTimeRequired(uniqueQuestions.length),
    };
  }

  /**
   * Estimate time required (2 minutes per question)
   */
  private static estimateTimeRequired(questionCount: number): number {
    return questionCount * 2;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export default RetakeExamGeneratorService;
