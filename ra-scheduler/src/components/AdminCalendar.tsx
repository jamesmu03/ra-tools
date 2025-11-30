'use client';

import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import clsx from 'clsx';
import { useState } from 'react';

type ScheduleItem = {
    date: string;
    type: string;
    name: string;
    user_id: number;
    locked: number;
}

type User = {
    id: number;
    name: string;
}

// Helper to generate consistent color from string
function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Helper to get a readable text color (black or white) based on background
function getContrastYIQ(hexcolor: string) {
    hexcolor = hexcolor.replace("#", "");
    var r = parseInt(hexcolor.substr(0, 2), 16);
    var g = parseInt(hexcolor.substr(2, 2), 16);
    var b = parseInt(hexcolor.substr(4, 2), 16);
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

export default function AdminCalendar({ schedule, users, onAssign }: { schedule: ScheduleItem[], users: User[], onAssign: (date: string, type: string, userId: number, locked: boolean) => void }) {
    const scheduleMap = new Map<string, ScheduleItem[]>();
    schedule.forEach(s => {
        if (!scheduleMap.has(s.date)) scheduleMap.set(s.date, []);
        scheduleMap.get(s.date)!.push(s);
    });

    const startDate = new Date(2026, 0, 3); // Jan 3, 2026
    const endDate = new Date(2026, 4, 10); // May 10, 2026

    const months = [
        new Date(2026, 0, 1),
        new Date(2026, 1, 1),
        new Date(2026, 2, 1),
        new Date(2026, 3, 1),
        new Date(2026, 4, 1),
    ];

    const handleDateClick = (date: string) => {
        // Find all shifts for this date
        // If none, we need to know what shifts SHOULD be there.
        // Weekday: 'weekday'
        // Weekend: 'weekend_pri', 'weekend_sec'

        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat

        const existingShifts = scheduleMap.get(date) || [];

        const shiftsToEdit = [];

        if (isWeekend) {
            shiftsToEdit.push(
                existingShifts.find(s => s.type === 'weekend_pri') || { date, type: 'weekend_pri', userId: -1, locked: 0, name: '' },
                existingShifts.find(s => s.type === 'weekend_sec') || { date, type: 'weekend_sec', userId: -1, locked: 0, name: '' }
            );
        } else {
            shiftsToEdit.push(
                existingShifts.find(s => s.type === 'weekday') || { date, type: 'weekday', userId: -1, locked: 0, name: '' }
            );
        }

        // Map user_id to userId if present in existing shifts
        const mappedShifts = shiftsToEdit.map(s => ({
            ...s,
            userId: (s as any).user_id !== undefined ? (s as any).user_id : s.userId
        }));

        setEditingShifts(mappedShifts);
    };

    const [editingShifts, setEditingShifts] = useState<any[] | null>(null);

    const handleSave = () => {
        if (editingShifts) {
            editingShifts.forEach(s => {
                // Only save if userId is valid (not -1)
                // If unassigned (-1), we might want to clear it? 
                // For now, let's assume -1 means "do nothing" or "clear".
                // If we want to support clearing, we should pass null or -1 to onAssign.
                // Let's pass it.
                onAssign(s.date, s.type, s.userId, s.locked === 1 || s.locked === true);
            });
            setEditingShifts(null);
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Modal - Popover Style (Centered but no backdrop) */}
            {editingShifts && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 shadow-2xl rounded-lg border border-gray-200">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-lg font-bold mb-4">Edit Assignments ({editingShifts[0].date})</h3>

                        {editingShifts.map((shift, idx) => (
                            <div key={shift.type} className="mb-6 border-b pb-4 last:border-0 last:pb-0">
                                <h4 className="font-semibold text-sm text-gray-700 mb-2 capitalize">{shift.type.replace('_', ' ')}</h4>
                                <div className="mb-2">
                                    <select
                                        className="w-full border p-2 rounded text-sm"
                                        value={shift.userId || -1}
                                        onChange={e => {
                                            const newShifts = [...editingShifts];
                                            newShifts[idx] = { ...shift, userId: parseInt(e.target.value) };
                                            setEditingShifts(newShifts);
                                        }}
                                    >
                                        <option value={-1}>Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={shift.locked === 1 || shift.locked === true}
                                            onChange={e => {
                                                const newShifts = [...editingShifts];
                                                newShifts[idx] = { ...shift, locked: e.target.checked ? 1 : 0 };
                                                setEditingShifts(newShifts);
                                            }}
                                        />
                                        <span className="text-sm text-gray-600">Lock Assignment</span>
                                    </label>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={() => setEditingShifts(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {months.map(monthStart => {
                const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(monthStart),
                    end: endOfMonth(monthStart)
                });

                const validDays = daysInMonth.filter(d => d >= startDate && d <= endDate);
                if (validDays.length === 0) return null;

                return (
                    <div key={monthStart.toISOString()} className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-semibold mb-4 text-center">{format(monthStart, 'MMMM yyyy')}</h3>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="font-medium text-gray-500 py-1">{day}</div>
                            ))}

                            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
                                <div key={`pad-${i}`} />
                            ))}

                            {daysInMonth.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const isOutOfRange = day < startDate || day > endDate;
                                const items = scheduleMap.get(dateStr) || [];

                                // Spring Break: March 6 - March 15
                                const sbStart = new Date(2026, 2, 6);
                                const sbEnd = new Date(2026, 2, 15);
                                const isSpringBreak = day >= sbStart && day <= sbEnd;

                                if (isOutOfRange) {
                                    return <div key={dateStr} className="p-2 text-gray-300">{format(day, 'd')}</div>;
                                }

                                if (isSpringBreak) {
                                    return (
                                        <div key={dateStr} className="p-1 border rounded bg-gray-100 text-gray-400 h-24 flex flex-col items-center justify-center">
                                            <span className="font-medium">{format(day, 'd')}</span>
                                            <span className="text-[10px] text-center">Spring Break</span>
                                        </div>
                                    );
                                }

                                // Ensure we have placeholders for unassigned slots if needed?
                                // Or just show what's in the DB.
                                // If it's a weekend, we expect 2 slots. If weekday, 1 slot.
                                // But the DB only has rows for assigned/generated shifts.
                                // Let's just render what we have.

                                return (
                                    <div
                                        key={dateStr}
                                        onClick={() => handleDateClick(dateStr)}
                                        className="p-1 border rounded h-24 flex flex-col items-start justify-start overflow-hidden bg-white relative group cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                                    >
                                        <span className="font-medium text-gray-700 ml-1">{format(day, 'd')}</span>
                                        <div className="w-full flex flex-col gap-1 mt-1">
                                            {items.map((item, i) => {
                                                const bgColor = stringToColor(item.name || 'Unassigned');
                                                const textColor = getContrastYIQ(bgColor);

                                                return (
                                                    <div
                                                        key={i}
                                                        className="text-[10px] px-1 rounded truncate w-full text-left relative"
                                                        style={{ backgroundColor: bgColor, color: textColor }}
                                                    >
                                                        {item.locked === 1 && <span className="mr-1">🔒</span>}
                                                        {item.name || 'Unassigned'}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
