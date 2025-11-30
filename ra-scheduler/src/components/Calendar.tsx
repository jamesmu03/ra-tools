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
            case 1: return 'bg-yellow-50 hover:bg-yellow-100 text-yellow-900'; // Prefer Not
            case 2: return 'bg-orange-100 hover:bg-orange-200 text-orange-900'; // Strongly Prefer Not
            case 3: return 'bg-red-50 hover:bg-red-100 text-red-900'; // Excused
            default: return 'bg-white hover:bg-gray-50 text-gray-900'; // Available
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
        <div className="space-y-12">
            {/* Legend removed as it is now in DashboardClient */}

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

                                // Spring Break: March 6 - March 15
                                const sbStart = new Date(2026, 2, 6);
                                const sbEnd = new Date(2026, 2, 15);
                                const isSpringBreak = day >= sbStart && day <= sbEnd;

                                const status = preferences[dateStr] || 0;
                                const eventName = eventMap.get(dateStr);

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
                                        className="relative h-24 group bg-white hover:z-10"
                                    >
                                        {/* Default View */}
                                        <div className={clsx(
                                            "absolute inset-0 flex flex-col items-start justify-between p-2 transition-colors duration-200",
                                            getStatusColor(status)
                                        )}>
                                            <span className="text-sm font-medium">{format(day, 'd')}</span>
                                            <div className="w-full">
                                                {eventName && (
                                                    <div className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mb-1 w-full truncate">
                                                        {eventName}
                                                    </div>
                                                )}
                                                {status !== 0 && (
                                                    <div className="text-[10px] font-medium opacity-75">{getStatusText(status)}</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hover Actions - Simplified */}
                                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col z-20 shadow-sm">
                                            <div className="flex-1 flex">
                                                <button onClick={() => handleQuadClick(0)} className="flex-1 hover:bg-gray-50 text-[10px] text-gray-900 font-medium border-b border-r border-gray-100">Avail</button>
                                                <button onClick={() => handleQuadClick(1)} className="flex-1 hover:bg-yellow-50 text-[10px] text-yellow-900 font-medium border-b border-gray-100">Prefer Not</button>
                                            </div>
                                            <div className="flex-1 flex">
                                                <button onClick={() => handleQuadClick(2)} className="flex-1 hover:bg-orange-50 text-[10px] text-orange-900 font-medium border-r border-gray-100">Strongly No</button>
                                                <button onClick={() => handleQuadClick(3)} className="flex-1 hover:bg-red-50 text-[10px] text-red-900 font-medium">Excused</button>
                                            </div>
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
