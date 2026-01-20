// server/src/services/exam-attempt.service.ts

import { db } from '../db/index.js';
import {
  exams,
  examAttempts,
  examQuestions,
  examAnswers,
  enrollments,
  antiCheatEvents,
  antiCheatRiskScores,
  mistakePool
} from '../db/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface StartExamAttemptDto {
  examId: string;
  studentId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  browserInfo?: {
    name: string;
    version: string;
    os: string;
    screenResolution: string;
  };
}

export interface SaveAnswerDto {
  attemptId: string;
  questionId: string;
  answer: any;
  timeSpent?: number;
  answeredAt?: Date;
}

export interface SubmitExamDto {
  attemptId: string;
  studentId: string;
  timeRemaining?: number;
  finalAnswers?: Array<{
    questionId: string;
    answer: any;
  }>;
}

export interface ReconnectSessionDto {
  attemptId: string;
  studentId: string;
  ipAddress?: string;
}

// Locked exam configuration snapshot
export interface ExamSnapshot {
  examId: string;
  title: string;
  duration: number;
  timeLimit: number;
  totalPoints: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  antiCheatSettings: {
    antiCheatEnabled: boolean;
    requireWebcam: boolean;
    requireFullscreen: boolean;
    tabSwitchLimit: number | null;
    copyPasteAllowed: boolean;
    rightClickAllowed: boolean;
  };
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    options: any;
    points: number;
    order: number;
  }>;
}

// =====================================================
// EXAM ATTEMPT LIFECYCLE SERVICE
// =====================================================

export class ExamAttemptService {

  /**
   * START EXAM ATTEMPT
   * 
   * State Transition: NULL → IN_PROGRESS
   * 
   * Business Rules:
   * 1. Verify student is enrolled in course
   * 2. Check exam is active/scheduled
   * 3. Validate attempt limit not exceeded
   * 4. Lock exam configuration (snapshot)
   * 5. Create attempt record
   * 6. Initialize timing
   * 7. Return locked configuration
   */
  static async startExamAttempt(dto: StartExamAttemptDto): Promise<{
    attempt: any;
    examSnapshot: ExamSnapshot;
    expiresAt: Date;
  }> {
    const { examId, studentId, ipAddress, userAgent, deviceFingerprint, browserInfo } = dto;

    // 1. Get exam and verify it exists
    const [exam] = await db
      .select({
        id: exams.id,
        courseId: exams.courseId,
        title: exams.title,
        status: exams.status,
        scheduledStartAt: exams.scheduledStartAt,
        scheduledEndAt: exams.scheduledEndAt,
        duration: exams.duration,
        timeLimit: exams.timeLimit,
        totalPoints: exams.totalPoints,
        attemptsAllowed: exams.attemptsAllowed,
        shuffleQuestions: exams.shuffleQuestions,
        shuffleOptions: exams.shuffleOptions,
        antiCheatEnabled: exams.antiCheatEnabled,
        requireWebcam: exams.requireWebcam,
        requireFullscreen: exams.requireFullscreen,
        tabSwitchLimit: exams.tabSwitchLimit,
        copyPasteAllowed: exams.copyPasteAllowed,
        rightClickAllowed: exams.rightClickAllowed,
      })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      throw new Error('Exam not found.');
    }

    // 2. Verify exam is available (scheduled or active)
    const now = new Date();
    if (exam.status !== 'scheduled' && exam.status !== 'active') {
      throw new Error('Exam is not available. Current status: ' + exam.status);
    }

    // Check time window
    if (exam.scheduledStartAt && now < exam.scheduledStartAt) {
      throw new Error('Exam has not started yet.');
    }
    if (exam.scheduledEndAt && now > exam.scheduledEndAt) {
      throw new Error('Exam has ended.');
    }

    // 3. Verify student enrollment
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, exam.courseId),
          eq(enrollments.studentId, studentId)
        )
      )
      .limit(1);

    if (!enrollment) {
      throw new Error('Student is not enrolled in this course.');
    }

    const parsedTimeLimitMinutes = typeof exam.timeLimit === 'string'
      ? parseInt(exam.timeLimit, 10)
      : undefined;
    const timeLimitMinutes = (Number.isFinite(parsedTimeLimitMinutes) && (parsedTimeLimitMinutes as number) > 0)
      ? (parsedTimeLimitMinutes as number)
      : (exam.duration || 60);
    const timeLimitSeconds = timeLimitMinutes * 60;

    // 4. Check attempt limit
    const previousAttempts = await db
      .select({ count: count() })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examId, examId),
          eq(examAttempts.studentId, studentId)
        )
      );

    const attemptCount = previousAttempts[0]?.count || 0;
    const attemptNumber = attemptCount + 1;

    const maxAttempts = typeof exam.attemptsAllowed === 'string'
      ? parseInt(exam.attemptsAllowed, 10) || 1
      : exam.attemptsAllowed || 1;

    if (attemptCount >= maxAttempts) {
      throw new Error(`Attempt limit reached. Maximum ${maxAttempts} attempts allowed.`);
    }

    // 5. Check if there's an ongoing attempt
    const [ongoingAttempt] = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examId, examId),
          eq(examAttempts.studentId, studentId),
          eq(examAttempts.status, 'in_progress')
        )
      )
      .limit(1);

    if (ongoingAttempt) {
      // Return existing attempt (reconnection scenario)
      const snapshot = await this.getExamSnapshot(examId, ongoingAttempt.id);
      const expiresAt = new Date(ongoingAttempt.startedAt!);
      expiresAt.setMinutes(expiresAt.getMinutes() + timeLimitMinutes);

      return {
        attempt: ongoingAttempt,
        examSnapshot: snapshot,
        expiresAt
      };
    }

    // 6. Create exam snapshot (LOCK CONFIGURATION)
    const snapshot = await this.createExamSnapshot(examId);

    // 7. Create new attempt
    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + timeLimitMinutes);

    const insertResult = await db.insert(examAttempts).values({
      examId,
      studentId,
      attemptNumber,
      status: 'in_progress',
      startedAt,
      timeRemaining: String(timeLimitSeconds),
      duration: 0,
      ipAddress,
      userAgent,
      deviceFingerprint,
      browserInfo: browserInfo as any,
      maxScore: exam.totalPoints,
      isRetake: false,
      metadata: { examSnapshot: snapshot } as any, // Store immutable snapshot
    } as any).returning();

    const insertedAttempts = (insertResult as any)?.rows ?? insertResult;
    const newAttempt = (insertedAttempts as any[])?.[0];

    if (!newAttempt) {
      throw new Error('Failed to create exam attempt.');
    }

    // 8. Initialize answer records (for tracking purposes)
    const questions = snapshot.questions;
    if (questions.length > 0) {
      await db.insert(examAnswers).values(
        questions.map(q => ({
          attemptId: newAttempt.id,
          questionId: q.id,
          answer: {} as any, // Empty object; null violates DB constraint
          pointsPossible: q.points,
          answeredAt: startedAt,
        } as any))
      );
    }

    // 9. Audit log
    console.log(`[AUDIT] Exam attempt started: ${newAttempt.id} by student: ${studentId}, exam: ${examId}, attempt #${attemptNumber}`);

    return {
      attempt: newAttempt,
      examSnapshot: snapshot,
      expiresAt
    };
  }

  /**
   * CREATE EXAM SNAPSHOT
   * 
   * Locks exam configuration at the start of attempt.
   * Prevents mid-attempt changes from affecting student.
   * 
   * Configuration includes:
   * - Exam settings
   * - Questions (with shuffle if enabled)
   * - Anti-cheat rules
   */
  private static async createExamSnapshot(examId: string): Promise<ExamSnapshot> {
    const [exam] = await db
      .select({
        id: exams.id,
        title: exams.title,
        duration: exams.duration,
        totalPoints: exams.totalPoints,
        shuffleQuestions: exams.shuffleQuestions,
        shuffleOptions: exams.shuffleOptions,
        antiCheatEnabled: exams.antiCheatEnabled,
        requireWebcam: exams.requireWebcam,
        requireFullscreen: exams.requireFullscreen,
        tabSwitchLimit: exams.tabSwitchLimit,
        copyPasteAllowed: exams.copyPasteAllowed,
        rightClickAllowed: exams.rightClickAllowed,
      })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      throw new Error('Exam not found.');
    }

    // Get questions
    let questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(examQuestions.order);

    // Shuffle questions if enabled
    if (exam.shuffleQuestions) {
      questions = this.shuffleArray(questions);
    }

    // Shuffle options if enabled
    const questionsWithShuffledOptions = questions.map(q => {
      if (exam.shuffleOptions && q.options) {
        return {
          ...q,
          options: this.shuffleArray(q.options as any[])
        };
      }
      return q;
    });

    return {
      examId: exam.id,
      title: exam.title,
      duration: exam.duration,
      timeLimit: exam.duration, // Use duration as timeLimit (in minutes)
      totalPoints: exam.totalPoints,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
      antiCheatSettings: {
        antiCheatEnabled: exam.antiCheatEnabled,
        requireWebcam: exam.requireWebcam,
        requireFullscreen: exam.requireFullscreen,
        tabSwitchLimit: exam.tabSwitchLimit,
        copyPasteAllowed: exam.copyPasteAllowed,
        rightClickAllowed: exam.rightClickAllowed,
      },
      questions: questionsWithShuffledOptions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        points: q.points,
        order: q.order,
      }))
    };
  }

  /**
   * GET EXAM SNAPSHOT (for reconnection)
   * 
   * Retrieves the locked configuration for an ongoing attempt.
   * Fetches from metadata if available, otherwise recreates.
   */
  private static async getExamSnapshot(examId: string, attemptId: string): Promise<ExamSnapshot> {
    // Try to get snapshot from attempt metadata first
    const [attempt] = await db
      .select({ metadata: examAttempts.metadata })
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (attempt?.metadata && typeof attempt.metadata === 'object') {
      const metadata = attempt.metadata as any;
      if (metadata.examSnapshot) {
        console.log(`[SNAPSHOT] Retrieved immutable snapshot from metadata for attempt: ${attemptId}`);
        return metadata.examSnapshot as ExamSnapshot;
      }
    }

    // Fallback: recreate snapshot (for legacy attempts)
    console.warn(`[SNAPSHOT] No snapshot in metadata for attempt ${attemptId}, recreating...`);
    return await this.createExamSnapshot(examId);
  }

  /**
   * AUTO-SAVE ANSWER
   * 
   * State: IN_PROGRESS (no state change)
   * 
   * Business Rules:
   * 1. Verify attempt is in progress
   * 2. Verify question belongs to exam
   * 3. Update answer record
   * 4. Track timing and behavior
   * 5. Return success immediately (async processing)
   */
  static async saveAnswer(dto: SaveAnswerDto): Promise<{ success: boolean; savedAt: Date }> {
    const { attemptId, questionId, answer, timeSpent } = dto;

    // 1. Verify attempt exists and is in progress
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new Error('Attempt not found.');
    }

    if (attempt.status !== 'in_progress') {
      throw new Error('Cannot save answer. Attempt is not in progress.');
    }

    // 2. Verify question belongs to exam
    const [question] = await db
      .select()
      .from(examQuestions)
      .where(
        and(
          eq(examQuestions.id, questionId),
          eq(examQuestions.examId, attempt.examId)
        )
      )
      .limit(1);

    if (!question) {
      throw new Error('Question not found or does not belong to this exam.');
    }

    // 3. Get existing answer record
    const [existingAnswer] = await db
      .select()
      .from(examAnswers)
      .where(
        and(
          eq(examAnswers.attemptId, attemptId),
          eq(examAnswers.questionId, questionId)
        )
      )
      .limit(1);

    if (!existingAnswer) {
      throw new Error('Answer record not found.');
    }

    // 4. Update answer
    const now = new Date();

    await db
      .update(examAnswers)
      .set({
        answer: answer as any,
        answeredAt: now,
        timeSpentSeconds: timeSpent || existingAnswer.timeSpentSeconds,
      } as any)
      .where(eq(examAnswers.id, existingAnswer.id));

    // 5. Update attempt duration
    const duration = Math.floor((now.getTime() - attempt.startedAt!.getTime()) / 1000);
    await db
      .update(examAttempts)
      .set({ duration } as any)
      .where(eq(examAttempts.id, attemptId));

    return { success: true, savedAt: now };
  }

  /**
   * HANDLE RECONNECT
   * 
   * State: IN_PROGRESS (resume)
   * 
   * Business Rules:
   * 1. Verify attempt exists and is in progress
   * 2. Verify student ID matches
   * 3. Check time remaining
   * 4. Return current state + snapshot
   * 5. Log reconnection event
   */
  static async handleReconnect(dto: ReconnectSessionDto): Promise<{
    attempt: any;
    examSnapshot: ExamSnapshot;
    answers: any[];
    timeRemaining: number;
    expiresAt: Date;
  }> {
    const { attemptId, studentId, ipAddress } = dto;

    // 1. Get attempt
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new Error('Attempt not found.');
    }

    // 2. Verify student
    if (attempt.studentId !== studentId) {
      throw new Error('Unauthorized: Attempt belongs to different student.');
    }

    // 3. Verify status
    if (attempt.status !== 'in_progress') {
      throw new Error('Cannot reconnect. Attempt status: ' + attempt.status);
    }

    // 4. Calculate time remaining
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - attempt.startedAt!.getTime()) / 1000);
    const timeLimitSeconds = typeof attempt.timeRemaining === 'string'
      ? (parseInt(attempt.timeRemaining, 10) || 0)
      : 0;
    const timeRemaining = Math.max(0, timeLimitSeconds - elapsed);

    if (timeRemaining === 0) {
      // Time expired - auto-submit
      console.log(`[AUDIT] Attempt ${attemptId} expired on reconnect. Auto-submitting.`);
      await this.submitExam({ attemptId, studentId, timeRemaining: 0 });
      throw new Error('Exam time has expired.');
    }

    // 5. Get exam snapshot
    const snapshot = await this.getExamSnapshot(attempt.examId, attemptId);

    // 6. Get saved answers
    const answers = await db
      .select()
      .from(examAnswers)
      .where(eq(examAnswers.attemptId, attemptId));

    // 7. Update IP if changed (track location changes)
    if (ipAddress && ipAddress !== attempt.ipAddress) {
      await db
        .update(examAttempts)
        .set({ ipAddress } as any)
        .where(eq(examAttempts.id, attemptId));

      // Log IP change as potential anti-cheat event
      await db.insert(antiCheatEvents).values({
        attemptId,
        eventType: 'suspicious_pattern',
        severity: 'medium',
        description: 'IP address changed during exam',
        metadata: {
          oldIp: attempt.ipAddress,
          newIp: ipAddress
        } as any,
        detectedBy: 'system',
        timestamp: now,
      } as any);
    }

    // 8. Calculate expires at
    const expiresAt = new Date(attempt.startedAt!);
    expiresAt.setSeconds(expiresAt.getSeconds() + timeLimitSeconds);

    // 9. Audit log
    console.log(`[AUDIT] Exam attempt reconnected: ${attemptId} by student: ${studentId}, timeRemaining: ${timeRemaining}s`);

    return {
      attempt,
      examSnapshot: snapshot,
      answers,
      timeRemaining,
      expiresAt
    };
  }

  /**
   * SUBMIT EXAM
   * 
   * State Transition: IN_PROGRESS → SUBMITTED
   * 
   * Business Rules:
   * 1. Verify attempt is in progress
   * 2. Save final answers (if provided)
   * 3. Calculate final duration
   * 4. Mark as submitted
   * 5. Trigger async processing:
   *    a. Auto-grading
   *    b. Anti-cheat summary
   *    c. Mistake extraction
   */
  static async submitExam(dto: SubmitExamDto): Promise<{
    attemptId: string;
    submittedAt: Date;
    status: string;
    processingJobId: string;
  }> {
    const { attemptId, studentId, timeRemaining, finalAnswers } = dto;

    return await db.transaction(async (tx) => {
      // 1. Get and lock attempt
      const [attempt] = await tx
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.id, attemptId))
        .limit(1);

      if (!attempt) {
        throw new Error('Attempt not found.');
      }

      // 2. Verify student
      if (attempt.studentId !== studentId) {
        throw new Error('Unauthorized: Attempt belongs to different student.');
      }

      // 3. Verify status
      if (attempt.status !== 'in_progress') {
        throw new Error('Cannot submit. Attempt already submitted or invalid.');
      }

      // 4. Save final answers if provided
      if (finalAnswers && finalAnswers.length > 0) {
        for (const answer of finalAnswers) {
          await tx
            .update(examAnswers)
            .set({
              answer: answer.answer as any,
              answeredAt: new Date(),
            } as any)
            .where(
              and(
                eq(examAnswers.attemptId, attemptId),
                eq(examAnswers.questionId, answer.questionId)
              )
            );
        }
      }

      // 5. Calculate final duration
      const submittedAt = new Date();
      const duration = Math.floor((submittedAt.getTime() - attempt.startedAt!.getTime()) / 1000);

      // 6. Update attempt status
      await tx
        .update(examAttempts)
        .set({
          status: 'submitted' as any,
          submittedAt,
          timeRemaining: String(timeRemaining || 0),
          duration,
        } as any)
        .where(eq(examAttempts.id, attemptId));

      // 7. Audit log
      console.log(`[AUDIT] Exam submitted: ${attemptId} by student: ${studentId}, duration: ${duration}s`);

      // 8. Trigger async processing
      const processingJobId = createId();

      // Note: In production, use a job queue (Bull, BullMQ, etc.)
      // For now, we'll process synchronously but return immediately
      setImmediate(async () => {
        try {
          await this.processSubmission(attemptId);
        } catch (error) {
          console.error(`[ERROR] Failed to process submission ${attemptId}:`, error);
        }
      });

      return {
        attemptId,
        submittedAt,
        status: 'submitted',
        processingJobId
      };
    });
  }

  /**
   * PROCESS SUBMISSION (Async)
   * 
   * Handles post-submission processing:
   * 1. Auto-grade objective questions
   * 2. Calculate anti-cheat risk score
   * 3. Extract mistakes
   * 4. Update attempt status to GRADED or FLAGGED
   */
  private static async processSubmission(attemptId: string): Promise<void> {
    console.log(`[PROCESSING] Starting submission processing for attempt: ${attemptId}`);

    try {
      // 1. Auto-grade
      await this.autoGradeAttempt(attemptId);

      // 2. Calculate anti-cheat risk score
      await this.calculateAntiCheatRiskScore(attemptId);

      // 3. Extract mistakes
      await this.extractMistakes(attemptId);

      // 4. Update final status
      await this.updateAttemptFinalStatus(attemptId);

      console.log(`[PROCESSING] Completed submission processing for attempt: ${attemptId}`);
    } catch (error) {
      console.error(`[PROCESSING] Error processing submission ${attemptId}:`, error);
      throw error;
    }
  }

  /**
   * AUTO-GRADE ATTEMPT
   * 
   * Grades objective questions (MCQ, True/False, etc.)
   * Marks subjective questions for manual review
   */
  private static async autoGradeAttempt(attemptId: string): Promise<void> {
    // Get all answers
    const answers = await db
      .select({
        answerId: examAnswers.id,
        questionId: examAnswers.questionId,
        answer: examAnswers.answer,
        pointsPossible: examAnswers.pointsPossible,
        questionType: examQuestions.questionType,
        correctAnswer: examQuestions.correctAnswer,
        options: examQuestions.options,
        partialCreditEnabled: examQuestions.partialCreditEnabled,
        requiresManualGrading: examQuestions.requiresManualGrading,
      })
      .from(examAnswers)
      .innerJoin(examQuestions, eq(examAnswers.questionId, examQuestions.id))
      .where(eq(examAnswers.attemptId, attemptId));

    let totalScore = 0;
    let maxScore = 0;

    for (const answer of answers) {
      maxScore += answer.pointsPossible || 0;

      // Skip if requires manual grading
      if (answer.requiresManualGrading) {
        continue;
      }

      // Auto-grade based on question type
      const gradeResult = this.gradeAnswer(
        answer.questionType,
        answer.answer,
        answer.correctAnswer,
        answer.pointsPossible || 0,
        answer.partialCreditEnabled || false,
        answer.options
      );

      // Update answer with grade
      await db
        .update(examAnswers)
        .set({
          isCorrect: gradeResult.isCorrect,
          pointsAwarded: gradeResult.pointsAwarded,
        } as any)
        .where(eq(examAnswers.id, answer.answerId));

      totalScore += gradeResult.pointsAwarded;
    }

    // Update attempt with score
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    const [exam] = await db
      .select({ passingScore: exams.passingScore })
      .from(exams)
      .innerJoin(examAttempts, eq(exams.id, examAttempts.examId))
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    const passed = percentage >= (exam?.passingScore || 70);

    await db
      .update(examAttempts)
      .set({
        score: totalScore,
        percentage,
        passed,
        autoGraded: true,
        gradedAt: new Date(),
      } as any)
      .where(eq(examAttempts.id, attemptId));

    console.log(`[GRADING] Attempt ${attemptId} graded: ${totalScore}/${maxScore} (${percentage.toFixed(2)}%)`);
  }

  /**
   * GRADE INDIVIDUAL ANSWER
   * 
   * Determines if answer is correct and calculates points
   */
  private static gradeAnswer(
    questionType: string,
    studentAnswer: any,
    correctAnswer: any,
    pointsPossible: number,
    partialCreditEnabled: boolean,
    options?: any
  ): { isCorrect: boolean; pointsAwarded: number; partialCredit: boolean } {
    if (studentAnswer === null || studentAnswer === undefined) {
      return { isCorrect: false, pointsAwarded: 0, partialCredit: false };
    }

    switch (questionType) {
      case 'multiple_choice':
      case 'true_false':
        // Normalize to a canonical option key: prefer option id, else text/label/value.
        const opts = Array.isArray(options) ? options : undefined;
        const toLowerStr = (v: any) => String(v ?? '').trim().toLowerCase();

        const canonicalKey = (opt: any) => {
          if (!opt) return '';
          const id = opt.id != null ? toLowerStr(opt.id) : '';
          const txt = toLowerStr(opt.text ?? opt.label ?? opt.value);
          return id || txt;
        };

        const findOptionByVal = (val: any) => {
          if (!opts) return null;
          // numeric index
          if (typeof val === 'number' && opts[val] !== undefined) return opts[val];
          const low = toLowerStr(val);
          // direct match by id or text
          return (opts as any[]).find(o => {
            const id = o.id != null ? toLowerStr(o.id) : '';
            const txt = toLowerStr(o.text ?? o.label ?? o.value);
            return id === low || txt === low;
          }) || null;
        };

        const resolveCanonical = (val: any) => {
          // Handle arrays of answers: any match accepted
          if (Array.isArray(val)) {
            // Return a set-like string of canonical keys for comparison flexibility
            const keys = val.map(v => {
              const opt = findOptionByVal(v);
              if (opt) return canonicalKey(opt);
              return toLowerStr(v);
            }).sort();
            return keys.join('|');
          }
          // Boolean values (for true_false)
          if (typeof val === 'boolean') {
            // Try map to option text or id
            const opt = findOptionByVal(val ? 'true' : 'false');
            return opt ? canonicalKey(opt) : toLowerStr(val);
          }
          // Number index or string id/text
          if (typeof val === 'number' || typeof val === 'string') {
            const opt = findOptionByVal(val);
            return opt ? canonicalKey(opt) : toLowerStr(val);
          }
          // Object with fields
          if (val && typeof val === 'object') {
            const candidate = val.id ?? val.text ?? val.label ?? val.value;
            if (candidate != null) {
              const opt = findOptionByVal(candidate);
              return opt ? canonicalKey(opt) : toLowerStr(candidate);
            }
          }
          return toLowerStr(val);
        };

        const left = resolveCanonical(studentAnswer);
        const right = resolveCanonical(correctAnswer);
        const isCorrect = left === right || (Array.isArray(correctAnswer) && right.includes(left));
        return {
          isCorrect,
          pointsAwarded: isCorrect ? pointsPossible : 0,
          partialCredit: false
        };


      case 'fill_blank':
      case 'short_answer':
        // Case-insensitive comparison, trim whitespace, support object {text|value}
        const normalizeText = (val: any) => {
          if (val == null) return '';
          if (typeof val === 'string' || typeof val === 'number') return String(val).trim().toLowerCase();
          if (typeof val === 'object') {
            const candidate = val.text ?? val.value ?? val.answer ?? (Array.isArray(val) ? val.join(' ') : null);
            if (candidate != null) return String(candidate).trim().toLowerCase();
          }
          return String(val).trim().toLowerCase();
        };
        const studentStr = normalizeText(studentAnswer);
        const correctStr = normalizeText(correctAnswer);
        const matches = studentStr === correctStr;
        return {
          isCorrect: matches,
          pointsAwarded: matches ? pointsPossible : 0,
          partialCredit: false
        };

      case 'matching':
        // Multiple correct answers (array comparison)
        if (!Array.isArray(correctAnswer)) {
          return { isCorrect: false, pointsAwarded: 0, partialCredit: false };
        }

        const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
        const correctCount = studentAnswers.filter((ans: any) =>
          correctAnswer.includes(ans)
        ).length;

        if (correctCount === correctAnswer.length && studentAnswers.length === correctAnswer.length) {
          // Perfect match
          return { isCorrect: true, pointsAwarded: pointsPossible, partialCredit: false };
        } else if (partialCreditEnabled && correctCount > 0) {
          // Partial credit
          const partialPoints = (correctCount / correctAnswer.length) * pointsPossible;
          return { isCorrect: false, pointsAwarded: partialPoints, partialCredit: true };
        } else {
          return { isCorrect: false, pointsAwarded: 0, partialCredit: false };
        }

      default:
        // Requires manual grading (essay, code, etc.)
        return { isCorrect: false, pointsAwarded: 0, partialCredit: false };
    }
  }

  /**
   * CALCULATE ANTI-CHEAT RISK SCORE
   * 
   * Aggregates all anti-cheat events for the attempt
   * Calculates overall risk score
   */
  private static async calculateAntiCheatRiskScore(attemptId: string): Promise<void> {
    // Get all anti-cheat events
    const events = await db
      .select()
      .from(antiCheatEvents)
      .where(eq(antiCheatEvents.attemptId, attemptId));

    // Count by severity
    const severityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const eventTypeCounts: Record<string, number> = {};

    for (const event of events) {
      severityCounts[event.severity as keyof typeof severityCounts]++;
      eventTypeCounts[event.eventType] = (eventTypeCounts[event.eventType] || 0) + 1;
    }

    // Calculate risk score (0-100)
    const riskScore = Math.min(100,
      severityCounts.low * 1 +
      severityCounts.medium * 5 +
      severityCounts.high * 15 +
      severityCounts.critical * 30
    );

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 75) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    const requiresManualReview = riskScore >= 50 || severityCounts.critical > 0;

    // Create or update risk score record
    await db.insert(antiCheatRiskScores).values({
      attemptId,
      overallRiskScore: riskScore,
      riskLevel,
      lowSeverityCount: severityCounts.low,
      mediumSeverityCount: severityCounts.medium,
      highSeverityCount: severityCounts.high,
      criticalSeverityCount: severityCounts.critical,
      tabSwitchCount: eventTypeCounts['tab_switch'] || 0,
      copyPasteCount: eventTypeCounts['copy_paste'] || 0,
      fullscreenExitCount: eventTypeCounts['fullscreen_exit'] || 0,
      faceDetectionIssues: (eventTypeCounts['face_not_detected'] || 0) +
        (eventTypeCounts['multiple_faces'] || 0) +
        (eventTypeCounts['no_face_visible'] || 0),
      requiresManualReview,
      reviewPriority: riskScore >= 75 ? 10 : riskScore >= 50 ? 5 : 0,
    } as any);

    // Update attempt flag
    if (requiresManualReview) {
      await db
        .update(examAttempts)
        .set({
          flaggedForReview: true,
          riskScore,
          totalViolations: events.length,
        } as any)
        .where(eq(examAttempts.id, attemptId));
    } else {
      await db
        .update(examAttempts)
        .set({
          riskScore,
          totalViolations: events.length,
        } as any)
        .where(eq(examAttempts.id, attemptId));
    }

    console.log(`[ANTI-CHEAT] Attempt ${attemptId} risk score: ${riskScore} (${riskLevel}), flagged: ${requiresManualReview}`);
  }

  /**
   * EXTRACT MISTAKES
   * 
   * Identifies incorrect answers and creates mistake records
   * For use in adaptive retake generation
   */
  private static async extractMistakes(attemptId: string): Promise<void> {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) return;

    // Get incorrect answers
    const incorrectAnswers = await db
      .select({
        answerId: examAnswers.id,
        questionId: examAnswers.questionId,
        answer: examAnswers.answer,
        isCorrect: examAnswers.isCorrect,
        pointsAwarded: examAnswers.pointsAwarded,
        pointsPossible: examAnswers.pointsPossible,
        topic: examQuestions.topic,
        subtopic: examQuestions.subtopic,
        skillTag: examQuestions.skillTag,
        difficultyLevel: examQuestions.difficultyLevel,
        correctAnswer: examQuestions.correctAnswer,
      })
      .from(examAnswers)
      .innerJoin(examQuestions, eq(examAnswers.questionId, examQuestions.id))
      .where(
        and(
          eq(examAnswers.attemptId, attemptId),
          eq(examAnswers.isCorrect, false)
        )
      );

    // Create mistake records
    for (const answer of incorrectAnswers) {
      // Determine mistake type
      let mistakeType: 'wrong_answer' | 'partial_credit' | 'timeout' | 'skipped' = 'wrong_answer';

      if (answer.answer === null) {
        mistakeType = 'skipped';
      } else if (answer.pointsAwarded && answer.pointsAwarded > 0) {
        mistakeType = 'partial_credit';
      }

      const pointsLost = (answer.pointsPossible || 0) - (answer.pointsAwarded || 0);

      // Check if this is a repeated mistake
      const previousMistakes = await db
        .select({ count: count() })
        .from(mistakePool)
        .where(
          and(
            eq(mistakePool.studentId, attempt.studentId),
            eq(mistakePool.topic, answer.topic || ''),
            eq(mistakePool.skillTag, answer.skillTag || '')
          )
        );

      const isRepeatedMistake = (previousMistakes[0]?.count || 0) > 0;
      const repetitionCount = (previousMistakes[0]?.count || 0) + 1;

      await db.insert(mistakePool).values({
        studentId: attempt.studentId,
        attemptId: attempt.id,
        answerId: answer.answerId,
        questionId: answer.questionId,
        examId: attempt.examId,
        mistakeType,
        topic: answer.topic || null,
        subtopic: answer.subtopic || null,
        skillTag: answer.skillTag || null,
        difficultyLevel: answer.difficultyLevel || null,
        studentAnswer: answer.answer as any,
        correctAnswer: answer.correctAnswer as any,
        pointsLost,
        pointsPossible: answer.pointsPossible || 0,
        occurredAt: new Date(),
        isRepeatedMistake,
        repetitionCount,
      } as any);
    }

    console.log(`[MISTAKES] Extracted ${incorrectAnswers.length} mistakes from attempt ${attemptId}`);
  }

  /**
   * UPDATE FINAL STATUS
   * 
   * Determines final attempt status based on:
   * - Grading completion
   * - Anti-cheat flags
   * - Manual review requirements
   */
  private static async updateAttemptFinalStatus(attemptId: string): Promise<void> {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) return;

    let finalStatus: 'graded' | 'flagged' | 'under_review' = 'graded';

    // Check if flagged for review
    if (attempt.flaggedForReview) {
      finalStatus = 'flagged';
    }

    // Check if has questions requiring manual grading
    const manualGradingNeeded = await db
      .select({ count: count() })
      .from(examAnswers)
      .innerJoin(examQuestions, eq(examAnswers.questionId, examQuestions.id))
      .where(
        and(
          eq(examAnswers.attemptId, attemptId),
          eq(examQuestions.requiresManualGrading, true)
        )
      );

    if ((manualGradingNeeded[0]?.count || 0) > 0) {
      finalStatus = 'under_review';
    }

    await db
      .update(examAttempts)
      .set({ status: finalStatus as any })
      .where(eq(examAttempts.id, attemptId));

    console.log(`[STATUS] Attempt ${attemptId} final status: ${finalStatus}`);
  }

  /**
   * UTILITY: Shuffle array (Fisher-Yates)
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
