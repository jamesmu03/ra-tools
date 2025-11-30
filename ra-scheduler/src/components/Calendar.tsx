'use client';

import { useState, useEffect } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isWeekend } from 'date-fns';
import { savePreference } from '@/app/actions';
import clsx from 'clsx';

type Preference = {
    date: string;
    status: number; // 0: Available, 1: Prefer Not, 2: Strongly Prefer Not, 3: Excused
};

type Event = {
    date: string;
    name: string;
}

type CalendarProps = {
    initialPreferences: Record<string, number>;
    events: Event[];
    onPreferenceChange?: (date: string, status: number) => void;
};

export default function Calendar({ initialPreferences, events, onPreferenceChange }: CalendarProps) {
    const [preferences, setPreferences] = useState<Record<string, number>>(initialPreferences);

    // Map events for quick lookup
    const eventMap = new Map<string, string>();
    events.forEach(e => eventMap.set(e.date, e.name));

    useEffect(() => {
        setPreferences(initialPreferences);
    }, [initialPreferences]);

    const startDate = new Date(2026, 0, 3); // Jan 3, 2026
    const endDate = new Date(2026, 4, 10); // May 10, 2026

    const months = [
        new Date(2026, 0, 1),
        new Date(2026, 1, 1),
        new Date(2026, 2, 1),
        new Date(2026, 3, 1),
        new Date(2026, 4, 1),
    ];

    const handleDateClick = async (dateStr: string) => {
        const currentStatus = preferences[dateStr] || 0;
        const newStatus = (currentStatus + 1) % 4; // Cycle 0 -> 1 -> 2 -> 3 -> 0

        // Optimistic update
        setPreferences(prev => ({ ...prev, [dateStr]: newStatus }));

        if (onPreferenceChange) {
            onPreferenceChange(dateStr, newStatus);
        } else {
            try {
                await savePreference(dateStr, newStatus);
            } catch (e) {
                console.error("Failed to save", e);
                setPreferences(prev => ({ ...prev, [dateStr]: currentStatus }));
            }
        }
    };

    const getStatusColor = (status: number) => {
        switch (status) {
            case 1: return 'bg-yellow-200 hover:bg-yellow-300'; // Prefer Not
            case 2: return 'bg-orange-300 hover:bg-orange-400'; // Strongly Prefer Not
            case 3: return 'bg-red-400 hover:bg-red-500 text-white'; // Excused
            default: return 'bg-white hover:bg-gray-50'; // Available
        }
    };

    const getStatusText = (status: number) => {
        switch (status) {
            case 1: return 'Prefer Not';
            case 2: return 'Strongly No';
            case 3: return 'Excused';
            default: return '';
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap gap-4 mb-4 justify-center">
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-white"></div> Available</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-yellow-200"></div> Prefer Not</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-orange-300"></div> Strongly Prefer Not</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-red-400"></div> Excused</div>
            </div>

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

                                // Spring Break: March 6 - March 15
                                const sbStart = new Date(2026, 2, 6);
                                const sbEnd = new Date(2026, 2, 15);
                                const isSpringBreak = day >= sbStart && day <= sbEnd;

                                const status = preferences[dateStr] || 0;
                                const eventName = eventMap.get(dateStr);

                                if (isOutOfRange) {
                                    return <div key={dateStr} className="p-2 text-gray-300">{format(day, 'd')}</div>;
                                }

                                if (isSpringBreak) {
                                    return (
                                        <div key={dateStr} className="p-1 border rounded bg-gray-100 text-gray-400 h-20 flex flex-col items-center justify-center">
                                            <span className="font-medium">{format(day, 'd')}</span>
                                            <span className="text-[10px] text-center">Spring Break</span>
                                        </div>
                                    );
                                }

                                const handleQuadClick = async (newStatus: number) => {
                                    // Optimistic update
                                    setPreferences(prev => ({ ...prev, [dateStr]: newStatus }));

                                    if (onPreferenceChange) {
                                        onPreferenceChange(dateStr, newStatus);
                                    } else {
                                        try {
                                            await savePreference(dateStr, newStatus);
                                        } catch (e) {
                                            console.error("Failed to save", e);
                                            // Revert? Complex with optimistic updates.
                                        }
                                    }
                                };

                                return (
                                    <div
                                        key={dateStr}
                                        className="border rounded relative h-24 overflow-hidden group"
                                    >
                                        {/* Default View (Visible when NOT hovering) */}
                                        <div className={clsx(
                                            "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 group-hover:opacity-0",
                                            getStatusColor(status)
                                        )}>
                                            <span className="font-medium text-gray-800">{format(day, 'd')}</span>
                                            {eventName && (
                                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded mt-1 w-full truncate text-center opacity-90">
                                                    {eventName}
                                                </span>
                                            )}
                                            <span className="text-xs font-medium mt-1">{getStatusText(status)}</span>
                                        </div>

                                        {/* Hover View (Visible when hovering) */}
                                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                            {/* Top-Left: Available (0) */}
                                            <button
                                                onClick={() => handleQuadClick(0)}
                                                className={clsx(
                                                    "w-full h-full flex items-center justify-center text-[10px] font-bold leading-tight p-1 transition-colors",
                                                    status === 0 ? "bg-white text-black" : "bg-gray-50 text-gray-500 hover:bg-white hover:text-black"
                                                )}
                                            >
                                                Available
                                            </button>
                                            {/* Top-Right: Prefer Not (1) */}
                                            <button
                                                onClick={() => handleQuadClick(1)}
                                                className={clsx(
                                                    "w-full h-full flex items-center justify-center text-[10px] font-bold leading-tight p-1 transition-colors",
                                                    status === 1 ? "bg-yellow-200 text-yellow-900" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-200 hover:text-yellow-900"
                                                )}
                                            >
                                                Prefer Not
                                            </button>
                                            {/* Bottom-Left: Strongly Prefer Not (2) */}
                                            <button
                                                onClick={() => handleQuadClick(2)}
                                                className={clsx(
                                                    "w-full h-full flex items-center justify-center text-[10px] font-bold leading-tight p-1 transition-colors",
                                                    status === 2 ? "bg-orange-300 text-orange-900" : "bg-orange-50 text-orange-700 hover:bg-orange-300 hover:text-orange-900"
                                                )}
                                            >
                                                Strongly No
                                            </button>
                                            {/* Bottom-Right: Excused (3) */}
                                            <button
                                                onClick={() => handleQuadClick(3)}
                                                className={clsx(
                                                    "w-full h-full flex items-center justify-center text-[10px] font-bold leading-tight p-1 transition-colors",
                                                    status === 3 ? "bg-red-400 text-white" : "bg-red-50 text-red-700 hover:bg-red-400 hover:text-white"
                                                )}
                                            >
                                                Excused
                                            </button>
                                        </div>

                                        {/* Date Overlay for Hover State (Optional, maybe just let the buttons speak?) 
                                            Actually, if we cover everything, we lose the date context. 
                                            Let's put a small date badge in the center or corner that stays on top?
                                            Or maybe just rely on the user knowing which box they hovered.
                                            Let's add a small absolute centered date that is pointer-events-none.
                                        */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-20 z-20">
                                            <span className="text-4xl font-bold text-black">{format(day, 'd')}</span>
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
