// index_builder.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Pool } from "pg";
import mammoth from "mammoth";
import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config({ path: '.env.ai' });

// --------------------------- CONFIG ---------------------------
const LESSON_FOLDER = process.env.LESSON_FOLDER || "lessons";
const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-004";
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || "1000");
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || "200");
const DELAY_BETWEEN_EMBEDS = parseFloat(process.env.DELAY_BETWEEN_EMBEDS || "0.2");

// PostgreSQL Pool for Neon DB
const pool = new Pool({
  host: process.env.AI_DB_HOST,
  port: parseInt(process.env.AI_DB_PORT || "5432"),
  user: process.env.AI_DB_USER,
  password: process.env.AI_DB_PASSWORD,
  database: process.env.AI_DB_NAME,
  ssl: process.env.AI_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ------------------------- HELPERS ----------------------------

// 1. File hash for incremental updates
function getFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("md5");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
}

// ------------------------- PDF EXTRACTOR FIX (guaranteed) -----------------
async function extractPdfText(filePath: string): Promise<string> {
  try {
    // Use require (CommonJS) to avoid ESM issues
    const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text: string }>;
    const data = fs.readFileSync(filePath);
    const pdf = await pdfParse(data);
    return pdf.text;
  } catch (err: any) {
    console.error(`PDF extraction failed for ${filePath}:`, err?.message || err);
    return "";
  }
}

// 3. PPTX extractor
async function extractPptxText(filePath: string): Promise<string> {
  try {
    const zip = new AdmZip(filePath);
    const slides: string[] = [];
    const slideFiles = zip.getEntries().filter(
      (entry) => entry.entryName.startsWith("ppt/slides/slide") && entry.entryName.endsWith(".xml")
    );

    for (const slideFile of slideFiles) {
      const xml = slideFile.getData().toString("utf8");
      const parsed = await parseStringPromise(xml);
      const texts: string[] = [];
      const shapes = parsed?.["p:sld"]?.["p:cSld"]?.[0]?.["p:spTree"]?.[0]?.["p:sp"] || [];

      shapes.forEach((shape: any) => {
        const tNodes = shape["p:txBody"]?.[0]?.["a:p"] || [];
        tNodes.forEach((pNode: any) => {
          if (pNode["a:r"]) {
            pNode["a:r"].forEach((r: any) => {
              if (r["a:t"] && r["a:t"][0]) texts.push(r["a:t"][0]);
            });
          } else if (pNode["a:t"]) {
            texts.push(pNode["a:t"][0]);
          }
        });
      });

      slides.push(texts.join(" "));
    }
    return slides.join("\n");
  } catch (err: any) {
    console.warn("pptx extraction failed (returning empty):", err?.message || err);
    return "";
  }
}

// 4. Main extractor
async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === ".pdf") return await extractPdfText(filePath);
    else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext === ".txt") return fs.readFileSync(filePath, "utf-8");
    else if (ext === ".pptx") return await extractPptxText(filePath);
    else {
      console.warn(`Unsupported file type: ${ext}. Skipping.`);
      return "";
    }
  } catch (err: any) {
    console.error(`Failed to extract text from ${filePath}:`, err?.message || err);
    return "";
  }
}

// 5. Clean & chunk text
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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

// 6. Gemini embedding
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!text.trim()) return [];

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`,
      {
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
      },
      {
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    // Check Gemini response shape
    if (response.data?.embedding?.values) return response.data.embedding.values;
    else throw new Error("Unexpected Gemini API response: " + JSON.stringify(response.data));
  } catch (err: any) {
    throw new Error(`Embedding generation failed: ${err?.response?.status || err.message}`);
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----------------------- PROCESS LESSON -----------------------
export async function processLesson(filePath: string, lessonId: string) {
  try {
    const currentHash = getFileHash(filePath);

    // Check if file already processed
    const res = await pool.query(
      "SELECT file_hash FROM processed_files WHERE filename = $1",
      [lessonId]
    );
    const dbHash = res.rows[0]?.file_hash;

    if (dbHash === currentHash) {
      console.log(`[SKIP] ${path.basename(filePath)} (Unchanged)`);
      return;
    }

    if (dbHash && dbHash !== currentHash) {
      console.log(`[UPDATE] ${path.basename(filePath)} changed. Re-indexing...`);
      await pool.query("DELETE FROM lesson_vectors WHERE lessonid = $1", [lessonId]);
    } else {
      console.log(`[NEW] Processing ${path.basename(filePath)}`);
    }

    let text = await extractText(filePath);
    text = cleanText(text);
    if (!text) return console.warn(`No text extracted from ${filePath}. Skipping.`);

    const chunks = chunkText(text);
    console.log(`Extracted ${chunks.length} chunks from ${path.basename(filePath)}`);

    for (const chunk of chunks) {
      try {
        const vector = await generateEmbedding(chunk);
        if (!vector.length) continue;

        await pool.query(
          `INSERT INTO lesson_vectors (lessonid, chunktxt, vector, createdat) VALUES ($1, $2, $3, NOW())`,
          [lessonId, chunk, JSON.stringify(vector)]
        );

        await delay(DELAY_BETWEEN_EMBEDS * 1000);
      } catch (chunkErr) {
        console.error(`Embedding/DB insert error for chunk: ${chunkErr}`);
      }
    }

    // Mark as processed
    await pool.query(
      `INSERT INTO processed_files (filename, file_hash, processed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (filename) DO UPDATE SET file_hash = $2, processed_at = NOW()`,
      [lessonId, currentHash]
    );

    console.log(`Finished processing ${filePath}`);
  } catch (err) {
    console.error(`Failed to process file: ${filePath}`, err);
  }
}

// ---------------------- RUN PIPELINE --------------------------
async function run() {
  try {
    const files = fs.readdirSync(LESSON_FOLDER);
    for (const file of files) {
      const fullPath = path.join(LESSON_FOLDER, file);
      const lessonId = path.parse(file).name;
      await processLesson(fullPath, lessonId);
    }
  } catch (err) {
    console.error("Error reading lessons folder:", err);
  } finally {
    await pool.end();
  }
}

run();
