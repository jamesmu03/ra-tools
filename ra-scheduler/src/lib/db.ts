import { sql } from '@vercel/postgres';

// Helper to initialize the database schema
// This should be called once, e.g., via a script or a special API route
export async function initSchema() {
  try {
    // Users Table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        netid TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        handicap INTEGER DEFAULT 0,
        role TEXT DEFAULT 'user',
        team_name TEXT,
        onboarding_completed INTEGER DEFAULT 0
      );
    `;

    // Preferences Table
    await sql`
      CREATE TABLE IF NOT EXISTS preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date TEXT NOT NULL,
        status INTEGER NOT NULL,
        UNIQUE(user_id, date)
      );
    `;

    // Schedule Table
    // Schedule Table
    await sql`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        locked INTEGER DEFAULT 0,
        team_name TEXT NOT NULL
      );
    `;
    // We should probably remove the unique constraint or make it (date, type, team_name).
    // Let's make it (date, type, team_name).
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_unique ON schedule(date, type, team_name);
    `;


    // Events Table
    await sql`
      CREATE TABLE IF NOT EXISTS events(
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      team_name TEXT NOT NULL-- Added for multi - tenancy
      );
    `;
    // Unique date per team
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique ON events(date, team_name);
    `;

    console.log('Schema initialized successfully');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
}

export default sql;
