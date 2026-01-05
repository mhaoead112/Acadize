// server/src/services/lesson-digestion.service.ts
// Service to process lesson files and generate embeddings for AI retrieval

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import axios from 'axios';

// Configuration
const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-004';
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1000');
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '200');
const DELAY_BETWEEN_EMBEDS = parseFloat(process.env.DELAY_BETWEEN_EMBEDS || '0.2');

// Get AI database configuration
const getAiDbConfig = () => {
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
  
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }
  
  return {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'eduverse',
    ssl: false,
  };
};

// Lazy pool creation
let pool: Pool | null = null;
const getPool = () => {
  if (!pool) {
    pool = new Pool(getAiDbConfig());
  }
  return pool;
};

// Helper: File hash for incremental updates
function getFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// PDF text extraction
async function extractPdfText(filePath: string): Promise<string> {
  try {
    const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text: string }>;
    const data = fs.readFileSync(filePath);
    const pdf = await pdfParse(data);
    return pdf.text;
  } catch (err: any) {
    console.error(`PDF extraction failed for ${filePath}:`, err?.message || err);
    return '';
  }
}

// PPTX text extraction
async function extractPptxText(filePath: string): Promise<string> {
  try {
    const zip = new AdmZip(filePath);
    const slides: string[] = [];
    const slideFiles = zip.getEntries().filter(
      (entry) => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')
    );

    for (const slideFile of slideFiles) {
      const xml = slideFile.getData().toString('utf8');
      const parsed = await parseStringPromise(xml);
      const texts: string[] = [];
      const shapes = parsed?.['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0]?.['p:sp'] || [];

      shapes.forEach((shape: any) => {
        const tNodes = shape['p:txBody']?.[0]?.['a:p'] || [];
        tNodes.forEach((pNode: any) => {
          if (pNode['a:r']) {
            pNode['a:r'].forEach((r: any) => {
              if (r['a:t'] && r['a:t'][0]) texts.push(r['a:t'][0]);
            });
          } else if (pNode['a:t']) {
            texts.push(pNode['a:t'][0]);
          }
        });
      });

      slides.push(texts.join(' '));
    }
    return slides.join('\n');
  } catch (err: any) {
    console.warn('PPTX extraction failed:', err?.message || err);
    return '';
  }
}

// Main text extractor
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.pdf') return await extractPdfText(filePath);
    else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext === '.txt') return fs.readFileSync(filePath, 'utf-8');
    else if (ext === '.pptx') return await extractPptxText(filePath);
    else {
      console.warn(`Unsupported file type: ${ext}. Skipping.`);
      return '';
    }
  } catch (err: any) {
    console.error(`Failed to extract text from ${filePath}:`, err?.message || err);
    return '';
  }
}

// Clean & chunk text
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// Generate embedding using Gemini
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  if (!text.trim()) return [];

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`,
      {
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
      },
      {
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.embedding?.values) {
      return response.data.embedding.values;
    } else {
      throw new Error('Unexpected Gemini API response');
    }
  } catch (err: any) {
    throw new Error(`Embedding generation failed: ${err?.response?.status || err.message}`);
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ensure AI tables exist
async function ensureTablesExist() {
  const dbPool = getPool();
  
  // Check if pgvector extension exists
  try {
    await dbPool.query('CREATE EXTENSION IF NOT EXISTS vector');
  } catch (err) {
    console.warn('pgvector extension may already exist or not be available');
  }
  
  // Create lesson_vectors table if not exists
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS lesson_vectors (
      id SERIAL PRIMARY KEY,
      lessonid TEXT NOT NULL,
      chunktxt TEXT NOT NULL,
      vector vector(768),
      createdat TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create processed_files table if not exists
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS processed_files (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      file_hash TEXT NOT NULL,
      processed_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create index for vector similarity search
  try {
    await dbPool.query(`
      CREATE INDEX IF NOT EXISTS lesson_vectors_vector_idx 
      ON lesson_vectors USING ivfflat (vector vector_cosine_ops)
    `);
  } catch (err) {
    // Index creation may fail if not enough rows, that's OK
    console.warn('Vector index creation skipped (may need more data)');
  }
}

// Process a single lesson file
export async function processLessonFile(filePath: string, lessonId: string): Promise<{
  success: boolean;
  message: string;
  chunksProcessed?: number;
}> {
  const dbPool = getPool();
  
  if (!process.env.GEMINI_API_KEY) {
    return {
      success: false,
      message: 'GEMINI_API_KEY not configured. Add it to Render environment variables.'
    };
  }
  
  try {
    await ensureTablesExist();
    
    const currentHash = getFileHash(filePath);

    // Check if file already processed
    const res = await dbPool.query(
      'SELECT file_hash FROM processed_files WHERE filename = $1',
      [lessonId]
    );
    const dbHash = res.rows[0]?.file_hash;

    if (dbHash === currentHash) {
      return {
        success: true,
        message: `Lesson "${lessonId}" already processed (unchanged)`,
        chunksProcessed: 0
      };
    }

    if (dbHash && dbHash !== currentHash) {
      console.log(`[UPDATE] ${lessonId} changed. Re-indexing...`);
      await dbPool.query('DELETE FROM lesson_vectors WHERE lessonid = $1', [lessonId]);
    } else {
      console.log(`[NEW] Processing ${lessonId}`);
    }

    let text = await extractText(filePath);
    text = cleanText(text);
    
    if (!text) {
      return {
        success: false,
        message: `No text could be extracted from ${path.basename(filePath)}`
      };
    }

    const chunks = chunkText(text);
    console.log(`Extracted ${chunks.length} chunks from ${lessonId}`);

    let successfulChunks = 0;
    for (const chunk of chunks) {
      try {
        const vector = await generateEmbedding(chunk);
        if (!vector.length) continue;

        await dbPool.query(
          `INSERT INTO lesson_vectors (lessonid, chunktxt, vector, createdat) VALUES ($1, $2, $3, NOW())`,
          [lessonId, chunk, JSON.stringify(vector)]
        );

        successfulChunks++;
        await delay(DELAY_BETWEEN_EMBEDS * 1000);
      } catch (chunkErr) {
        console.error(`Embedding/DB insert error for chunk:`, chunkErr);
      }
    }

    // Mark as processed
    await dbPool.query(
      `INSERT INTO processed_files (filename, file_hash, processed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (filename) DO UPDATE SET file_hash = $2, processed_at = NOW()`,
      [lessonId, currentHash]
    );

    return {
      success: true,
      message: `Successfully processed "${lessonId}"`,
      chunksProcessed: successfulChunks
    };
  } catch (err: any) {
    console.error(`Failed to process lesson ${lessonId}:`, err);
    return {
      success: false,
      message: `Failed to process lesson: ${err.message}`
    };
  }
}

// Process all lessons in a folder
export async function processAllLessons(lessonsFolder: string): Promise<{
  total: number;
  processed: number;
  failed: number;
  results: Array<{ lessonId: string; success: boolean; message: string }>;
}> {
  const results: Array<{ lessonId: string; success: boolean; message: string }> = [];
  let processed = 0;
  let failed = 0;
  
  if (!fs.existsSync(lessonsFolder)) {
    return { total: 0, processed: 0, failed: 0, results: [] };
  }
  
  const files = fs.readdirSync(lessonsFolder);
  const supportedFiles = files.filter(f => 
    ['.pdf', '.docx', '.txt', '.pptx'].includes(path.extname(f).toLowerCase())
  );
  
  for (const file of supportedFiles) {
    const fullPath = path.join(lessonsFolder, file);
    const lessonId = path.parse(file).name;
    
    const result = await processLessonFile(fullPath, lessonId);
    results.push({ lessonId, ...result });
    
    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }
  
  return {
    total: supportedFiles.length,
    processed,
    failed,
    results
  };
}

// Check if AI database is properly configured and reachable
export async function checkAiDatabaseConnection(): Promise<{
  connected: boolean;
  hasVectors: boolean;
  vectorCount: number;
  message: string;
}> {
  try {
    const dbPool = getPool();
    
    // Test connection
    await dbPool.query('SELECT 1');
    
    // Check if lesson_vectors table exists and has data
    try {
      const result = await dbPool.query('SELECT COUNT(*) as count FROM lesson_vectors');
      const count = parseInt(result.rows[0].count);
      
      return {
        connected: true,
        hasVectors: count > 0,
        vectorCount: count,
        message: count > 0 
          ? `Connected. ${count} lesson chunks indexed.`
          : 'Connected but no lessons indexed yet.'
      };
    } catch {
      return {
        connected: true,
        hasVectors: false,
        vectorCount: 0,
        message: 'Connected but lesson_vectors table not found. Run digestion first.'
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      hasVectors: false,
      vectorCount: 0,
      message: `Database connection failed: ${err.message}`
    };
  }
}
