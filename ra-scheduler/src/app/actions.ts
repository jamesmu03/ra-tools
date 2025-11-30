'use server'

import { cookies } from 'next/headers';
import db from '@/lib/db';
import { eachDayOfInterval, getDay } from 'date-fns';

export async function getPreferences() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) return {};

    const user = db.prepare('SELECT id FROM users WHERE netid = ?').get(netid) as any;
    if (!user) return {};

    const prefs = db.prepare('SELECT date, status FROM preferences WHERE user_id = ?').all(user.id) as any[];

    const prefMap: Record<string, number> = {};
    prefs.forEach(p => {
        prefMap[p.date] = p.status;
    });

    return prefMap;
}

export async function getEvents() {
    return db.prepare('SELECT date, name FROM events').all() as { date: string, name: string }[];
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

export async function resetPreferences() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) throw new Error('Not authenticated');

    const user = db.prepare('SELECT id FROM users WHERE netid = ?').get(netid) as any;
    if (!user) throw new Error('User not found');

    db.prepare('DELETE FROM preferences WHERE user_id = ?').run(user.id);
}

export async function getShiftStats() {
    const startDate = new Date(2026, 0, 3); // Jan 3, 2026
    const endDate = new Date(2026, 4, 10); // May 10, 2026
    const sbStart = new Date(2026, 2, 6);
    const sbEnd = new Date(2026, 2, 15);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    let weekdaySlots = 0;
    let weekendSlots = 0;

    allDays.forEach(day => {
        if (day >= sbStart && day <= sbEnd) return;

        const dayOfWeek = getDay(day);
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            weekendSlots += 2; // Primary + Secondary
        } else {
            weekdaySlots += 1;
        }
    });

    const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;

    // Calculate availability for current user
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;
    let myAvailableWeekday = 0;
    let myAvailableWeekend = 0;

    if (netid) {
        const user = db.prepare('SELECT id FROM users WHERE netid = ?').get(netid) as any;
        if (user) {
            const prefs = db.prepare('SELECT date, status FROM preferences WHERE user_id = ?').all(user.id) as any[];
            const blockedDates = new Set(prefs.filter(p => p.status === 2 || p.status === 3).map(p => p.date)); // Strongly Prefer Not (2) or Excused (3) count as blocked? Or just Excused?
            // User asked for "highest number of days that everyone can block out".
            // Let's count "Available" days (Status 0 or 1).
            // Actually, let's count days that are NOT "Excused" (3) or "Strongly Prefer Not" (2).
            // Or maybe just count Explicitly Available?
            // Let's count days where status is NOT 3 (Excused).
            let availableWeekday = 0;
            let availableWeekend = 0;

            allDays.forEach(day => {
                if (day >= sbStart && day <= sbEnd) return;
                const dateStr = day.toISOString().split('T')[0];
                const status = prefs.find(p => p.date === dateStr)?.status || 0;

                // Only count as available if status is 0 (Available)
                if (status === 0) {
                    const dayOfWeek = getDay(day);
                    if (dayOfWeek === 5 || dayOfWeek === 6) {
                        availableWeekend++;
                    } else {
                        availableWeekday++;
                    }
                }
            });

            myAvailableWeekday = availableWeekday;
            myAvailableWeekend = availableWeekend;
        }
    }

    const totalSlots = weekdaySlots + weekendSlots;
    const targetPerUser = userCount > 0 ? Math.ceil(totalSlots / userCount) : 0;

    // Calculate total days in semester (excluding spring break)
    let totalDays = 0;
    allDays.forEach(day => {
        if (day >= sbStart && day <= sbEnd) return;
        totalDays++;
    });

    return {
        userCount,
        weekdayTarget: userCount > 0 ? Math.ceil(weekdaySlots / userCount) : 0,
        weekendTarget: userCount > 0 ? Math.ceil(weekendSlots / userCount) : 0,
        myAvailableWeekday,
        myAvailableWeekend,
        minAvailability: targetPerUser,
        totalDays,
        maxBlockable: totalDays - targetPerUser
    };
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;
    if (!netid) return null;
    return db.prepare('SELECT * FROM users WHERE netid = ?').get(netid) as any;
}
