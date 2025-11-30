'use client';

import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

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

// Deterministic color palette (High Contrast: Dark BG, White Text)
const COLOR_PALETTE = [
    { bg: '#1e3a8a', text: '#ffffff' }, // blue-900
    { bg: '#14532d', text: '#ffffff' }, // green-900
    { bg: '#581c87', text: '#ffffff' }, // purple-900
    { bg: '#881337', text: '#ffffff' }, // rose-900
    { bg: '#7c2d12', text: '#ffffff' }, // orange-900
    { bg: '#164e63', text: '#ffffff' }, // cyan-900
    { bg: '#701a75', text: '#ffffff' }, // fuchsia-900
    { bg: '#0c4a6e', text: '#ffffff' }, // sky-900
    { bg: '#111827', text: '#ffffff' }, // gray-900
    { bg: '#451a03', text: '#ffffff' }, // amber-900
];

function getUserColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLOR_PALETTE.length;
    return COLOR_PALETTE[index];
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

    const handleDateClick = (e: React.MouseEvent, date: string) => {
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
            userId: (s as any).user_id !== undefined ? (s as any).user_id : (s as any).userId
        }));

        // Ctrl+Click (or Cmd+Click): Toggle Lock
        if (e.ctrlKey || e.metaKey) {
            const allLocked = mappedShifts.every(s => s.locked === 1);
            const newLockedState = !allLocked;

            mappedShifts.forEach(s => {
                onAssign(s.date, s.type, s.userId, newLockedState);
            });
            return;
        }

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

    useEffect(() => {
        if (editingShifts) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [editingShifts]);

    return (
        <div className="space-y-12 relative">
            {/* Modal - Popover Style with Backdrop */}
            {editingShifts && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => setEditingShifts(null)}
                    />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 shadow-xl rounded-lg border border-gray-200 bg-white w-96 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">Edit Assignments</h3>
                            <p className="text-xs text-gray-500 mt-1">{editingShifts[0].date}</p>
                        </div>

                        <div className="p-6 space-y-6">
                            {editingShifts.map((shift, idx) => (
                                <div key={shift.type} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">{shift.type.replace('_', ' ')}</h4>
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                                checked={shift.locked === 1 || shift.locked === true}
                                                onChange={e => {
                                                    const newShifts = [...editingShifts];
                                                    newShifts[idx] = { ...shift, locked: e.target.checked ? 1 : 0 };
                                                    setEditingShifts(newShifts);
                                                }}
                                            />
                                            <span className="text-xs text-gray-400">Lock</span>
                                        </label>
                                    </div>
                                    <select
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 bg-white border"
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
                            ))}
                        </div>

                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
                            <button onClick={() => setEditingShifts(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm">Save Changes</button>
                        </div>
                    </div>
                </>
            )}

            {months.map(monthStart => {
                const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(monthStart),
                    end: endOfMonth(monthStart)
                });

                const validDays = daysInMonth.filter(d => d >= startDate && d <= endDate);
                if (validDays.length === 0) return null;

                return (
                    <div key={monthStart.toISOString()} className="mb-8">
                        <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">{format(monthStart, 'MMMM yyyy')}</h3>
                        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{day}</div>
                            ))}

                            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
                                <div key={`pad-${i}`} className="bg-white h-24" />
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
                                    return <div key={dateStr} className="bg-gray-50 h-24 p-2 text-gray-300 text-sm">{format(day, 'd')}</div>;
                                }

                                if (isSpringBreak) {
                                    return (
                                        <div key={dateStr} className="bg-gray-50 h-24 p-2 flex flex-col items-center justify-center text-gray-400">
                                            <span className="text-sm font-medium">{format(day, 'd')}</span>
                                            <span className="text-[10px] mt-1">Spring Break</span>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={dateStr}
                                        onClick={(e) => handleDateClick(e, dateStr)}
                                        className="bg-white h-24 p-2 flex flex-col items-start justify-start relative group cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-gray-700 mb-1">{format(day, 'd')}</span>
                                        <div className="w-full flex flex-col gap-1">
                                            {items.map((item, i) => {
                                                const { bg, text } = getUserColor(item.name || 'Unassigned');

                                                return (
                                                    <div
                                                        key={i}
                                                        className="text-[10px] px-1.5 py-0.5 rounded w-full text-left relative truncate opacity-90 hover:opacity-100"
                                                        style={{ backgroundColor: bg, color: text }}
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
