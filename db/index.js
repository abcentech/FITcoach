import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Create the SQLite database file in the root of the project
const dbPath = path.join(process.cwd(), 'sqlite.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
