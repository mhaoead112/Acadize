import { db } from '../db/index.js';
import {
  mistakePool,
  mistakeRetakeExams,
  examQuestions,
  examAttempts,
  examAnswers,
  exams,
} from '../db/schema.js';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

interface RetakeConfig {
  studentId: string;
  organizationId: string;    // requester's org — enforces tenant isolation
  topicNames: string[]; // e.g., ["Topic 1", "Topic 2"]
  questionCount: number;
  difficulty: 'review' | 'challenge';
}

interface RetakeQuestion {
  id: string;
  examId: string;
  questionText: string;
  questionType: string;
  options: any[];
  points: number;
  topic: string;
  difficulty: string;
  explanation: string;
  mistakeId: string;
}

export async function generateRetakeExam(config: RetakeConfig) {
  try {
    // 1. Fetch student's mistakes for selected topics
    const studentMistakes = await db
      .select()
      .from(mistakePool)
      .where(
        and(
          eq(mistakePool.studentId, config.studentId),
          inArray(mistakePool.topic, config.topicNames),
          isNull(mistakePool.correctedInRetake), // Only uncorrected mistakes
        )
      );

    if (studentMistakes.length === 0) {
      throw new Error('No mistakes found for selected topics');
    }

    // 2. Get corresponding exam questions with variants
    const questionIds = studentMistakes.map((m) => m.questionId);
    const mistakeQuestions = await db
      .select()
      .from(examQuestions)
      .where(inArray(examQuestions.id, questionIds));

    // 3. Select questions for retake (up to questionCount, varying by difficulty)
    const selectedQuestions = selectQuestionsForRetake(
      mistakeQuestions,
      studentMistakes,
      config.questionCount,
      config.difficulty
    );

    if (selectedQuestions.length === 0) {
      throw new Error('Unable to select questions for retake');
    }

    // 4. Calculate total points and create retake exam
    const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    // Get the original exam details
    const originalExamId = mistakeQuestions[0]?.examId || '';
    const originalExam = await db
      .select()
      .from(exams)
      .where(eq(exams.id, originalExamId))
      .limit(1);

    // ── Tenant isolation: verify the exam belongs to the requester's organization ──
    if (!originalExam[0]) {
      throw new Error('Original exam not found');
    }
    if (originalExam[0].organizationId !== config.organizationId) {
      const err: any = new Error(
        'Access denied: the exam associated with these mistakes does not belong to your organization'
      );
      err.status = 403;
      throw err;
    }

    const retakeId = createId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Insert retake exam record
    await db.insert(mistakeRetakeExams).values({
      originalExamId,
      studentId: config.studentId,
      originalAttemptId: studentMistakes[0]?.attemptId || '',
      title: `${originalExam[0]?.title || 'Exam'} - Retake (${config.topicNames.join(', ')})`,
      description: `Mistake-based retake focusing on: ${config.topicNames.join(', ')}`,
      status: 'available',
      availableFrom: now,
      expiresAt,
      duration: Math.ceil((selectedQuestions.length / 5) * 30), // ~30 min per 5 questions
      adaptiveStrategy: {
        topics: config.topicNames,
        difficulty: config.difficulty,
        focusOnMistakes: true,
      },
      totalQuestions: selectedQuestions.length,
      totalPoints,
      targetTopics: config.topicNames,
      targetSkills: null,
      mistakeIds: studentMistakes.map((m) => m.id),
      adjustedDifficulty: true,
      difficultyModifier: config.difficulty === 'challenge' ? 1.2 : 0.9,
    } as any);

    return {
      retakeId,
      questions: selectedQuestions,
      totalPoints,
      duration: Math.ceil((selectedQuestions.length / 5) * 30),
      mistakeCount: studentMistakes.length,
    };
  } catch (error) {
    console.error('Error generating retake exam:', error);
    throw error;
  }
}

export async function getRetakeExam(retakeId: string, studentId: string) {
  try {
    // 1. Fetch retake exam
    const retake = await db
      .select()
      .from(mistakeRetakeExams)
      .where(
        and(
          eq(mistakeRetakeExams.id, retakeId),
          eq(mistakeRetakeExams.studentId, studentId)
        )
      )
      .limit(1);

    if (!retake || retake.length === 0) {
      throw new Error('Retake exam not found');
    }

    // 2. Fetch associated mistakes
    const mistakeIds = (retake[0].mistakeIds as string[]) || [];
    const mistakes = await db
      .select()
      .from(mistakePool)
      .where(inArray(mistakePool.id, mistakeIds));

    // 3. Fetch questions
    const questionIds = mistakes.map((m) => m.questionId);
    const questions = await db
      .select()
      .from(examQuestions)
      .where(inArray(examQuestions.id, questionIds));

    return {
      retake: retake[0],
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.options,
        points: q.points,
        topic: q.topic,
        difficulty: q.difficultyLevel,
      })),
      mistakeCount: mistakes.length,
    };
  } catch (error) {
    console.error('Error fetching retake exam:', error);
    throw error;
  }
}

export async function submitRetakeExam(
  retakeId: string,
  studentId: string,
  answers: { questionId: string; answer: any }[],
  durationSeconds: number
) {
  try {
    // 1. Fetch retake exam
    const retakeExam = await db
      .select()
      .from(mistakeRetakeExams)
      .where(
        and(
          eq(mistakeRetakeExams.id, retakeId),
          eq(mistakeRetakeExams.studentId, studentId)
        )
      )
      .limit(1);

    if (!retakeExam || retakeExam.length === 0) {
      throw new Error('Retake exam not found');
    }

    // 2. Create exam attempt for retake
    const attemptId = createId();
    const now = new Date();

    await db.insert(examAttempts).values({
      id: attemptId,
      examId: retakeExam[0].originalExamId,
      studentId,
      attemptNumber: 1,
      status: 'submitted',
      startedAt: new Date(now.getTime() - durationSeconds * 1000),
      submittedAt: now,
      duration: durationSeconds, // column is duration_seconds, mapped to duration property
      score: 0,
      maxScore: retakeExam[0].totalPoints || 100,
      percentage: 0,
      autoGraded: true, // column was auto_graded
      isRetake: true,
      originalAttemptId: retakeExam[0].originalAttemptId,
      retakeReason: 'mistake_based_learning',
      createdAt: now,
      updatedAt: now,
    } as any);

    // 3. Fetch questions and grade answers
    const mistakeIds = (retakeExam[0].mistakeIds as string[]) || [];
    const mistakes = await db
      .select()
      .from(mistakePool)
      .where(inArray(mistakePool.id, mistakeIds));

    const mistakeMap = new Map(mistakes.map((m) => [m.questionId, m]));

    let totalScore = 0;
    let totalPoints = 0;
    const correctedMistakeIds: string[] = [];

    // 4. Store answers and calculate score
    for (const answer of answers) {
      const question = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.id, answer.questionId))
        .limit(1);

      if (!question || question.length === 0) continue;

      const q = question[0];
      const isCorrect = checkAnswer(answer.answer, q.correctAnswer);
      const pointsAwarded = isCorrect ? (q.points || 1) : 0;

      totalScore += pointsAwarded;
      totalPoints += q.points || 1;

      // Store answer
      await db.insert(examAnswers).values({
        attemptId,
        questionId: answer.questionId,
        answer: answer.answer as any,
        isCorrect,
        pointsAwarded: parseFloat(String(pointsAwarded)),
        pointsPossible: q.points || 1,
        timeSpentSeconds: Math.floor(durationSeconds / answers.length),
        answeredAt: now,
      } as any);

      // Track corrected mistakes
      const mistake = mistakeMap.get(answer.questionId) as any;
      if (mistake && isCorrect) {
        correctedMistakeIds.push(mistake.id);
      }
    }

    const percentage = (totalScore / totalPoints) * 100;
    const passed = percentage >= 70;

    // 5. Update attempt with scores
    await db
      .update(examAttempts)
      .set({
        score: totalScore,
        maxScore: totalPoints,
        percentage,
        passed,
        gradedAt: now,
        status: 'graded' as any,
        submittedAt: now,
      } as any)
      .where(eq(examAttempts.id, attemptId));

    // 6. Update retake exam completion
    await db
      .update(mistakeRetakeExams)
      .set({
        completedAt: now,
        attemptId,
        score: totalScore as any,
        passed,
        improvementPercentage: percentage - 50 as any, // Rough estimate vs original
      } as any)
      .where(eq(mistakeRetakeExams.id, retakeId));

    // 7. Update mistake pool - mark corrected mistakes
    for (const mistakeId of correctedMistakeIds) {
      await db
        .update(mistakePool)
        .set({
          correctedInRetake: true,
          retakeAttemptId: attemptId,
          remediationStatus: 'completed' as any,
          remediationCompletedAt: now,
        } as any)
        .where(eq(mistakePool.id, mistakeId));
    }

    return {
      attemptId,
      score: totalScore,
      maxScore: totalPoints,
      percentage,
      passed,
      correctedMistakes: correctedMistakeIds.length,
    };
  } catch (error) {
    console.error('Error submitting retake exam:', error);
    throw error;
  }
}

// Helper: Select questions for retake based on difficulty
function selectQuestionsForRetake(
  questions: any[],
  mistakes: any[],
  targetCount: number,
  difficulty: 'review' | 'challenge'
): any[] {
  // Prioritize questions by difficulty based on config
  const byDifficulty = {
    easy: questions.filter((q) => q.difficultyLevel === 'easy'),
    medium: questions.filter((q) => q.difficultyLevel === 'medium'),
    hard: questions.filter((q) => q.difficultyLevel === 'hard'),
  };

  const selected: any[] = [];

  if (difficulty === 'review') {
    // Review: mostly easy and medium
    selected.push(...byDifficulty.easy.slice(0, Math.ceil(targetCount * 0.4)));
    selected.push(...byDifficulty.medium.slice(0, Math.ceil(targetCount * 0.5)));
    selected.push(...byDifficulty.hard.slice(0, Math.ceil(targetCount * 0.1)));
  } else {
    // Challenge: mix of medium and hard
    selected.push(...byDifficulty.easy.slice(0, Math.ceil(targetCount * 0.1)));
    selected.push(...byDifficulty.medium.slice(0, Math.ceil(targetCount * 0.4)));
    selected.push(...byDifficulty.hard.slice(0, Math.ceil(targetCount * 0.5)));
  }

  return selected.slice(0, targetCount);
}

// Helper: Check if answer is correct
function checkAnswer(studentAnswer: any, correctAnswer: any): boolean {
  // Handle different answer formats
  if (typeof studentAnswer === 'string' && typeof correctAnswer === 'string') {
    return studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  }

  if (typeof studentAnswer === 'number' && typeof correctAnswer === 'number') {
    return studentAnswer === correctAnswer;
  }

  if (Array.isArray(studentAnswer) && Array.isArray(correctAnswer)) {
    return (
      studentAnswer.length === correctAnswer.length &&
      studentAnswer.every((val, idx) => val === correctAnswer[idx])
    );
  }

  return JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer);
}
