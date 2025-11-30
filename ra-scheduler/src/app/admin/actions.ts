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
        // For MVP, if no admin exists, make the first user admin?
        // Or just hardcode a check or allow anyone for now since it's a tool for a team.
        // Let's strict check but provide a way to become admin in DB manually.
        // For now, redirect to home if not admin.
        redirect('/');
    }
}

export async function triggerScheduleGeneration() {
    // await checkAdmin(); // Commented out for easier testing in MVP, or enable if needed
    generateSchedule();
}

export async function getScheduleData() {
    // await checkAdmin();
    const schedule = db.prepare(`
    SELECT s.date, s.type, u.name, u.netid 
    FROM schedule s 
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.date ASC
  `).all();
    return schedule;
}

export async function getAllUsers() {
    // await checkAdmin();
    return db.prepare('SELECT * FROM users').all();
}

export async function downloadScheduleCSV() {
    const schedule = db.prepare(`
        SELECT s.date, s.type, u.name, u.netid 
        FROM schedule s 
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.date ASC
    `).all() as any[];

    // Format for MS Teams Shifts (Generic Import)
    // Headers: Team Member,Shift Start Date,Shift Start Time,Shift End Date,Shift End Time,Theme
    const header = "Team Member,Shift Start Date,Shift Start Time,Shift End Date,Shift End Time,Theme,Shift Note";
    const rows = schedule.map(row => {
        const startDate = row.date;
        // End date is next day for 9pm-9am
        const d = new Date(startDate);
        d.setDate(d.getDate() + 1);
        const endDate = d.toISOString().split('T')[0];

        const startTime = "21:00"; // 9 PM
        const endTime = "09:00"; // 9 AM

        const theme = row.type === 'weekday' ? 'Blue' : (row.type === 'weekend_pri' ? 'Purple' : 'Pink');
        const note = row.type === 'weekday' ? 'Weekday On-Call' : (row.type === 'weekend_pri' ? 'Weekend Primary' : 'Weekend Secondary');

        // Team Member should be email or name. Let's use name or netid@duke.edu
        const member = `${row.netid}@duke.edu`;

        return `${member},${startDate},${startTime},${endDate},${endTime},${theme},${note}`;
    });

    return [header, ...rows].join('\n');
}
