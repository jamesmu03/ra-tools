'use server'

import { cookies } from 'next/headers';
import db from '@/lib/db';
import { generateSchedule } from '@/lib/scheduler';
import { redirect } from 'next/navigation';

async function checkAdmin() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;
    if (!netid) redirect('/login');

    const user = db.prepare('SELECT role FROM users WHERE netid = ?').get(netid) as any;
    if (user?.role !== 'admin') {
        redirect('/');
    }
}

export async function triggerScheduleGeneration() {
    // await checkAdmin();
    generateSchedule();
}

export async function getScheduleData() {
    const schedule = db.prepare(`
    SELECT s.date, s.type, s.locked, u.name, u.netid, u.email, s.user_id
    FROM schedule s 
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.date ASC
  `).all();
    return schedule;
}

export async function assignShift(date: string, type: string, userId: number, locked: boolean) {
    // await checkAdmin();
    // Upsert: Insert or Replace
    // We need to handle the unique constraint.
    // If we are "clearing" a shift (userId = null?), we might delete it?
    // Or just update.

    // If userId is -1, it means "Unassigned" (delete?)
    // But we might want to keep the slot "locked empty"? 
    // For now, let's assume we always assign to a user.

    // Check if shift exists
    const existing = db.prepare('SELECT id FROM schedule WHERE date = ? AND type = ?').get(date, type);

    if (existing) {
        db.prepare('UPDATE schedule SET user_id = ?, locked = ? WHERE date = ? AND type = ?').run(userId, locked ? 1 : 0, date, type);
    } else {
        db.prepare('INSERT INTO schedule (date, type, user_id, locked) VALUES (?, ?, ?, ?)').run(date, type, userId, locked ? 1 : 0);
    }
}

export async function getShiftCounts() {
    const counts = db.prepare(`
        SELECT 
            u.id,
            SUM(CASE WHEN s.type = 'weekday' THEN 1 ELSE 0 END) as weekday,
            SUM(CASE WHEN s.type = 'weekend_pri' THEN 1 ELSE 0 END) as weekendPri,
            SUM(CASE WHEN s.type = 'weekend_sec' THEN 1 ELSE 0 END) as weekendSec
        FROM users u
        LEFT JOIN schedule s ON u.id = s.user_id
        GROUP BY u.id
    `).all();
    return counts;
}

export async function getAllUsers() {
    return db.prepare('SELECT * FROM users').all();
}

export async function inviteRAs(emailList: string) {
    // await checkAdmin();
    const emails = emailList.split(/[\n,]+/).map(e => e.trim()).filter(e => e);

    const stmt = db.prepare('INSERT INTO users (netid, name, email) VALUES (?, ?, ?) ON CONFLICT(netid) DO NOTHING');

    let count = 0;
    for (const email of emails) {
        // Extract netid from email (assuming netid@duke.edu)
        const match = email.match(/^(.+)@duke\.edu$/);
        if (match) {
            const netid = match[1];
            const name = netid; // Default name to netid until they log in
            stmt.run(netid, name, email);
            count++;
            console.log(`[Mock Email] Sending invite to ${email}...`);
        }
    }
    return count;
}

export async function updateHandicap(userId: number, handicap: number) {
    // await checkAdmin();
    db.prepare('UPDATE users SET handicap = ? WHERE id = ?').run(handicap, userId);
}

export async function getEvents() {
    return db.prepare('SELECT * FROM events ORDER BY date ASC').all();
}

export async function addEvent(date: string, name: string) {
    // await checkAdmin();
    db.prepare('INSERT INTO events (date, name) VALUES (?, ?)').run(date, name);
}

export async function removeEvent(id: number) {
    // await checkAdmin();
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
}

export async function downloadScheduleCSV() {
    const schedule = db.prepare(`
        SELECT s.date, s.type, u.name, u.netid, u.email
        FROM schedule s 
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.date ASC
    `).all() as any[];

    const header = "Team Member,Shift Start Date,Shift Start Time,Shift End Date,Shift End Time,Theme,Shift Note";
    const rows = schedule.map(row => {
        const startDate = row.date;
        const d = new Date(startDate);
        d.setDate(d.getDate() + 1);
        const endDate = d.toISOString().split('T')[0];

        const startTime = "21:00";
        const endTime = "09:00";

        const theme = row.type === 'weekday' ? 'Blue' : (row.type === 'weekend_pri' ? 'Purple' : 'Pink');
        const note = row.type === 'weekday' ? 'Weekday On-Call' : (row.type === 'weekend_pri' ? 'Weekend Primary' : 'Weekend Secondary');

        // Use email if available, else construct from netid
        const member = row.email || `${row.netid}@duke.edu`;

        return `${member},${startDate},${startTime},${endDate},${endTime},${theme},${note}`;
    });

    return [header, ...rows].join('\n');
}
