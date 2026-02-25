-- Enable pgvector extension (required for vector similarity search)
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to track file processing status
CREATE TABLE IF NOT EXISTS processed_files (
    filename TEXT PRIMARY KEY,
    file_hash TEXT NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Table for lesson vectors (768 dimensions for Gemini embeddings)
CREATE TABLE IF NOT EXISTS lesson_vectors (
    id SERIAL PRIMARY KEY,
    lessonid TEXT NOT NULL,
    chunktxt TEXT NOT NULL,
    vector vector(768),
    createdat TIMESTAMP DEFAULT NOW()
);

-- Create index for fast vector similarity search
CREATE INDEX IF NOT EXISTS lesson_vectors_vector_idx 
ON lesson_vectors USING hnsw (vector vector_cosine_ops);

-- Grant permissions (adjust username as needed)
GRANT ALL PRIVILEGES ON TABLE processed_files TO postgres;
GRANT ALL PRIVILEGES ON TABLE lesson_vectors TO postgres;
GRANT ALL PRIVILEGES ON SEQUENCE lesson_vectors_id_seq TO postgres;
