import { Router } from 'express';
import { Pool } from 'pg';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

// Check if we're in production (Render sets NODE_ENV)
const isProduction = process.env.NODE_ENV === 'production';

// PostgreSQL Pool for AI Database
// In production (Render), uses environment variables set in Render dashboard
// In development, uses DATABASE_URL or falls back to local defaults
const getAiDbConfig = () => {
  // If AI-specific DB vars are set, use them (both production and dev)
  if (process.env.AI_DB_HOST) {
    return {
      host: process.env.AI_DB_HOST,
      port: parseInt(process.env.AI_DB_PORT || '5432'),
      user: process.env.AI_DB_USER,
      password: process.env.AI_DB_PASSWORD,
      database: process.env.AI_DB_NAME,
      ssl: process.env.AI_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }
  
  // Fall back to main DATABASE_URL if AI_DB not configured
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }
  
  // Local development defaults
  return {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'eduverse',
    ssl: false,
  };
};

const aiPool = new Pool(getAiDbConfig());

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-004';
const GEN_MODEL = 'gemini-2.5-flash'; // Using experimental 2.0 model
const TOP_K_LESSONS = 3;
const CHUNK_FETCH_LIMIT = 50;

if (!GEMINI_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
  if (isProduction) {
    console.warn('   Add GEMINI_API_KEY to Render dashboard -> Environment tab');
  } else {
    console.warn('   Add GEMINI_API_KEY to .env or .env.ai file');
  }
}

const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// Retry helper for rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 429;
      const isLastAttempt = i === maxRetries - 1;
      
      if (!isRateLimit || isLastAttempt) {
        throw error;
      }
      
      // Extract retry delay from API response if available
      const retryDelay = error?.errorDetails?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
      const delaySeconds = retryDelay ? parseFloat(retryDelay) : null;
      const delay = delaySeconds ? delaySeconds * 1000 : baseDelay * Math.pow(2, i);
      
      console.log(`⏳ Rate limited. Retrying in ${Math.round(delay)}ms... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Personas
const PERSONAS: Record<string, { name: string; instruction: string }> = {
  alex: {
    name: 'Alex the Fun Learner',
    instruction: `You are Alex, the Fun Learner. Make learning fun with jokes, memes, and pop-culture references. Be casual, energetic, and lighthearted.`
  },
  doctor: {
    name: 'Dr. Focus',
    instruction: `You are Dr. Focus. Be structured, detailed, and methodical. Use academic terminology and clear logical steps. Be professional and precise.`
  },
  coach: {
    name: 'Coach Inspire',
    instruction: `You are Coach Inspire. Act as a personal cheerleader with motivating language and high energy. Be empowering, confident, and supportive.`
  }
};

// Embed query using Gemini
async function embedQuery(text: string): Promise<number[]> {
  if (!genAI) throw new Error('Gemini API not configured');
  
  return retryWithBackoff(async () => {
    const model = genAI!.getGenerativeModel({ model: EMBED_MODEL });
    // Use simple string format for embedding
    const result = await model.embedContent(text);
    
    return result.embedding.values || [];
  });
}

// Retrieve top K lessons by similarity
async function retrieveContext(queryEmb: number[]): Promise<any[]> {
  const vectorStr = `[${queryEmb.join(',')}]`;
  
  const query = `
    SELECT lessonid, chunktxt, (vector <=> $1) as distance
    FROM lesson_vectors
    ORDER BY vector <=> $1 ASC
    LIMIT $2
  `;

  const res = await aiPool.query(query, [vectorStr, CHUNK_FETCH_LIMIT]);
  
  // Group by lesson
  const lessonsMap = new Map<string, any[]>();
  for (const r of res.rows) {
    if (!lessonsMap.has(r.lessonid)) {
      lessonsMap.set(r.lessonid, []);
    }
    lessonsMap.get(r.lessonid)!.push({
      lesson_id: r.lessonid,
      text: r.chunktxt,
      distance: r.distance
    });
  }

  // Get top K lessons
  return Array.from(lessonsMap.entries())
    .map(([lessonId, chunks]) => ({
      lesson_id: lessonId,
      chunks,
      minDistance: Math.min(...chunks.map((c: any) => c.distance))
    }))
    .sort((a, b) => a.minDistance - b.minDistance)
    .slice(0, TOP_K_LESSONS);
}

// Generate answer with Gemini
async function generateAnswer(lessons: any[], question: string, persona: string): Promise<string> {
  if (!genAI) throw new Error('Gemini API not configured');
  
  const personaConfig = PERSONAS[persona] || PERSONAS.alex;
  
  const contextBlock = lessons.length > 0
    ? lessons.map(l => `SOURCE LESSON: ${l.lesson_id}\n${l.chunks.map((c: any) => c.text).join('\n\n')}`).join('\n\n')
    : 'No specific lesson context found.';

  const prompt = `
${personaConfig.instruction}

INSTRUCTIONS:
1. Use the SOURCE LESSONS below as your primary reference.
2. If the answer is in the lessons, cite them casually.
3. If not in lessons, use general knowledge but mention it.

SOURCE LESSONS:
${contextBlock}

STUDENT QUESTION:
${question}

Answer as ${personaConfig.name}:
`;

  return retryWithBackoff(async () => {
    const model = genAI!.getGenerativeModel({ model: GEN_MODEL });
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}

// POST /api/ai/chat - Ask the AI Study Buddy
router.post('/chat', isAuthenticated, async (req, res) => {
  try {
    const { question, persona = 'alex' } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'AI service not configured. Please add GEMINI_API_KEY to .env.ai' });
    }

    // Safety check
    const forbidden = ['bomb', 'kill', 'suicide', 'harm'];
    if (forbidden.some(word => question.toLowerCase().includes(word))) {
      return res.status(400).json({ error: 'Unsafe request detected' });
    }

    // Embed question
    const queryEmb = await embedQuery(question);
    
    // Retrieve relevant lessons
    const lessons = await retrieveContext(queryEmb);
    
    // Generate answer
    const answer = await generateAnswer(lessons, question, persona);

    res.json({
      answer,
      sources: lessons.map(l => l.lesson_id),
      persona: PERSONAS[persona]?.name || 'Alex the Fun Learner'
    });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    
    // Handle rate limit errors with user-friendly message
    if (error?.status === 429) {
      const retryAfter = error?.errorDetails?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
      const waitTime = retryAfter ? `Please wait ${retryAfter} before trying again.` : 'Please wait a minute before trying again.';
      
      return res.status(429).json({ 
        error: 'Rate limit exceeded. The free tier has limited requests per minute.',
        message: waitTime,
        suggestion: 'Try asking a simpler question or wait before retrying.'
      });
    }
    
    res.status(500).json({ error: 'Failed to generate answer', details: error.message });
  }
});

// POST /api/ai-chat/general - Versa General Knowledge Chat (no lesson context)
router.post('/general', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'AI service not configured. Please add GEMINI_API_KEY to .env.ai' });
    }

    // Safety check
    const forbidden = ['bomb', 'kill', 'suicide', 'harm', 'weapon'];
    if (forbidden.some(word => question.toLowerCase().includes(word))) {
      return res.status(400).json({ error: 'Unsafe request detected' });
    }

    const prompt = `You are Versa, a friendly and helpful AI learning assistant. Your role is to help students learn about any subject.

GUIDELINES:
- Be encouraging, patient, and supportive
- Explain concepts clearly and simply
- Use examples when helpful
- Break down complex topics into digestible parts
- If you're not sure about something, be honest
- Keep responses concise but informative (2-3 paragraphs max)
- Use a warm, conversational tone

STUDENT QUESTION:
${question}

Your response:`;

    const answer = await retryWithBackoff(async () => {
      const model = genAI!.getGenerativeModel({ model: GEN_MODEL });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    res.json({
      answer,
      mode: 'general'
    });

  } catch (error: any) {
    console.error('Versa Chat Error:', error);
    
    // Handle rate limit errors
    if (error?.status === 429) {
      const retryAfter = error?.errorDetails?.find((d: any) => d['@type']?.includes('RetryInfo'))?.retryDelay;
      const waitTime = retryAfter ? `Please wait ${retryAfter} before trying again.` : 'Please wait a minute before trying again.';
      
      return res.status(429).json({ 
        error: 'Rate limit exceeded. The free tier has limited requests per minute.',
        message: waitTime,
        suggestion: 'Try asking a simpler question or wait before retrying.'
      });
    }
    
    res.status(500).json({ error: 'Failed to generate answer', details: error.message });
  }
});

// GET /api/ai/personas - List available personas
router.get('/personas', (req, res) => {
  res.json(
    Object.entries(PERSONAS).map(([key, value]) => ({
      id: key,
      name: value.name
    }))
  );
});

// GET /api/ai/status - Check AI service configuration status
router.get('/status', async (req, res) => {
  try {
    const { checkAiDatabaseConnection } = await import('../services/lesson-digestion.service.js');
    const dbStatus = await checkAiDatabaseConnection();
    
    res.json({
      geminiConfigured: !!GEMINI_KEY,
      database: dbStatus,
      embedModel: EMBED_MODEL,
      generationModel: GEN_MODEL,
      ready: !!GEMINI_KEY && dbStatus.connected
    });
  } catch (error: any) {
    res.json({
      geminiConfigured: !!GEMINI_KEY,
      database: { connected: false, message: error.message },
      embedModel: EMBED_MODEL,
      generationModel: GEN_MODEL,
      ready: false
    });
  }
});

// POST /api/ai/digest-lesson - Process a single lesson for AI context
router.post('/digest-lesson', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Teachers or Admins only' });
    }
    
    const { lessonId, filePath } = req.body;
    if (!lessonId || !filePath) {
      return res.status(400).json({ error: 'lessonId and filePath are required' });
    }
    
    const { processLessonFile } = await import('../services/lesson-digestion.service.js');
    const result = await processLessonFile(filePath, lessonId);
    
    res.json(result);
  } catch (error: any) {
    console.error('Lesson digestion error:', error);
    res.status(500).json({ error: 'Failed to process lesson', details: error.message });
  }
});

// POST /api/ai/digest-all - Process all lessons in the uploads folder
router.post('/digest-all', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only' });
    }
    
    const { processAllLessons } = await import('../services/lesson-digestion.service.js');
    const lessonsFolder = process.env.LESSON_FOLDER || 'server/uploads/lessons';
    
    const result = await processAllLessons(lessonsFolder);
    
    res.json({
      message: `Processed ${result.processed}/${result.total} lessons`,
      ...result
    });
  } catch (error: any) {
    console.error('Batch digestion error:', error);
    res.status(500).json({ error: 'Failed to process lessons', details: error.message });
  }
});

export default router;
