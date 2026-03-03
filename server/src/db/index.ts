import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgres://tc:tc@localhost:5432/threatcaddy';

const sql = postgres(connectionString, { max: 20 });
export const db = drizzle(sql, { schema });

export { schema, sql };
export type DB = typeof db;
