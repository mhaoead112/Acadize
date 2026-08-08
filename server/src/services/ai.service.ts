// server/src/services/ai.service.ts

import OpenAI from 'openai';
import axios from 'axios';
import { Pool } from 'pg';
import { getAiDbConfig } from '../db/schema';

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
 * Performs a search using the Google Custom Search API.
 * @param query The search term.
 * @returns A string containing concatenated search result snippets.
 */
async function performGoogleSearch(query: string): Promise<string> {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        throw new Error("Google API credentials are not configured in .env file.");
    }

    try {
        const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
            params: {
                key: GOOGLE_API_KEY,
                cx: SEARCH_ENGINE_ID,
                q: query,
                num: 3, // Fetch top 3 results
            },
        });

        if (!response.data.items || response.data.items.length === 0) {
            return "No relevant information was found from the web search.";
        }

        const snippets = response.data.items.map((item: any) => item.snippet);
        return snippets.join("\n---\n");

    } catch (error: any) {
        console.error("Error performing Google Search:", error.response?.data || error.message);
        // Return a fallback message instead of throwing an error to the user
        return "There was an error while trying to search for information.";
    }
}

/**
 * Fetches educational context for a specific lesson
 * @param lessonId The ID of the lesson to get context for
 * @returns Educational context object
 */
async function getEducationalContextForLesson(lessonId: string): Promise<any> {
    try {
        const pool = getAiPool();

        // Fetch learning objectives
        const learningObjectivesResult = await pool.query(
            `SELECT objective, blooms_taxonomy_level FROM learning_objectives WHERE lesson_id = $1`,
            [lessonId]
        );
        const learningObjectives = learningObjectivesResult.rows.map(row => row.objective);

        // Fetch prerequisite concepts
        const prerequisiteConceptsResult = await pool.query(
            `SELECT concept_description FROM prerequisite_concepts WHERE lesson_id = $1`,
            [lessonId]
        );
        const prerequisiteConcepts = prerequisiteConceptsResult.rows.map(row => row.concept_description);

        // Fetch academic standards
        const academicStandardsResult = await pool.query(
            `SELECT standard_code, standard_description, subject_area, grade_level FROM academic_standards WHERE lesson_id = $1`,
            [lessonId]
        );
        const academicStandards = academicStandardsResult.rows;

        // Fetch lesson metadata (for common misconceptions, topic sequence, etc.)
        const lessonMetadataResult = await pool.query(
            `SELECT common_misconceptions, topic_sequence, difficulty_level, estimated_duration_minutes, keywords FROM lesson_metadata WHERE lesson_id = $1`,
            [lessonId]
        );
        const lessonMetadata = lessonMetadataResult.rows[0] || {};

        // Parse JSON fields if they are stored as JSON strings
        const commonMisconceptions = lessonMetadata.common_misconceptions
            ? typeof lessonMetadata.common_misconceptions === 'string'
                ? JSON.parse(lessonMetadata.common_misconceptions)
                : lessonMetadata.common_misconceptions
            : [];

        const keywords = lessonMetadata.keywords
            ? typeof lessonMetadata.keywords === 'string'
                ? JSON.parse(lessonMetadata.keywords)
                : lessonMetadata.keywords
            : [];

        return {
            learningObjectives,
            prerequisiteConcepts,
            academicStandards,
            commonMisconceptions,
            topicSequence: lessonMetadata.topic_sequence,
            difficultyLevel: lessonMetadata.difficulty_level,
            estimatedDurationMinutes: lessonMetadata.estimated_duration_minutes,
            keywords
        };
    } catch (error) {
        console.warn(`Could not fetch educational context for lesson ${lessonId}:`, error);
        // Return empty context rather than failing
        return {
            learningObjectives: [],
            prerequisiteConcepts: [],
            academicStandards: [],
            commonMisconceptions: [],
            topicSequence: undefined,
            difficultyLevel: undefined,
            estimatedDurationMinutes: undefined,
            keywords: []
        };
    }
}

/**
 * Generates a response from the AI Study Buddy using RAG with educational context.
 * @param userQuery The student's question.
 * @param lessonId Optional lesson ID for contextual awareness
 * @returns The AI-generated response as a string.
 */
export const getRagResponse = async (userQuery: string, lessonId?: string): Promise<string | null> => {
    console.log(`Received query: ${userQuery}${lessonId ? ` for lesson ${lessonId}` : ''}`);

    // 1. RETRIEVE: Get context from our custom search.
    const searchContext = await performGoogleSearch(userQuery);

    // 2. GET EDUCATIONAL CONTEXT if lessonId is provided
    const educationalContext = lessonId ? await getEducationalContextForLesson(lessonId) : null;

    // 3. AUGMENT: Create a detailed prompt for the AI.
    let augmentedPrompt = `
      You are "Eduverse Study Buddy," a helpful AI assistant for students.
      Your tone should be encouraging, clear, and educational.

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
      ${educationalContext.academicStandards.length > 0 ? `Academic Standards: ${educationalContext.academicStandards.map(s => `${s.standardCode}: ${s.standardDescription}`).join('. ')}` : ''}
      ${educationalContext.commonMisconceptions.length > 0 ? `Common Student Misconceptions to Address: ${educationalContext.commonMisconceptions.join('. ')}` : ''}
      ${educationalContext.topicSequence !== undefined ? `Topic Sequence: ${educationalContext.topicSequence}` : ''}
      ${educationalContext.difficultyLevel !== undefined ? `Difficulty Level: ${educationalContext.difficultyLevel}` : ''}
    `;
    }

    augmentedPrompt += `

      Here is some context I found from trusted educational websites:
      ---
      ${searchContext}
      ---
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