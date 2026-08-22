// server/src/services/ai-chat.service.ts
import { Pool } from 'pg';
import OpenAI from 'openai';
import { getAiDbConfig } from '../db/schema';
import { getEducationalContextForLesson } from './ai.service';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize AI database pool for educational context
let aiPool: Pool | null = null;

const getAiPool = () => {
    if (!aiPool) {
        aiPool = new Pool(getAiDbConfig());
    }
    return aiPool;
};

/**
 * Teacher-focused AI orchestration service that integrates educational context
 * @param userQuery The student's question
 * @param lessonId Optional lesson ID for contextual awareness
 * @param teachingStrategy Optional pedagogical strategy to apply
 * @param studentModel Optional student profile for personalization
 * @returns AI-generated response with educational context
 */
export const getTeacherAwareResponse = async ({
    userQuery,
    lessonId,
    teachingStrategy,
    studentModel
}: {
    userQuery: string;
    lessonId?: string;
    teachingStrategy?: string;
    studentModel?: any;
}): Promise<string | null> => {
    console.log(`Received teacher-aware query: ${userQuery}${lessonId ? ` for lesson ${lessonId}` : ''}`);

    // 1. GET EDUCATIONAL CONTEXT if lessonId is provided
    const educationalContext = lessonId ? await getEducationalContextForLesson(lessonId) : null;

    // 2. GET STUDENT MODEL if available (for personalization)
    // Note: In a real implementation, this would fetch from student-model.service.ts
    // For now, we'll use what's passed in or create a basic one

    // 3. AUGMENT: Create a detailed prompt for the AI with educational context
    let augmentedPrompt = `
      You are "Eduverse Study Buddy," a helpful AI assistant for students.
      Your tone should be encouraging, clear, and educational.
      You are aware of the classroom context, curriculum progression, and individual student needs.

      A student has asked the following question: "${userQuery}"
    `;

    // Add educational context if available
    if (educationalContext &&
        (educationalContext.learningObjectives.length > 0 ||
         educationalContext.prerequisiteConcepts.length > 0 ||
         educationalContext.academicStandards.length > 0 ||
         educationalContext.commonMisconceptions.length > 0)) {

        augmentedPrompt += `

      EDUCATIONAL CONTEXT FOR THIS LESSON:
      ${educationalContext.learningObjectives.length > 0 ? `Learning Objectives: ${educationalContext.learningObjectives.join('. ')}` : ''}
      ${educationalContext.prerequisiteConcepts.length > 0 ? `Prerequisite Concepts: ${educationalContext.prerequisiteConcepts.join('. ')}` : ''}
      ${educationalContext.academicStandards.length > 0 ? `Academic Standards: ${educationalContext.academicStandards.map(s => `${s.standard_code}: ${s.standard_description}`).join('. ')}` : ''}
      ${educationalContext.commonMisconceptions.length > 0 ? `Common Student Misconceptions to Address: ${educationalContext.commonMisconceptions.join('. ')}` : ''}
      ${educationalContext.topicSequence !== undefined ? `Topic Sequence: ${educationalContext.topicSequence}` : ''}
      ${educationalContext.difficultyLevel !== undefined ? `Difficulty Level: ${educationalContext.difficultyLevel}` : ''}
      ${educationalContext.estimatedDurationMinutes !== undefined ? `Estimated Duration: ${educationalContext.estimatedDurationMinutes} minutes` : ''}
    `;
    }

    // Apply pedagogical strategy if specified
    if (teachingStrategy) {
        augmentedPrompt += `

      PEDAGOGICAL STRATEGY TO APPLY: ${teachingStrategy}
      ${getPedagogicalStrategyGuidance(teachingStrategy)}
    `;
    }

    // Add student model insights if available
    if (studentModel) {
        augmentedPrompt += `

      STUDENT INSIGHTS:
      ${studentModel.learningLevel ? `Student Learning Level: ${studentModel.learningLevel}` : ''}
      ${studentModel.struggleAreas && studentModel.struggleAreas.length > 0 ? `Known Struggle Areas: ${studentModel.struggleAreas.join(', ')}` : ''}
      ${studentModel.preferredLearningStyle ? `Preferred Learning Style: ${studentModel.preferredLearningStyle}` : ''}
      ${studentModel.engagementLevel !== undefined ? `Engagement Level: ${studentModel.engagementLevel}/10` : ''}
    `;
    }

    augmentedPrompt += `

      Based on the provided context and your own knowledge, please provide a comprehensive and easy-to-understand answer to the student's question.
      If the context does not seem relevant, rely on your general knowledge but mention that you couldn't find specific information from the provided sources.

      When answering, consider the educational context provided to tailor your explanation to the student's current learning level and curriculum progression.
    `;

    // 4. GENERATE: Send the final prompt to the OpenAI API.
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: augmentedPrompt }],
    });

    return response.choices[0].message.content;
};

/**
 * Get guidance for applying a specific pedagogical strategy
 */
function getPedagogicalStrategyGuidance(strategy: string): string {
    switch (strategy.toLowerCase()) {
        case 'socratic':
            return 'Guide the student to discover answers through thoughtful questioning rather than giving direct answers. Ask probing questions that encourage critical thinking.';
        case 'scaffolding':
            return 'Break down complex concepts into manageable steps. Provide support structures that can be gradually removed as the student gains understanding.';
        case 'differentiated':
            return 'Adapt your explanation to match the student\'s learning level and preferred learning style. Provide multiple ways to understand the concept.';
        case 'formative':
            return 'Check for understanding during your explanation. Include questions or prompts that help the student self-assess their comprehension.';
        case 'metacognitive':
            return 'Encourage reflection on the learning process. Ask questions about how the student approaches problems and what strategies they find effective.';
        case 'growth-mindset':
            return 'Emphasize effort, strategy, and progress over innate ability. Frame challenges as opportunities for growth.';
        default:
            return 'Apply the specified teaching strategy to enhance the educational value of your response.';
    }
}

/**
 * Generate a response using retrieval-augmented generation with educational context
 * This is the enhanced version of the original getRagResponse function
 */
export const getEnhancedRagResponse = async (
    userQuery: string,
    lessonId?: string
): Promise<string | null> => {
    // This maintains backward compatibility while using the new educational context features
    return getTeacherAwareResponse({
        userQuery,
        lessonId
    });
};