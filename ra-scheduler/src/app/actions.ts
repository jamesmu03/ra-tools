'use server'

import { cookies } from 'next/headers';
import sql from '@/lib/db';
import { eachDayOfInterval, getDay } from 'date-fns';

export async function getPreferences() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) return {};

    const userResult = await sql`SELECT id FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];
    if (!user) return {};

    const prefsResult = await sql`SELECT date, status FROM preferences WHERE user_id = ${user.id}`;
    const prefs = prefsResult.rows;

    const prefMap: Record<string, number> = {};
    prefs.forEach(p => {
        prefMap[p.date] = p.status;
    });

    return prefMap;
}

export async function getEvents() {
    // Events should be filtered by team.
    // We need to get the current user's team first.
    const teamName = await getTeamName();
    const eventsResult = await sql`SELECT date, name FROM events WHERE team_name = ${teamName}`;
    return eventsResult.rows as { date: string, name: string }[];
}

export async function savePreference(date: string, status: number) {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) throw new Error('Not authenticated');

    const userResult = await sql`SELECT id FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];
    if (!user) throw new Error('User not found');

    if (status === 0) {
        // Remove preference if "Available" (default)
        await sql`DELETE FROM preferences WHERE user_id = ${user.id} AND date = ${date}`;
    } else {
        // Upsert preference
        await sql`
            INSERT INTO preferences (user_id, date, status) 
            VALUES (${user.id}, ${date}, ${status})
            ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status
        `;
    }
}

export async function resetPreferences() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) throw new Error('Not authenticated');

    const userResult = await sql`SELECT id FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];
    if (!user) throw new Error('User not found');

    await sql`DELETE FROM preferences WHERE user_id = ${user.id}`;
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

    // Get current user to determine team
    const currentUser = await getCurrentUser();
    const teamName = currentUser?.team_name || 'RA Scheduler';

    // Count users in THIS team
    const userCountResult = await sql`SELECT count(*) as count FROM users WHERE team_name = ${teamName}`;
    const userCount = parseInt(userCountResult.rows[0].count);

    // Calculate availability for current user
    let myAvailableWeekday = 0;
    let myAvailableWeekend = 0;

    if (currentUser) {
        const prefsResult = await sql`SELECT date, status FROM preferences WHERE user_id = ${currentUser.id}`;
        const prefs = prefsResult.rows;

        // Count days that are NOT "Excused" (3) or "Strongly Prefer Not" (2)?
        // The logic in original code was:
        // status === 0 (Available) -> count it.

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
    const result = await sql`SELECT * FROM users WHERE netid = ${netid}`;
    return result.rows[0];
}

export async function getTeamName() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;
    if (!netid) return 'RA Scheduler';

    const userResult = await sql`SELECT role, team_name FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];
    if (!user) return 'RA Scheduler';

    if (user.team_name) return user.team_name;

    // If user has no team_name, try to find an admin's team name?
    // In multi-tenant, falling back to *any* admin is dangerous.
    // Better to return a default or null.
    // For now, let's return 'RA Scheduler' if no team is set.
    return 'RA Scheduler';
}

export async function bulkApplyPreference(dayOfWeek: number, status: number) {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) throw new Error('Not authenticated');

    const userResult = await sql`SELECT id FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];
    if (!user) throw new Error('User not found');

    const startDate = new Date(2026, 0, 3); // Jan 3, 2026
    const endDate = new Date(2026, 4, 10); // May 10, 2026
    const sbStart = new Date(2026, 2, 6);
    const sbEnd = new Date(2026, 2, 15);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const daysToUpdate: string[] = [];

    allDays.forEach(day => {
        if (day >= sbStart && day <= sbEnd) return;
        if (getDay(day) === dayOfWeek) {
            daysToUpdate.push(day.toISOString().split('T')[0]);
        }
    });

    // Vercel Postgres doesn't support transactions in the same way as better-sqlite3
    // We can just loop and await, or construct a big query.
    // Looping is safer for now.

    for (const date of daysToUpdate) {
        if (status === 0) {
            await sql`DELETE FROM preferences WHERE user_id = ${user.id} AND date = ${date}`;
        } else {
            await sql`
                INSERT INTO preferences (user_id, date, status) 
                VALUES (${user.id}, ${date}, ${status})
                ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status
            `;
        }
    }
}
