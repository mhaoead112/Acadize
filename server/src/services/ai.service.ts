// server/src/services/ai.service.ts

import OpenAI from 'openai';
import axios from 'axios';

// Ensure you have a .env file in your /server directory with these keys
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

    } catch (error) {
        console.error("Error performing Google Search:", error.response?.data || error.message);
        // Return a fallback message instead of throwing an error to the user
        return "There was an error while trying to search for information.";
    }
}

/**
 * Generates a response from the AI Study Buddy using RAG.
 * @param userQuery The student's question.
 * @returns The AI-generated response as a string.
 */
export const getRagResponse = async (userQuery: string): Promise<string | null> => {
    console.log(`Received query: ${userQuery}`);

    // 1. RETRIEVE: Get context from our custom search.
    const searchContext = await performGoogleSearch(userQuery);

    // 2. AUGMENT: Create a detailed prompt for the AI.
    const augmentedPrompt = `
      You are "Eduverse Study Buddy," a helpful AI assistant for students.
      Your tone should be encouraging, clear, and educational.

      A student has asked the following question: "${userQuery}"

      Here is some context I found from trusted educational websites:
      ---
      ${searchContext}
      ---
      Based on the provided context and your own knowledge, please provide a comprehensive and easy-to-understand answer to the student's question.
      If the context does not seem relevant, rely on your general knowledge but mention that you couldn't find specific information from the provided sources.
    `;

    // 3. GENERATE: Send the final prompt to the OpenAI API.
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: augmentedPrompt }],
    });

    return response.choices[0].message.content;
};