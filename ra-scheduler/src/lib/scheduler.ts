import { eachDayOfInterval, isWeekend, getDay, format } from 'date-fns';
import sql from './db';

type ShiftType = 'weekday' | 'weekend_pri' | 'weekend_sec';

interface Shift {
    date: string;
    type: ShiftType;
    assignedTo?: number;
}

interface UserStats {
    id: number;
    weekdayCount: number;
    weekendPriCount: number;
    weekendSecCount: number;
    datesAssigned: Set<string>;
}

export async function generateSchedule(teamName: string) {
    const startDate = new Date(2026, 0, 3); // Jan 3, 2026
    const endDate = new Date(2026, 4, 10); // May 10, 2026

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const shifts: Shift[] = [];

    // 1. Generate all shift slots
    allDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        // Spring Break Exclusion: March 6 - March 15
        const sbStart = new Date(2026, 2, 6); // March 6
        const sbEnd = new Date(2026, 2, 15); // March 15
        if (day >= sbStart && day <= sbEnd) {
            return; // Skip this day
        }

        const dayOfWeek = getDay(day); // 0=Sun, 1=Mon, ..., 6=Sat

        if (dayOfWeek === 5 || dayOfWeek === 6) {
            // Fri (5) or Sat (6) -> Weekend
            shifts.push({ date: dateStr, type: 'weekend_pri' });
            shifts.push({ date: dateStr, type: 'weekend_sec' });
        } else {
            // Sun-Thu -> Weekday
            shifts.push({ date: dateStr, type: 'weekday' });
        }
    });

    // 2. Fetch users and preferences for this team
    // We assume users belong to the team.
    const usersResult = await sql`SELECT id, handicap FROM users WHERE team_name = ${teamName}`;
    const users = usersResult.rows as { id: number, handicap: number }[];

    if (users.length === 0) {
        console.warn(`No users found for team: ${teamName}`);
        return;
    }

    // Fetch preferences for these users
    // We can join or just fetch all for these user IDs.
    // Let's fetch all preferences for users in this team.
    const preferencesResult = await sql`
        SELECT p.user_id, p.date, p.status 
        FROM preferences p
        JOIN users u ON p.user_id = u.id
        WHERE u.team_name = ${teamName}
    `;
    const preferences = preferencesResult.rows as { user_id: number, date: string, status: number }[];

    // Map preferences for quick lookup: userId -> date -> status
    const prefMap = new Map<number, Map<string, number>>();
    users.forEach(u => prefMap.set(u.id, new Map()));
    preferences.forEach(p => {
        if (prefMap.has(p.user_id)) {
            prefMap.get(p.user_id)!.set(p.date, p.status);
        }
    });

    // 3. Initialize stats
    const userStats = new Map<number, UserStats>();
    users.forEach(u => {
        userStats.set(u.id, {
            id: u.id,
            weekdayCount: 0,
            weekendPriCount: 0,
            weekendSecCount: 0,
            datesAssigned: new Set()
        });
    });

    // Load LOCKED shifts into stats
    // Only for this team
    const lockedShiftsResult = await sql`
        SELECT date, type, user_id 
        FROM schedule 
        WHERE locked = 1 AND team_name = ${teamName}
    `;
    const lockedShifts = lockedShiftsResult.rows as { date: string, type: ShiftType, user_id: number }[];
    const lockedKeys = new Set<string>();

    lockedShifts.forEach(ls => {
        lockedKeys.add(`${ls.date}-${ls.type}`);
        if (ls.user_id && userStats.has(ls.user_id)) {
            const stats = userStats.get(ls.user_id)!;
            stats.datesAssigned.add(ls.date);
            if (ls.type === 'weekday') stats.weekdayCount++;
            if (ls.type === 'weekend_pri') stats.weekendPriCount++;
            if (ls.type === 'weekend_sec') stats.weekendSecCount++;
        }
    });

    // 4. Assignment Logic
    const sortedShifts = [...shifts].sort((a, b) => {
        const typeScore = (t: ShiftType) => {
            if (t === 'weekend_pri') return 0;
            if (t === 'weekend_sec') return 1;
            return 2;
        };
        return typeScore(a.type) - typeScore(b.type);
    });

    // Clear existing schedule BUT keep locked ones
    // Only for this team
    await sql`DELETE FROM schedule WHERE locked = 0 AND team_name = ${teamName}`;

    for (const shift of sortedShifts) {
        // Skip if this slot is locked
        if (lockedKeys.has(`${shift.date}-${shift.type}`)) {
            continue;
        }

        // Find candidates
        let candidates = users.filter(u => {
            const stats = userStats.get(u.id)!;
            // Cannot work if already assigned this day
            if (stats.datesAssigned.has(shift.date)) return false;

            // Check preference
            const status = prefMap.get(u.id)?.get(shift.date) || 0;
            if (status === 3) return false; // Excused (Hard Constraint)

            return true;
        });

        if (candidates.length === 0) {
            console.warn(`No candidates for ${shift.date} (${shift.type})`);
            continue; // Skip or handle error
        }

        // Score candidates
        // Lower score is better
        const scoredCandidates = candidates.map(u => {
            const stats = userStats.get(u.id)!;
            let score = 0;

            const handicap = (u as any).handicap || 0;
            const totalCount = stats.weekdayCount + stats.weekendPriCount + stats.weekendSecCount;

            if (shift.type === 'weekday') score += stats.weekdayCount * 10;
            if (shift.type === 'weekend_pri') score += stats.weekendPriCount * 10;
            if (shift.type === 'weekend_sec') score += stats.weekendSecCount * 10;

            score += (totalCount - handicap) * 2;

            // Preference penalty
            const status = prefMap.get(u.id)?.get(shift.date) || 0;
            if (status === 1) score += 100; // Prefer Not
            if (status === 2) score += 500; // Strongly Prefer Not

            // Avoid back-to-back (yesterday or tomorrow)
            const yesterday = new Date(shift.date);
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = format(yesterday, 'yyyy-MM-dd');
            if (stats.datesAssigned.has(yStr)) score += 500;

            const tomorrow = new Date(shift.date);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tStr = format(tomorrow, 'yyyy-MM-dd');
            if (stats.datesAssigned.has(tStr)) score += 500;

            return { user: u, score };
        });

        // Sort by score
        scoredCandidates.sort((a, b) => a.score - b.score);

        // Pick best
        const best = scoredCandidates[0].user;

        // Assign
        await sql`
            INSERT INTO schedule (date, type, user_id, team_name) 
            VALUES (${shift.date}, ${shift.type}, ${best.id}, ${teamName})
        `;

        // Update stats
        const stats = userStats.get(best.id)!;
        stats.datesAssigned.add(shift.date);
        if (shift.type === 'weekday') stats.weekdayCount++;
        if (shift.type === 'weekend_pri') stats.weekendPriCount++;
        if (shift.type === 'weekend_sec') stats.weekendSecCount++;
    }
}
