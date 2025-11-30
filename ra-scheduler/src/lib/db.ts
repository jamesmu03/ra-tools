import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'ra-scheduler.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    netid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT, -- Added for Phase 2
    handicap INTEGER DEFAULT 0, -- Added for Phase 4
    role TEXT DEFAULT 'user' -- 'admin' or 'user'
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    status INTEGER NOT NULL, -- 0: Available, 1: Prefer Not, 2: Strongly Prefer Not, 3: Excused
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- YYYY-MM-DD
    type TEXT NOT NULL, -- 'weekday', 'weekend_pri', 'weekend_sec'
    user_id INTEGER,
    locked INTEGER DEFAULT 0, -- Added for Phase 5: 0=false, 1=true
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(date, type)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL, -- YYYY-MM-DD
    name TEXT NOT NULL
  );
`);

export default db;
