import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve('server/.env') });

import { db } from './server/src/db/index.js';
import { conversations, messages, conversationParticipants } from './server/src/db/schema.js';
import { desc } from 'drizzle-orm';

async function checkMessages() {
    try {
        const convs = await db.select().from(conversations).limit(10);
        console.log('--- Conversations ---');
        console.table(convs);

        const msgs = await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(10);
        console.log('--- Latest Messages ---');
        console.table(msgs);

        const participants = await db.select().from(conversationParticipants).limit(10);
        console.log('--- Participants ---');
        console.table(participants);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkMessages();
