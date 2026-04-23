import fs from 'fs';
import path from 'path';
import { pool } from '../server/src/db/index.js';

async function main() {
    const sqlPath = path.join(process.cwd(), 'migrations', '0019_enable_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Running RLS migration...');
        await pool.query(sql);
        console.log('Migration successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

main();
