import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/fitcoach";
const client = postgres(connectionString, { ssl: connectionString.includes('neon') ? 'require' : false });

export const db = drizzle(client, { schema });
