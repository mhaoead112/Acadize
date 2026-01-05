import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

// ------------- CONFIG -------------
dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Postgres (Neon) Configuration
const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || "5432");
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// Model Configuration
// Use the exact model defined in your .env (text-embedding-004)
const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-004";
// Using the latest flash model for generation
const GEN_MODEL = "gemini-2.5-flash"; 

const TOP_K_LESSONS = 3; // Number of distinct lessons to retrieve context from
const CHUNK_FETCH_LIMIT = 50; // Fetch top 50 chunks from DB to find the best lessons
const MAX_RETRIES = 3;

console.log(`ℹ️  Using Embedding Model: ${EMBED_MODEL}`);
console.log(`ℹ️  Using Database: ${DB_HOST} (${DB_NAME})`);

if (!GEMINI_KEY) {
    throw new Error("GEMINI_API_KEY missing. Put GEMINI_API_KEY=... in .env");
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// ------------- NEW: PERSONA DEFINITIONS -------------
interface Persona {
    name: string;
    instruction: string;
}

const PERSONAS: Record<string, Persona> = {
    ALEX: {
        name: "Alex the Fun Learner",
        instruction: `You are Alex, the Fun Learner. 
        Style: Make learning fun! Use jokes, memes, pop-culture references, and entertaining metaphors. 
        Tone: Casual, energetic, and lighthearted. 
        Goal: Explain concepts simply but accurately, ensuring the student enjoys the process.`
    },
    DOCTOR: {
        name: "Dr. Focus",
        instruction: `You are Dr. Focus. 
        Style: Structured, detailed, and methodical. Use bullet points, academic terminology, and clear logical steps.
        Tone: Professional, serious, and precise.
        Goal: Provide deep learning and comprehensive understanding without distractions.`
    },
    COACH: {
        name: "Coach Inspire",
        instruction: `You are Coach Inspire. 
        Style: Act as a personal cheerleader. Use motivating language, affirmations, and high energy.
        Tone: Empowering, confident, and supportive.
        Goal: Keep the student motivated and confident while explaining the material clearly.`
    }
};

// Default Persona
let currentPersona = PERSONAS.ALEX;

// ------------- TYPES -------------
interface ChatMessage {
    role: string;
    text: string;
}

interface ScoredChunk {
    lesson_id: string;
    text: string;
    distance: number; // Cosine distance from PGVector
}

interface LessonGroup {
    lesson_id: string;
    chunks: ScoredChunk[];
}

interface ResponseOutput {
    answer_text?: string;
    used_lessons?: LessonGroup[];
    error?: string;
}

// ------------- SESSION & SAFETY -------------
const chatHistory: ChatMessage[] = [];

const FORBIDDEN_KEYWORDS = [
    "bomb", "explode", "how to kill", "kill ", "suicide", "self-harm", "hard drugs",
    "child sexual", "rape", "porn", "manufacture weapon", "weaponize", "how to make a bomb"
];

function containsForbiddenRequest(text: string): boolean {
    const t = text.toLowerCase();
    return FORBIDDEN_KEYWORDS.some(kw => t.includes(kw));
}

// ------------- UTILS -------------
async function retry<T>(fn: () => Promise<T>, maxTries = MAX_RETRIES): Promise<T> {
    let delay = 1000;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxTries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5;
        }
    }
    throw new Error("Unreachable");
}

// ------------- DATABASE -------------
const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: { rejectUnauthorized: false }, // Required for Neon
});

// ------------- EMBEDDING -------------
async function embedQueryGemini(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
    
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        taskType: TaskType.RETRIEVAL_QUERY
    });
    
    const values = result.embedding.values;
    if (!values) throw new Error("Unexpected embedding response");
    return values;
}

// ------------- RETRIEVAL BY LESSON -------------
async function retrieveTopKByLesson(queryEmb: number[], topKLessons = TOP_K_LESSONS): Promise<LessonGroup[]> {
    // 1. Vector Search in Postgres
    // We fetch more chunks (CHUNK_FETCH_LIMIT) than we need, then group them by lesson to find the most relevant lessons.
    // The `<=>` operator is Cosine Distance. Lower is better.
    
    const vectorStr = `[${queryEmb.join(",")}]`;
    
    const query = `
        SELECT lessonid, chunktxt, (vector <=> $1) as distance
        FROM lesson_vectors
        ORDER BY vector <=> $1 ASC
        LIMIT $2
    `;

    const res = await pool.query(query, [vectorStr, CHUNK_FETCH_LIMIT]);
    
    const rows = res.rows;

    // 2. Group chunks by Lesson ID
    const lessonsMap = new Map<string, ScoredChunk[]>();

    for (const r of rows) {
        if (!lessonsMap.has(r.lessonid)) {
            lessonsMap.set(r.lessonid, []);
        }
        lessonsMap.get(r.lessonid)!.push({
            lesson_id: r.lessonid,
            text: r.chunktxt,
            distance: r.distance
        });
    }

    // 3. Sort Lessons by their best chunk (lowest distance is best)
    const sortedLessons = Array.from(lessonsMap.entries())
        .map(([lessonId, chunks]) => {
            // Find the minimum distance (best match) in this lesson group
            const minDistance = Math.min(...chunks.map(c => c.distance));
            return { lesson_id: lessonId, chunks, minDistance };
        })
        .sort((a, b) => a.minDistance - b.minDistance) // Ascending sort by distance
        .slice(0, topKLessons);

    return sortedLessons.map(l => ({
        lesson_id: l.lesson_id,
        chunks: l.chunks
    }));
}

// ------------- PROMPT LOGIC -------------
function buildPromptByLesson(lessons: LessonGroup[], question: string): string {
    const lessonTexts: string[] = [];
    
    for (const l of lessons) {
        const text = l.chunks
            .map(c => `[Context Chunk] ${c.text}`)
            .join("\n\n");
        lessonTexts.push(`SOURCE LESSON: ${l.lesson_id}\n${text}`);
    }

    const contextBlock = lessonTexts.length > 0 
        ? lessonTexts.join("\n\n") 
        : "/* no specific lesson context found, answer from general knowledge */";

    const recentHistory = chatHistory.slice(-5); // Keep context window manageable

    // Incorporate the current persona instruction
    return `
${currentPersona.instruction}

INSTRUCTIONS:
1. Treat the SOURCE LESSONS below as your primary truth.
2. If the answer is in the lessons, cite the lesson name casually (e.g., "According to the tutorial...").
3. If the answer isn't in the lessons, rely on your general knowledge but mention that it wasn't in the specific notes.

SOURCE LESSONS:
${contextBlock}

CHAT HISTORY:
${JSON.stringify(recentHistory, null, 2)}

CURRENT STUDENT QUESTION:
${question}

Remember to answer in the voice and style of ${currentPersona.name}.
`;
}

// ------------- GENERATION -------------
async function generateWithGemini(prompt: string): Promise<string> {
    const model = genAI.getGenerativeModel({ model: GEN_MODEL });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
}

// ------------- HIGH-LEVEL FLOW -------------
async function produceAnswer(question: string): Promise<ResponseOutput> {
    question = question.trim();
    if (!question) return { error: "Empty question." };
    
    if (containsForbiddenRequest(question)) {
        return { error: "Unsafe or disallowed request." };
    }

    let qEmb: number[];
    let lessons: LessonGroup[];

    try {
        qEmb = await retry(() => embedQueryGemini(question));
        lessons = await retrieveTopKByLesson(qEmb, TOP_K_LESSONS);
    } catch (e) {
        console.error("Retrieval Error:", e);
        return { error: "I'm having trouble accessing my library memory right now." };
    }

    const prompt = buildPromptByLesson(lessons, question);
    let gen: string;

    try {
        gen = await retry(() => generateWithGemini(prompt));
    } catch (e) {
        console.error("Generation Error:", e);
        return { error: "I'm having trouble thinking of an answer right now.", used_lessons: lessons };
    }

    chatHistory.push({ role: "user", text: question });
    chatHistory.push({ role: "assistant", text: gen });

    return { answer_text: gen, used_lessons: lessons };
}

// ------------- CLI MAIN -------------
async function main() {
    console.log("✅ AI Study Buddy Loaded (Postgres + pgvector Enabled).");
    console.log("Type 'switch alex', 'switch doctor', or 'switch coach' to change personalities.");
    console.log("Type 'exit' to quit.\n");
    console.log(`Current Buddy: ${currentPersona.name}\n`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

    while (true) {
        let user = await ask(`[${currentPersona.name}] You: `);
        user = user.trim();

        if (!user) continue;

        // Handle Exit
        if (user.toLowerCase() === "exit") {
            console.log("Goodbye.");
            rl.close();
            await pool.end();
            process.exit(0);
        }

        // Handle Character Switching
        const lowerUser = user.toLowerCase();
        if (lowerUser.startsWith("switch")) {
            if (lowerUser.includes("alex")) {
                currentPersona = PERSONAS.ALEX;
                console.log(`✨ Switched to: ${currentPersona.name}\n`);
                continue;
            } else if (lowerUser.includes("doctor") || lowerUser.includes("dr")) {
                currentPersona = PERSONAS.DOCTOR;
                console.log(`🩺 Switched to: ${currentPersona.name}\n`);
                continue;
            } else if (lowerUser.includes("coach")) {
                currentPersona = PERSONAS.COACH;
                console.log(`📣 Switched to: ${currentPersona.name}\n`);
                continue;
            } else {
                console.log("⚠️ Unknown character. Try: 'switch alex', 'switch doctor', or 'switch coach'.");
                continue;
            }
        }

        // Safety check
        if (containsForbiddenRequest(user)) {
            console.log("Assistant: Unsafe request detected.");
            continue;
        }

        // Generate Answer
        console.log(`... ${currentPersona.name} is thinking ...`);
        const out = await produceAnswer(user);

        if (out.error) {
            console.log("Assistant:", out.error);
            continue;
        }

        console.log(`\n${currentPersona.name}:\n`);
        console.log(out.answer_text);
        
        // Debug: Show sources if helpful
        if (out.used_lessons && out.used_lessons.length > 0) {
            console.log("\n--- Sources ---");
            out.used_lessons.forEach(l => console.log(`• ${l.lesson_id}`));
        }
        
        console.log("\n---\n");
    }
}

main().catch(console.error);
