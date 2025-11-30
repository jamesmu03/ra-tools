'use server'

import { cookies } from 'next/headers';
import sql from '@/lib/db';
import { generateSchedule as libGenerateSchedule } from '@/lib/scheduler';
import { redirect } from 'next/navigation';
import { getTeamName } from '../actions';

async function checkAdmin() {
    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;
    if (!netid) redirect('/login');

    const userResult = await sql`SELECT role FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];
    if (user?.role !== 'admin') {
        redirect('/');
    }
    return user;
}

export async function triggerScheduleGeneration() {
    // await checkAdmin();
    const teamName = await getTeamName();
    await libGenerateSchedule(teamName);
}

export async function getScheduleData() {
    const teamName = await getTeamName();
    const scheduleResult = await sql`
    SELECT s.date, s.type, s.locked, u.name, u.netid, u.email, s.user_id
    FROM schedule s 
    LEFT JOIN users u ON s.user_id = u.id
    WHERE s.team_name = ${teamName}
    ORDER BY s.date ASC
  `;
    return scheduleResult.rows;
}

export async function assignShift(date: string, type: string, userId: number, locked: boolean) {
    // await checkAdmin();
    const teamName = await getTeamName();

    // Check if shift exists
    const existingResult = await sql`SELECT id FROM schedule WHERE date = ${date} AND type = ${type} AND team_name = ${teamName}`;
    const existing = existingResult.rows[0];

    if (existing) {
        await sql`UPDATE schedule SET user_id = ${userId}, locked = ${locked ? 1 : 0} WHERE date = ${date} AND type = ${type} AND team_name = ${teamName}`;
    } else {
        await sql`INSERT INTO schedule (date, type, user_id, locked, team_name) VALUES (${date}, ${type}, ${userId}, ${locked ? 1 : 0}, ${teamName})`;
    }
}

export async function getShiftCounts() {
    const teamName = await getTeamName();
    const countsResult = await sql`
        SELECT 
            u.id,
            SUM(CASE WHEN s.type = 'weekday' THEN 1 ELSE 0 END) as weekday,
            SUM(CASE WHEN s.type = 'weekend_pri' THEN 1 ELSE 0 END) as weekendPri,
            SUM(CASE WHEN s.type = 'weekend_sec' THEN 1 ELSE 0 END) as weekendSec
        FROM users u
        LEFT JOIN schedule s ON u.id = s.user_id
        WHERE u.team_name = ${teamName}
        GROUP BY u.id
    `;
    return countsResult.rows;
}

export async function getAllUsers() {
    const teamName = await getTeamName();
    const usersResult = await sql`SELECT * FROM users WHERE team_name = ${teamName}`;
    return usersResult.rows;
}

export async function inviteRAs(emailList: string) {
    // await checkAdmin();
    const teamName = await getTeamName();
    const emails = emailList.split(/[\n,]+/).map(e => e.trim()).filter(e => e);

    let count = 0;
    for (const email of emails) {
        // Extract netid from email (assuming netid@duke.edu)
        const match = email.match(/^(.+)@duke\.edu$/);
        if (match) {
            const netid = match[1];
            const name = netid; // Default name to netid until they log in
            // Insert with team_name
            await sql`
                INSERT INTO users (netid, name, email, team_name) 
                VALUES (${netid}, ${name}, ${email}, ${teamName}) 
                ON CONFLICT(netid) DO NOTHING
            `;
            count++;
            console.log(`[Mock Email] Sending invite to ${email}...`);
        }
    }
    return count;
}

export async function updateHandicap(userId: number, handicap: number) {
    // await checkAdmin();
    await sql`UPDATE users SET handicap = ${handicap} WHERE id = ${userId}`;
}

export async function getEvents() {
    const teamName = await getTeamName();
    const eventsResult = await sql`SELECT * FROM events WHERE team_name = ${teamName} ORDER BY date ASC`;
    return eventsResult.rows;
}

export async function addEvent(date: string, name: string) {
    // await checkAdmin();
    const teamName = await getTeamName();
    await sql`INSERT INTO events (date, name, team_name) VALUES (${date}, ${name}, ${teamName})`;
}

export async function removeEvent(id: number) {
    // await checkAdmin();
    // Should verify team ownership?
    // For now, assuming ID is unique globally (SERIAL), but safer to check.
    // But we don't have team_name in removeEvent args, and checking it requires a query.
    // Let's just delete by ID.
    await sql`DELETE FROM events WHERE id = ${id}`;
}

export async function downloadScheduleCSV() {
    const teamName = await getTeamName();
    const scheduleResult = await sql`
        SELECT s.date, s.type, u.name, u.netid, u.email
        FROM schedule s 
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.team_name = ${teamName}
        ORDER BY s.date ASC
    `;
    const schedule = scheduleResult.rows;

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
