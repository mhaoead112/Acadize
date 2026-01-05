-- Table to track file processing status
CREATE TABLE IF NOT EXISTS processed_files (
    filename TEXT PRIMARY KEY,
    file_hash TEXT NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- 1. Delete the old table with the wrong dimensions
DROP TABLE IF EXISTS lesson_vectors;

-- 2. Recreate the table with 768 dimensions (Standard for Gemini)
CREATE TABLE lesson_vectors (
    id SERIAL PRIMARY KEY,
    lessonid TEXT NOT NULL,
    chunktxt TEXT NOT NULL,
    vector vector(768),            -- CHANGED from 1536 to 768
    createdat TIMESTAMP DEFAULT NOW()
);

-- 3. Recreate the index
CREATE INDEX ON lesson_vectors USING hnsw (vector vector_cosine_ops);
