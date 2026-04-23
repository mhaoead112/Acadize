import { db } from '../db/index.js';
import { examAnswers, examQuestions, examAttempts, mistakePool, exams } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GradingResult {
  answerId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  pointsPossible: number;
  partialCredit: number;
  requiresManualGrading: boolean;
  feedback?: string;
}

export interface AttemptGradingResult {
  attemptId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  gradedAnswers: GradingResult[];
  requiresManualGrading: boolean;
}

export interface MistakeRecord {
  studentId: string;
  questionId: string;
  mistakeType: 'wrong_answer' | 'partial_credit' | 'timeout' | 'skipped';
  pointsLost: number;
  isRepeated: boolean;
  repetitionCount: number;
}

export interface MistakeExtractionResult {
  attemptId: string;
  totalMistakes: number;
  newMistakes: number;
  repeatedMistakes: number;
  mistakes: MistakeRecord[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AnswerEvaluationService {
  
  /**
   * Grade an entire exam attempt
   * Returns grading results without exposing correct answers
   */
  static async gradeAttempt(attemptId: string): Promise<AttemptGradingResult> {
    // Step 1: Fetch attempt
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new Error('Exam attempt not found.');
    }

    // Fetch answers for this attempt
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

    // Fetch exam questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, attempt.examId));

    // Step 2: Grade each answer
    const gradedAnswers: GradingResult[] = [];
    let totalScore = 0;
    let maxScore = 0;
    let requiresManualGrading = false;

    for (const answer of answers) {
      // Find the corresponding question
      const question = questions.find((q: any) => q.id === answer.questionId);
      
      if (!question) {
        console.warn(`[GRADING] Question ${answer.questionId} not found for answer ${answer.id}`);
        continue;
      }

      // Grade the answer
      const result = await this.gradeAnswer(answer, question);
      gradedAnswers.push(result);

      // Accumulate scores
      if (result.requiresManualGrading) {
        requiresManualGrading = true;
      } else {
        totalScore += result.pointsAwarded;
      }
      maxScore += result.pointsPossible;
    }

    // Step 3: Calculate percentage and pass/fail
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = percentage >= (exam.passingScore || 70);

    // Step 4: Update answer records in database
    for (const result of gradedAnswers) {
      await db.update(examAnswers)
        .set({
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
          partialCredit: result.partialCredit as any,
          autoGraded: !result.requiresManualGrading,
        } as any)
        .where(eq(examAnswers.id, result.answerId));
    }

    // Step 5: Update attempt record
    await db.update(examAttempts)
      .set({
        score: totalScore,
        percentage: percentage,
        passed: passed,
        autoGraded: true,
        gradedAt: new Date(),
      })
      .where(eq(examAttempts.id, attemptId));

    console.log(`[GRADING] Attempt ${attemptId} graded: ${totalScore}/${maxScore} (${percentage.toFixed(2)}%)`);

    return {
      attemptId,
      totalScore,
      maxScore,
      percentage,
      passed,
      gradedAnswers,
      requiresManualGrading,
    };
  }

  /**
   * Grade a single answer
   * Does NOT expose correct answer to caller
   */
  private static async gradeAnswer(answer: any, question: any): Promise<GradingResult> {
    const pointsPossible = question.points || 0;
    const questionType = question.questionType;
    const correctAnswer = question.correctAnswer;
    const studentAnswer = answer.studentAnswer;

    let isCorrect = false;
    let pointsAwarded = 0;
    let partialCredit = 0;
    let requiresManualGrading = false;
    let feedback: string | undefined;

    // Handle null/undefined answers (skipped questions)
    if (studentAnswer === null || studentAnswer === undefined || studentAnswer === '') {
      return {
        answerId: answer.id,
        isCorrect: false,
        pointsAwarded: 0,
        pointsPossible,
        partialCredit: 0,
        requiresManualGrading: false,
        feedback: 'Question was not answered.',
      };
    }

    // Grade based on question type
    switch (questionType) {
      case 'multiple_choice':
      case 'true_false':
        isCorrect = this.compareAnswers(studentAnswer, correctAnswer);
        pointsAwarded = isCorrect ? pointsPossible : 0;
        break;

      case 'short_answer':
      case 'fill_blank':
        isCorrect = this.compareTextAnswers(studentAnswer, correctAnswer);
        pointsAwarded = isCorrect ? pointsPossible : 0;
        break;

      case 'matching':
        const matchingResult = this.gradeMatchingAnswer(studentAnswer, correctAnswer, pointsPossible);
        isCorrect = matchingResult.isCorrect;
        pointsAwarded = matchingResult.pointsAwarded;
        partialCredit = matchingResult.partialCredit;
        break;

      case 'essay':
      case 'code':
        requiresManualGrading = true;
        feedback = 'This answer requires manual grading by the instructor.';
        break;

      default:
        console.warn(`[GRADING] Unknown question type: ${questionType}`);
        requiresManualGrading = true;
        feedback = 'Unknown question type requires manual review.';
    }

    return {
      answerId: answer.id,
      isCorrect,
      pointsAwarded,
      pointsPossible,
      partialCredit,
      requiresManualGrading,
      feedback,
    };
  }

  /**
   * Compare answers (case-insensitive for MCQ/True-False)
   */
  private static compareAnswers(studentAnswer: any, correctAnswer: any): boolean {
    if (typeof studentAnswer === 'string' && typeof correctAnswer === 'string') {
      return studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }
    return studentAnswer === correctAnswer;
  }

  /**
   * Compare text answers (case-insensitive, trim whitespace)
   */
  private static compareTextAnswers(studentAnswer: string, correctAnswer: any): boolean {
    const studentText = String(studentAnswer).trim().toLowerCase();
    
    // Handle multiple correct answers (array)
    if (Array.isArray(correctAnswer)) {
      return correctAnswer.some(ans => 
        String(ans).trim().toLowerCase() === studentText
      );
    }
    
    const correctText = String(correctAnswer).trim().toLowerCase();
    return studentText === correctText;
  }

  /**
   * Grade matching questions with partial credit
   */
  private static gradeMatchingAnswer(
    studentAnswer: any,
    correctAnswer: any,
    pointsPossible: number
  ): { isCorrect: boolean; pointsAwarded: number; partialCredit: number } {
    // Student answer should be an array of paired items
    if (!Array.isArray(studentAnswer) || !Array.isArray(correctAnswer)) {
      return { isCorrect: false, pointsAwarded: 0, partialCredit: 0 };
    }

    let correctCount = 0;
    const totalPairs = correctAnswer.length;

    // Compare each pair
    for (let i = 0; i < totalPairs; i++) {
      const studentPair = studentAnswer[i];
      const correctPair = correctAnswer[i];

      if (studentPair && correctPair) {
        // Check if the pairing matches
        if (JSON.stringify(studentPair) === JSON.stringify(correctPair)) {
          correctCount++;
        }
      }
    }

    // All correct = full points
    if (correctCount === totalPairs) {
      return {
        isCorrect: true,
        pointsAwarded: pointsPossible,
        partialCredit: 0,
      };
    }

    // Some correct = partial credit (proportional)
    if (correctCount > 0) {
      const partialCredit = (correctCount / totalPairs) * pointsPossible;
      return {
        isCorrect: false,
        pointsAwarded: partialCredit,
        partialCredit: partialCredit,
      };
    }

    // None correct = 0 points
    return {
      isCorrect: false,
      pointsAwarded: 0,
      partialCredit: 0,
    };
  }

  /**
   * Extract mistakes from graded attempt
   * Stores in Mistake Pool with deduplication
   */
  static async extractMistakes(attemptId: string): Promise<MistakeExtractionResult> {
    // Step 1: Fetch graded attempt
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new Error('Exam attempt not found.');
    }

    // Fetch answers
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

    // Fetch questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, attempt.examId));

    const mistakes: MistakeRecord[] = [];
    let newMistakes = 0;
    let repeatedMistakes = 0;

    // Step 2: Identify incorrect answers
    for (const answer of answers) {
      const question = questions.find((q: any) => q.id === answer.questionId);
      
      if (!question) continue;

      // Determine if this is a mistake
      const isMistake = this.isMistake(answer);
      if (!isMistake) continue;

      // Determine mistake type
      const mistakeType = this.determineMistakeType(answer);

      // Calculate points lost
      const pointsLost = (question.points || 0) - (answer.pointsAwarded || 0);

      // Step 3: Check for previous mistakes (deduplication)
      const previousMistakes = await this.findPreviousMistakes(
        attempt.studentId,
        answer.questionId
      );

      const isRepeated = previousMistakes.length > 0;
      const repetitionCount = previousMistakes.length + 1;

      if (isRepeated) {
        repeatedMistakes++;
      } else {
        newMistakes++;
      }

      // Step 4: Store mistake in Mistake Pool
      await this.storeMistake({
        studentId: attempt.studentId,
        attemptId: attempt.id,
        answerId: answer.id,
        questionId: answer.questionId,
        examId: attempt.examId,
        mistakeType,
        topic: question.topic || 'Unknown',
        subtopic: question.subtopic || null,
        skillTag: question.skillTag || 'Unknown',
        difficultyLevel: question.difficultyLevel || 'medium',
        studentAnswer: answer.answer,
        correctAnswer: question.correctAnswer,
        pointsLost,
        pointsPossible: question.points || 0,
        isRepeatedMistake: isRepeated,
        repetitionCount,
      });

      mistakes.push({
        studentId: attempt.studentId,
        questionId: answer.questionId,
        mistakeType,
        pointsLost,
        isRepeated,
        repetitionCount,
      });
    }

    console.log(`[MISTAKES] Extracted ${mistakes.length} mistakes from attempt ${attemptId} (${newMistakes} new, ${repeatedMistakes} repeated)`);

    return {
      attemptId,
      totalMistakes: mistakes.length,
      newMistakes,
      repeatedMistakes,
      mistakes,
    };
  }

  /**
   * Determine if an answer is a mistake
   */
  private static isMistake(answer: any): boolean {
    // Not answered = mistake (skipped)
    if (answer.studentAnswer === null || answer.studentAnswer === undefined) {
      return true;
    }

    // Incorrect answer = mistake
    if (answer.isCorrect === false) {
      return true;
    }

    // Partial credit = mistake (not fully correct)
    if (answer.partialCredit && answer.partialCredit > 0 && !answer.isCorrect) {
      return true;
    }

    // Correct answer = not a mistake
    return false;
  }

  /**
   * Determine mistake type
   */
  private static determineMistakeType(answer: any): 'wrong_answer' | 'partial_credit' | 'timeout' | 'skipped' {
    // Skipped (not answered)
    if (answer.studentAnswer === null || answer.studentAnswer === undefined || answer.studentAnswer === '') {
      return 'skipped';
    }

    // Partial credit (some points awarded but not fully correct)
    if (answer.partialCredit && answer.partialCredit > 0 && !answer.isCorrect) {
      return 'partial_credit';
    }

    // Timeout (answered but ran out of time)
    if (answer.metadata?.timedOut) {
      return 'timeout';
    }

    // Wrong answer (incorrect)
    return 'wrong_answer';
  }

  /**
   * Find previous mistakes for same question by student
   * Used for deduplication and frequency tracking
   */
  private static async findPreviousMistakes(
    studentId: string,
    questionId: string
  ): Promise<any[]> {
    const previousMistakes = await db.query.mistakePool.findMany({
      where: and(
        eq(mistakePool.studentId, studentId),
        eq(mistakePool.questionId, questionId)
      ),
      orderBy: [desc(mistakePool.createdAt)],
    });

    return previousMistakes;
  }

  /**
   * Store mistake in Mistake Pool
   * Deduplicated by student + question
   */
  private static async storeMistake(data: {
    studentId: string;
    attemptId: string;
    answerId: string;
    questionId: string;
    examId: string;
    mistakeType: 'wrong_answer' | 'partial_credit' | 'timeout' | 'skipped';
    topic: string;
    subtopic: string | null;
    skillTag: string;
    difficultyLevel: string;
    studentAnswer: any;
    correctAnswer: any;
    pointsLost: number;
    pointsPossible: number;
    isRepeatedMistake: boolean;
    repetitionCount: number;
  }): Promise<void> {
    await db.insert(mistakePool).values({
      studentId: data.studentId,
      attemptId: data.attemptId,
      answerId: data.answerId,
      questionId: data.questionId,
      examId: data.examId,
      mistakeType: data.mistakeType as any,
      topic: data.topic,
      subtopic: data.subtopic,
      skillTag: data.skillTag,
      difficultyLevel: data.difficultyLevel as any,
      studentAnswer: data.studentAnswer,
      correctAnswer: data.correctAnswer,
      pointsLost: data.pointsLost,
      pointsPossible: data.pointsPossible,
      isRepeatedMistake: data.isRepeatedMistake,
      repetitionCount: data.repetitionCount,
      remediationStatus: 'not_started' as any,
      includedInRetake: false,
      occurredAt: new Date(),
    } as any);
  }

  /**
   * Get student's mistake history for a specific topic
   * Does NOT expose correct answers
   */
  static async getStudentMistakesByTopic(
    studentId: string,
    topic: string
  ): Promise<{
    topic: string;
    totalMistakes: number;
    uniqueQuestions: number;
    averageRepetitionCount: number;
    mistakes: Array<{
      questionId: string;
      mistakeType: string;
      repetitionCount: number;
      lastOccurrence: Date;
      remediationStatus: string;
    }>;
  }> {
    const mistakes = await db.query.mistakePool.findMany({
      where: and(
        eq(mistakePool.studentId, studentId),
        eq(mistakePool.topic, topic)
      ),
      orderBy: [desc(mistakePool.createdAt)],
    });

    // Group by question ID (deduplication)
    const mistakesByQuestion = new Map<string, any[]>();
    mistakes.forEach(mistake => {
      const existing = mistakesByQuestion.get(mistake.questionId) || [];
      existing.push(mistake);
      mistakesByQuestion.set(mistake.questionId, existing);
    });

    // Calculate statistics
    const uniqueQuestions = mistakesByQuestion.size;
    const totalMistakes = mistakes.length;
    const averageRepetitionCount = totalMistakes / (uniqueQuestions || 1);

    // Build response (WITHOUT correct answers)
    const mistakesSummary = Array.from(mistakesByQuestion.entries()).map(([questionId, questionMistakes]) => {
      const latestMistake = questionMistakes[0]; // Most recent
      return {
        questionId,
        mistakeType: latestMistake.mistakeType,
        repetitionCount: questionMistakes.length,
        lastOccurrence: latestMistake.createdAt,
        remediationStatus: latestMistake.remediationStatus,
      };
    });

    return {
      topic,
      totalMistakes,
      uniqueQuestions,
      averageRepetitionCount: Number(averageRepetitionCount.toFixed(2)),
      mistakes: mistakesSummary,
    };
  }

  /**
   * Get all mistakes for a student (grouped by topic)
   * Does NOT expose correct answers
   */
  static async getStudentMistakesSummary(studentId: string): Promise<{
    totalMistakes: number;
    uniqueQuestions: number;
    topicBreakdown: Array<{
      topic: string;
      mistakeCount: number;
      uniqueQuestions: number;
    }>;
  }> {
    const mistakes = await db.query.mistakePool.findMany({
      where: eq(mistakePool.studentId, studentId),
    });

    // Group by topic
    const mistakesByTopic = new Map<string, Set<string>>();
    mistakes.forEach(mistake => {
      const topic = mistake.topic || 'Unknown';
      if (!mistakesByTopic.has(topic)) {
        mistakesByTopic.set(topic, new Set());
      }
      mistakesByTopic.get(topic)!.add(mistake.questionId);
    });

    // Build topic breakdown
    const topicBreakdown = Array.from(mistakesByTopic.entries()).map(([topic, questionIds]) => ({
      topic,
      mistakeCount: mistakes.filter(m => m.topic === topic).length,
      uniqueQuestions: questionIds.size,
    }));

    // Calculate overall statistics
    const allUniqueQuestions = new Set(mistakes.map(m => m.questionId));

    return {
      totalMistakes: mistakes.length,
      uniqueQuestions: allUniqueQuestions.size,
      topicBreakdown,
    };
  }

  /**
   * Get persistent mistakes (repeated 3+ times)
   * Used for targeted remediation
   */
  static async getPersistentMistakes(studentId: string): Promise<Array<{
    questionId: string;
    topic: string;
    skillTag: string;
    repetitionCount: number;
    lastOccurrence: Date;
    remediationStatus: string;
  }>> {
    const mistakes = await db.query.mistakePool.findMany({
      where: eq(mistakePool.studentId, studentId),
      orderBy: [desc(mistakePool.createdAt)],
    });

    // Group by question
    const mistakesByQuestion = new Map<string, any[]>();
    mistakes.forEach(mistake => {
      const existing = mistakesByQuestion.get(mistake.questionId) || [];
      existing.push(mistake);
      mistakesByQuestion.set(mistake.questionId, existing);
    });

    // Filter for persistent mistakes (3+ occurrences)
    const persistentMistakes = Array.from(mistakesByQuestion.entries())
      .filter(([_, questionMistakes]) => questionMistakes.length >= 3)
      .map(([questionId, questionMistakes]) => {
        const latestMistake = questionMistakes[0];
        return {
          questionId,
          topic: latestMistake.topic,
          skillTag: latestMistake.skillTag,
          repetitionCount: questionMistakes.length,
          lastOccurrence: latestMistake.createdAt,
          remediationStatus: latestMistake.remediationStatus,
        };
      })
      .sort((a, b) => b.repetitionCount - a.repetitionCount);

    return persistentMistakes;
  }

  /**
   * Mark mistakes as included in retake exam
   */
  static async markMistakesForRetake(
    studentId: string,
    questionIds: string[]
  ): Promise<number> {
    let updatedCount = 0;

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

      updatedCount++;
    }

    console.log(`[MISTAKES] Marked ${updatedCount} mistake questions for retake (student: ${studentId})`);

    return updatedCount;
  }

  /**
   * Mark mistakes as remediated (student passed retake)
   */
  static async markMistakesAsRemediated(
    studentId: string,
    questionIds: string[]
  ): Promise<number> {
    let updatedCount = 0;

    for (const questionId of questionIds) {
      await db.update(mistakePool)
        .set({
          remediationStatus: 'completed',
        } as any)
        .where(
          and(
            eq(mistakePool.studentId, studentId),
            eq(mistakePool.questionId, questionId)
          )
        );

      updatedCount++;
    }

    console.log(`[MISTAKES] Marked ${updatedCount} mistakes as remediated (student: ${studentId})`);

    return updatedCount;
  }
}

export default AnswerEvaluationService;
