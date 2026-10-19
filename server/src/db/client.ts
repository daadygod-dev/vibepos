import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Max 5 connections — Render Starter PostgreSQL limit
const client = postgres(process.env.DATABASE_URL, { max: 5 });
export const db = drizzle(client, { schema });
