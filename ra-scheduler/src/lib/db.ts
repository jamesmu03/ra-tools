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
    await sql`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        locked INTEGER DEFAULT 0,
        UNIQUE(date, type, user_id) -- Modified unique constraint to allow multiple teams potentially, but for now keeping simple
      );
    `;
    // Note: The original UNIQUE(date, type) assumes only one schedule per day. 
    // For multi-tenancy, we need to filter by user's team, so the constraint should probably include team or we just rely on app logic.
    // Actually, if we want multiple quads, 'date' and 'type' are not unique globally anymore.
    // They are unique PER QUAD.
    // Since we don't have a 'quads' table yet, we rely on 'user_id' to infer quad.
    // But 'schedule' entries might not have a user_id if we have open slots? 
    // The current logic inserts assigned slots.
    // If we want to enforce uniqueness per quad, we need a way to know the quad of the schedule slot.
    // We should add 'team_name' to the schedule table to make it explicit and queryable without joining.

    // Let's add team_name to schedule and events for easier multi-tenancy.

    // We need to alter the table if it exists, or just create it with the new column.
    // Since we are migrating to a fresh DB, we can define it correctly now.

    await sql`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        locked INTEGER DEFAULT 0,
        team_name TEXT NOT NULL -- Added for multi-tenancy
      );
    `;
    // We should probably remove the unique constraint or make it (date, type, team_name).
    // Let's make it (date, type, team_name).
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_unique ON schedule (date, type, team_name);
    `;


    // Events Table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        name TEXT NOT NULL,
        team_name TEXT NOT NULL -- Added for multi-tenancy
      );
    `;
    // Unique date per team
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique ON events (date, team_name);
    `;

    console.log('Schema initialized successfully');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
}

export default sql;
