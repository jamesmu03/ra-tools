'use client';

import { useState, useEffect } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isWeekend } from 'date-fns';
import { savePreference } from '@/app/actions';
import clsx from 'clsx';

type Preference = {
    date: string;
    status: number; // 0: Available, 1: Prefer Not, 2: Cannot
};

export default function Calendar({ initialPreferences }: { initialPreferences: Preference[] }) {
    const [preferences, setPreferences] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const prefs: Record<string, number> = {};
        initialPreferences.forEach(p => {
            prefs[p.date] = p.status;
        });
        setPreferences(prefs);
    }, [initialPreferences]);

    const startDate = new Date(2025, 0, 3); // Jan 3, 2025
    const endDate = new Date(2025, 4, 10); // May 10, 2025

    const months = [
        new Date(2025, 0, 1),
        new Date(2025, 1, 1),
        new Date(2025, 2, 1),
        new Date(2025, 3, 1),
        new Date(2025, 4, 1),
    ];

    const handleDateClick = async (dateStr: string) => {
        const currentStatus = preferences[dateStr] || 0;
        const newStatus = (currentStatus + 1) % 3;

        setPreferences(prev => ({ ...prev, [dateStr]: newStatus }));

        // Optimistic update, but should handle error
        try {
            await savePreference(dateStr, newStatus);
        } catch (e) {
            console.error("Failed to save", e);
            // Revert on error
            setPreferences(prev => ({ ...prev, [dateStr]: currentStatus }));
        }
    };

    const getStatusColor = (status: number) => {
        switch (status) {
            case 1: return 'bg-yellow-200 hover:bg-yellow-300'; // Prefer Not
            case 2: return 'bg-red-200 hover:bg-red-300'; // Cannot
            default: return 'bg-white hover:bg-gray-50'; // Available
        }
    };

    const getStatusText = (status: number) => {
        switch (status) {
            case 1: return 'Prefer Not';
            case 2: return 'Cannot';
            default: return '';
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex gap-4 mb-4 justify-center">
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-white"></div> Available</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-yellow-200"></div> Prefer Not</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 border bg-red-200"></div> Cannot</div>
            </div>

            {months.map(monthStart => {
                const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(monthStart),
                    end: endOfMonth(monthStart)
                });

                // Filter out days before start or after end
                const validDays = daysInMonth.filter(d => d >= startDate && d <= endDate);
                if (validDays.length === 0) return null;

                return (
                    <div key={monthStart.toISOString()} className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-semibold mb-4 text-center">{format(monthStart, 'MMMM yyyy')}</h3>
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="font-medium text-gray-500 py-1">{day}</div>
                            ))}

                            {/* Padding for first week */}
                            {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
                                <div key={`pad-${i}`} />
                            ))}

                            {daysInMonth.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const isOutOfRange = day < startDate || day > endDate;
                                const status = preferences[dateStr] || 0;

                                if (isOutOfRange) {
                                    return <div key={dateStr} className="p-2 text-gray-300">{format(day, 'd')}</div>;
                                }

                                return (
                                    <button
                                        key={dateStr}
                                        onClick={() => handleDateClick(dateStr)}
                                        className={clsx(
                                            "p-2 border rounded transition-colors relative h-16 flex flex-col items-center justify-start",
                                            getStatusColor(status)
                                        )}
                                    >
                                        <span className="font-medium">{format(day, 'd')}</span>
                                        <span className="text-[10px] leading-tight">{getStatusText(status)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
