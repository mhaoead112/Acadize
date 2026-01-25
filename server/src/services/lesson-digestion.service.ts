// server/src/services/lesson-digestion.service.ts
// Service to process lesson files and generate embeddings for AI retrieval

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { Pool } from 'pg';
import mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import OpenAI from 'openai';
import axios from 'axios';

// Configuration
const AI_API_KEY = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
const EMBED_MODEL = process.env.EMBED_MODEL || 'qwen/qwen3-embedding-8b'; // HackClub proxy embedding model
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1000');
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '200');
const DELAY_BETWEEN_EMBEDS = parseFloat(process.env.DELAY_BETWEEN_EMBEDS || '0.2');

// Initialize OpenAI client for HackClub Proxy
const openai = new OpenAI({
  apiKey: AI_API_KEY || 'dummy_key',
  baseURL: 'https://ai.hackclub.com/proxy/v1',
});

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

// Get main database configuration (for lessons table)
const getMainDbConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }
  return getAiDbConfig();
};

// Lazy pool creation
let aiPool: Pool | null = null;
let mainPool: Pool | null = null;

const getAiPool = () => {
  if (!aiPool) {
    aiPool = new Pool(getAiDbConfig());
  }
  return aiPool;
};

const getMainPool = () => {
  if (!mainPool) {
    mainPool = new Pool(getMainDbConfig());
  }
  return mainPool;
};

// Backward compatibility
const getPool = getAiPool;

// Helper: Download file from cloud URL to temp directory
async function downloadCloudFile(url: string, fileName: string): Promise<string | null> {
  try {
    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `lesson-${Date.now()}-${fileName}`);

    let downloadUrl = url;

    // If it's a Cloudinary URL and we have credentials, generate an authenticated URL
    if (url.includes('cloudinary.com') && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        // Import Cloudinary SDK
        const { v2: cloudinary } = await import('cloudinary');

        // Configure Cloudinary
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        });

        // Extract public_id from URL
        // URL format: https://res.cloudinary.com/cloud_name/resource_type/upload/version/public_id.ext
        const urlMatch = url.match(/\/upload\/(?:v\\d+\/)?(.*)/);
        if (urlMatch) {
          // For raw resources, the public_id INCLUDES the extension
          const publicId = urlMatch[1];

          // Generate a signed URL with a short expiration (1 hour)
          const signedUrl = cloudinary.url(publicId, {
            resource_type: 'raw',
            type: 'upload',
            sign_url: true,
            secure: true,
          });

          downloadUrl = signedUrl;
          console.log(`  🔐 Using Cloudinary signed URL`);
        }
      } catch (cloudinaryError: any) {
        console.log(`  ⚠️ Cloudinary SDK error, falling back to direct download:`, cloudinaryError.message);
      }
    }

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'arraybuffer',
      timeout: 60000, // 60 second timeout for large files
    });

    fs.writeFileSync(tempPath, Buffer.from(response.data));
    console.log(`  ⬇️ Downloaded ${fileName} to temp: ${tempPath}`);
    return tempPath;
  } catch (err: any) {
    console.error(`  ❌ Failed to download ${url}:`, err.message);
    return null;
  }
}

// Helper: Clean up temp file
function cleanupTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Helper: File hash for incremental updates
function getFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Helper: URL hash for cloud files
function getUrlHash(url: string): string {
  const hashSum = crypto.createHash('md5');
  hashSum.update(url);
  return hashSum.digest('hex');
}

// PDF text extraction
async function extractPdfText(filePath: string): Promise<string> {
  try {
    // pdf-parse v2 uses PDFParse class with LoadParameters
    const { PDFParse } = await import('pdf-parse');
    const data = fs.readFileSync(filePath);
    const pdfParse = new PDFParse({ data });

    const result = await pdfParse.getText();
    return result.text || '';
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

// Decode base64 embedding to float array
function decodeBase64Embedding(base64String: string): number[] {
  // Remove "base64:" prefix if present
  const cleanBase64 = base64String.startsWith('base64:')
    ? base64String.slice(7)
    : base64String;

  const buffer = Buffer.from(cleanBase64, 'base64');
  const floatArray: number[] = [];

  // Each float32 is 4 bytes
  for (let i = 0; i < buffer.length; i += 4) {
    floatArray.push(buffer.readFloatLE(i));
  }

  return floatArray;
}

// Generate embedding using OpenAI Compatible Endpoint (HackClub Proxy)
async function generateEmbedding(text: string): Promise<number[]> {
  if (!AI_API_KEY) {
    throw new Error('AI_API_KEY not configured');
  }

  if (!text.trim()) return [];

  try {
    let response: any = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: text,
    });

    // HackClub proxy sometimes returns response as a JSON string instead of parsed object
    if (typeof response === 'string') {
      response = JSON.parse(response.trim());
    }

    const embedding = response.data[0].embedding;

    // Handle base64-encoded embeddings from HackClub proxy
    if (typeof embedding === 'string') {
      return decodeBase64Embedding(embedding);
    }

    // If it's already an array, return as-is
    if (Array.isArray(embedding)) {
      return embedding;
    }

    throw new Error('Unexpected embedding format');
  } catch (err: any) {
    throw new Error(`Embedding generation failed: ${err.message}`);
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ensure AI tables exist
async function ensureTablesExist() {
  const dbPool = getAiPool();

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
      vector vector(4096),
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

// Process a single lesson file (local path)
export async function processLessonFile(filePath: string, lessonId: string): Promise<{
  success: boolean;
  message: string;
  chunksProcessed?: number;
}> {
  const dbPool = getAiPool();

  if (!AI_API_KEY) {
    return {
      success: false,
      message: 'AI_API_KEY not configured. Add it to environment variables.'
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

// Process a single lesson from cloud URL
export async function processCloudLesson(
  cloudUrl: string,
  lessonId: string,
  fileName: string
): Promise<{
  success: boolean;
  message: string;
  chunksProcessed?: number;
}> {
  const dbPool = getAiPool();

  if (!AI_API_KEY) {
    return {
      success: false,
      message: 'AI_API_KEY not configured.'
    };
  }

  try {
    await ensureTablesExist();

    // Use URL hash as file hash for cloud files
    const currentHash = getUrlHash(cloudUrl);

    // Check if already processed
    const res = await dbPool.query(
      'SELECT file_hash FROM processed_files WHERE filename = $1',
      [lessonId]
    );
    const dbHash = res.rows[0]?.file_hash;

    if (dbHash === currentHash) {
      return {
        success: true,
        message: `Lesson "${lessonId}" already indexed (unchanged)`,
        chunksProcessed: 0
      };
    }

    console.log(`📥 Processing cloud lesson: ${lessonId}`);

    // Download file to temp
    const tempPath = await downloadCloudFile(cloudUrl, fileName);
    if (!tempPath) {
      return {
        success: false,
        message: `Failed to download lesson from cloud: ${fileName}`
      };
    }

    try {
      // Re-index if hash changed
      if (dbHash && dbHash !== currentHash) {
        console.log(`  [UPDATE] ${lessonId} changed. Re-indexing...`);
        await dbPool.query('DELETE FROM lesson_vectors WHERE lessonid = $1', [lessonId]);
      }

      // Extract text
      let text = await extractText(tempPath);
      text = cleanText(text);

      if (!text) {
        return {
          success: false,
          message: `No text could be extracted from ${fileName}`
        };
      }

      const chunks = chunkText(text);
      console.log(`  📄 Extracted ${chunks.length} chunks from ${lessonId}`);

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
        } catch (chunkErr: any) {
          console.error(`  ⚠️ Embedding error:`, chunkErr.message);
        }
      }

      // Mark as processed
      await dbPool.query(
        `INSERT INTO processed_files (filename, file_hash, processed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (filename) DO UPDATE SET file_hash = $2, processed_at = NOW()`,
        [lessonId, currentHash]
      );

      console.log(`  ✅ Indexed ${successfulChunks} chunks for ${lessonId}`);

      return {
        success: true,
        message: `Successfully indexed "${lessonId}"`,
        chunksProcessed: successfulChunks
      };
    } finally {
      // Clean up temp file
      cleanupTempFile(tempPath);
    }
  } catch (err: any) {
    console.error(`Failed to process cloud lesson ${lessonId}:`, err);
    return {
      success: false,
      message: `Failed to process lesson: ${err.message}`
    };
  }
}

// Process all lessons from database (Cloudinary URLs)
export async function processAllCloudLessons(): Promise<{
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  results: Array<{ lessonId: string; success: boolean; message: string }>;
}> {
  const results: Array<{ lessonId: string; success: boolean; message: string }> = [];
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  if (!AI_API_KEY) {
    console.warn('⚠️ AI_API_KEY not configured. Skipping lesson digestion.');
    return { total: 0, processed: 0, skipped: 0, failed: 0, results: [] };
  }

  console.log('🔍 Fetching lessons from database...');

  try {
    const mainDb = getMainPool();

    // Fetch all lessons from main database (use snake_case column names)
    const lessonsResult = await mainDb.query(`
      SELECT id, course_id, title, file_name, file_path, file_type
      FROM lessons
      WHERE file_path IS NOT NULL
    `);

    const lessons = lessonsResult.rows;
    console.log(`📚 Found ${lessons.length} lessons in database`);

    for (const lesson of lessons) {
      const lessonId = `${lesson.course_id}-${lesson.id}`;

      // Check if it's a cloud URL
      if (!lesson.file_path.startsWith('http://') && !lesson.file_path.startsWith('https://')) {
        console.log(`  ⏭️ Skipping local file: ${lessonId}`);
        skipped++;
        continue;
      }

      const result = await processCloudLesson(
        lesson.file_path,
        lessonId,
        lesson.file_name || `lesson-${lesson.id}`
      );

      results.push({ lessonId, ...result });

      if (result.chunksProcessed === 0 && result.success) {
        skipped++; // Already processed
      } else if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    console.log(`\n📊 Digestion Summary:`);
    console.log(`   Total: ${lessons.length}`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped (already indexed): ${skipped}`);
    console.log(`   Failed: ${failed}`);

    return {
      total: lessons.length,
      processed,
      skipped,
      failed,
      results
    };
  } catch (err: any) {
    console.error('❌ Error fetching lessons from database:', err.message);
    return { total: 0, processed: 0, skipped: 0, failed: 0, results: [] };
  }
}

// Process all lessons in a local folder (legacy support)
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
    const dbPool = getAiPool();

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

// Initialize lesson digestion on server startup
export async function initLessonDigestion(): Promise<void> {
  console.log('\n🚀 Initializing AI Lesson Digestion Service...');

  // Check AI database connection
  const dbStatus = await checkAiDatabaseConnection();
  console.log(`📊 AI Database: ${dbStatus.message}`);

  if (!dbStatus.connected) {
    console.warn('⚠️ AI Database not connected. Lesson digestion disabled.');
    return;
  }

  // Run digestion in background
  console.log('🔄 Starting background lesson digestion...');
  processAllCloudLessons()
    .then(result => {
      if (result.processed > 0 || result.failed > 0) {
        console.log(`✅ Background digestion complete: ${result.processed} processed, ${result.failed} failed`);
      }
    })
    .catch(err => {
      console.error('❌ Background digestion error:', err.message);
    });
}

