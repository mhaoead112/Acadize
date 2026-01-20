// Quick script to check exam questions
const { Client } = require('pg');
require('dotenv').config({ path: 'server/.env' });

async function checkExamQuestions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if exam exists
    const examResult = await client.query(
      'SELECT id, title FROM exams WHERE id = $1',
      ['exam_mock_001']
    );
    console.log('\nExam:', examResult.rows[0] || 'Not found');

    // Count questions
    const countResult = await client.query(
      'SELECT COUNT(*) FROM exam_questions WHERE exam_id = $1',
      ['exam_mock_001']
    );
    console.log('Questions count:', countResult.rows[0].count);

    // Get question details
    const questionsResult = await client.query(
      'SELECT id, question_text, question_type, points FROM exam_questions WHERE exam_id = $1 ORDER BY "order" LIMIT 5',
      ['exam_mock_001']
    );
    console.log('\nFirst 5 questions:');
    questionsResult.rows.forEach((q, i) => {
      console.log(`${i + 1}. ${q.question_text.substring(0, 50)}... (${q.question_type}, ${q.points} pts)`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkExamQuestions();
