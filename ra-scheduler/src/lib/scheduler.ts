import { eachDayOfInterval, isWeekend, getDay, format } from 'date-fns';
import db from './db';

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

export function generateSchedule() {
    const startDate = new Date(2025, 0, 3); // Jan 3
    const endDate = new Date(2025, 4, 10); // May 10

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const shifts: Shift[] = [];

    // 1. Generate all shift slots
    allDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
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

    // 2. Fetch users and preferences
    const users = db.prepare('SELECT id FROM users').all() as { id: number }[];
    const preferences = db.prepare('SELECT user_id, date, status FROM preferences').all() as { user_id: number, date: string, status: number }[];

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

    // 4. Assignment Logic
    // We'll process Weekend Primary first (hardest), then Weekend Secondary, then Weekday.
    // Or maybe shuffle shifts to avoid bias?
    // Let's sort shifts: WeekendPri, WeekendSec, Weekday.

    const sortedShifts = [...shifts].sort((a, b) => {
        const typeScore = (t: ShiftType) => {
            if (t === 'weekend_pri') return 0;
            if (t === 'weekend_sec') return 1;
            return 2;
        };
        return typeScore(a.type) - typeScore(b.type);
    });

    // Clear existing schedule
    db.prepare('DELETE FROM schedule').run();

    const insertStmt = db.prepare('INSERT INTO schedule (date, type, user_id) VALUES (?, ?, ?)');

    for (const shift of sortedShifts) {
        // Find candidates
        let candidates = users.filter(u => {
            const stats = userStats.get(u.id)!;
            // Cannot work if already assigned this day
            if (stats.datesAssigned.has(shift.date)) return false;

            // Check preference
            const status = prefMap.get(u.id)?.get(shift.date) || 0;
            if (status === 2) return false; // Cannot

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

            // Balance counts
            if (shift.type === 'weekday') score += stats.weekdayCount * 10;
            if (shift.type === 'weekend_pri') score += stats.weekendPriCount * 10;
            if (shift.type === 'weekend_sec') score += stats.weekendSecCount * 10;

            // Preference penalty
            const status = prefMap.get(u.id)?.get(shift.date) || 0;
            if (status === 1) score += 100; // Prefer Not

            // Avoid back-to-back (yesterday or tomorrow)
            // Simple check: if assigned yesterday, add penalty
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

        // Pick best (or random among ties to distribute better?)
        // Let's pick the best.
        const best = scoredCandidates[0].user;

        // Assign
        insertStmt.run(shift.date, shift.type, best.id);

        // Update stats
        const stats = userStats.get(best.id)!;
        stats.datesAssigned.add(shift.date);
        if (shift.type === 'weekday') stats.weekdayCount++;
        if (shift.type === 'weekend_pri') stats.weekendPriCount++;
        if (shift.type === 'weekend_sec') stats.weekendSecCount++;
    }
}
