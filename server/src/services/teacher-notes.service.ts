import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createId } from '@paralleldrive/cuid2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const NOTES_FILE = path.join(DATA_DIR, 'teacher-notes.json');

export interface TeacherNoteRecord {
  id: string;
  studentId: string;
  teacherId: string;
  content: string;
  createdAt: string; // ISO string
}

interface NotesDB {
  notes: TeacherNoteRecord[];
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(NOTES_FILE);
  } catch {
    const initial: NotesDB = { notes: [] };
    await fs.writeFile(NOTES_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

async function readDB(): Promise<NotesDB> {
  await ensureDataFile();
  const raw = await fs.readFile(NOTES_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.notes)) return parsed as NotesDB;
    return { notes: [] };
  } catch {
    return { notes: [] };
  }
}

async function writeDB(db: NotesDB): Promise<void> {
  await fs.writeFile(NOTES_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export async function addTeacherNote(studentId: string, teacherId: string, content: string): Promise<{ id: string }>
{
  const db = await readDB();
  const record: TeacherNoteRecord = {
    id: createId(),
    studentId,
    teacherId,
    content,
    createdAt: new Date().toISOString(),
  };
  db.notes.unshift(record);
  await writeDB(db);
  return { id: record.id };
}

export async function getNotesForStudent(studentId: string): Promise<Array<{ id: string; content: string; date: string }>> {
  const db = await readDB();
  const items = db.notes.filter(n => n.studentId === studentId);
  // Map to UI-friendly shape: date in short display format
  return items.map(n => ({ id: n.id, content: n.content, date: new Date(n.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }));
}
