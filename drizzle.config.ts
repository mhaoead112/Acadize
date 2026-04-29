// Path: drizzle.config.ts
import { config } from 'dotenv';
config({ path: './server/.env' });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: "./server/src/db/schema.ts",
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});