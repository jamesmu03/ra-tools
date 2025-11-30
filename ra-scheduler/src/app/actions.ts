'use server'

import { cookies } from 'next/headers';
import db from '@/lib/db';

export async function getPreferences() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) return [];

    const user = db.prepare('SELECT id FROM users WHERE netid = ?').get(netid) as any;
    if (!user) return [];

    const prefs = db.prepare('SELECT date, status FROM preferences WHERE user_id = ?').all(user.id) as any[];
    return prefs;
}

export async function savePreference(date: string, status: number) {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) throw new Error('Not authenticated');

    const user = db.prepare('SELECT id FROM users WHERE netid = ?').get(netid) as any;
    if (!user) throw new Error('User not found');

    if (status === 0) {
        // Remove preference if "Available" (default)
        db.prepare('DELETE FROM preferences WHERE user_id = ? AND date = ?').run(user.id, date);
    } else {
        // Upsert preference
        db.prepare(`
        INSERT INTO preferences (user_id, date, status) 
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status
      `).run(user.id, date, status);
    }
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;
    if (!netid) return null;
    return db.prepare('SELECT * FROM users WHERE netid = ?').get(netid) as any;
}
