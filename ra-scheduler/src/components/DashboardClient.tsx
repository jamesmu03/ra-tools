'use client';

import { useState } from 'react';
import Calendar from '@/components/Calendar';
import clsx from 'clsx';
import { savePreference, resetPreferences } from '@/app/actions';

type DashboardClientProps = {
    initialPreferences: Record<string, number>;
    events: any[];
    stats: {
        userCount: number;
        weekdayTarget: number;
        weekendTarget: number;
        totalDays: number;
        maxBlockable: number;
    };
    user: any;
};

export default function DashboardClient({ initialPreferences, events, stats, user }: DashboardClientProps) {
    // Local state for preferences to allow instant updates
    const [preferences, setPreferences] = useState(initialPreferences);

    // Calculate available days locally
    // We need to know which dates are weekends to split the count.
    // Since we don't have the full date objects here easily without a library or helper, 
    // let's iterate through the keys of preferences? No, preferences only has CHANGED values.
    // We need to iterate through all valid days.
    // We can use the `events` or just reconstruct the range.
    // Let's use a helper or just do it simply:
    // We know the range is Jan 3 to May 10, 2026.

    // Actually, we can just iterate through the days we render in the calendar?
    // Or better, let's just use a simple function since we know the range.

    const getAvailableCounts = () => {
        let weekday = 0;
        let weekend = 0;

        const start = new Date(2026, 0, 3);
        const end = new Date(2026, 4, 10);
        const sbStart = new Date(2026, 2, 6);
        const sbEnd = new Date(2026, 2, 15);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d >= sbStart && d <= sbEnd) continue;

            const dateStr = d.toISOString().split('T')[0];
            const status = preferences[dateStr] || 0;

            if (status === 0) {
                const day = d.getDay();
                if (day === 5 || day === 6) weekend++;
                else weekday++;
            }
        }
        return { weekday, weekend };
    };

    const { weekday: availWeekday, weekend: availWeekend } = getAvailableCounts();

    const handlePreferenceChange = async (date: string, status: number) => {
        // Optimistic update
        setPreferences(prev => ({ ...prev, [date]: status }));
        // Server update
        await savePreference(date, status);
    };

    const handleReset = async () => {
        if (confirm('Are you sure you want to reset ALL your preferences? This cannot be undone.')) {
            setPreferences({});
            await resetPreferences();
        }
    };

    return (
        <div>
            {/* Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                    <span className="text-3xl font-light text-gray-900">{stats.userCount}</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Total RAs</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-1">
                        <span className={clsx("text-3xl font-light", availWeekday >= stats.weekdayTarget ? "text-gray-900" : "text-red-700")}>
                            {availWeekday}
                        </span>
                        <span className="text-sm text-gray-500 font-light">of {stats.weekdayTarget} target</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wider mt-1">Weekday Availability</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-1">
                        <span className={clsx("text-3xl font-light", availWeekend >= stats.weekendTarget ? "text-gray-900" : "text-red-700")}>
                            {availWeekend}
                        </span>
                        <span className="text-sm text-gray-500 font-light">of {stats.weekendTarget} target</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wider mt-1">Weekend Availability</span>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-gray-200 p-4 rounded-lg mb-8 gap-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Legend:</span>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white border border-gray-300"></span> Available</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-100 border border-yellow-200"></span> Prefer Not</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-100 border border-orange-200"></span> Strongly No</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-100 border border-red-200"></span> Excused</div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <select
                            id="bulk-day"
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-md focus:ring-gray-500 focus:border-gray-500 block p-2"
                        >
                            <option value="1">Mondays</option>
                            <option value="2">Tuesdays</option>
                            <option value="3">Wednesdays</option>
                            <option value="4">Thursdays</option>
                            <option value="5">Fridays</option>
                            <option value="6">Saturdays</option>
                            <option value="0">Sundays</option>
                        </select>
                        <select
                            id="bulk-status"
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-md focus:ring-gray-500 focus:border-gray-500 block p-2"
                        >
                            <option value="0">Available</option>
                            <option value="1">Prefer Not</option>
                            <option value="2">Strongly No</option>
                        </select>
                        <button
                            onClick={async () => {
                                const day = parseInt((document.getElementById('bulk-day') as HTMLSelectElement).value);
                                const status = parseInt((document.getElementById('bulk-status') as HTMLSelectElement).value);

                                if (confirm(`Apply this preference to all selected days?`)) {
                                    await import('@/app/actions').then(mod => mod.bulkApplyPreference(day, status));
                                    window.location.reload();
                                }
                            }}
                            className="text-gray-600 hover:text-gray-900 font-medium text-sm px-3 py-2 rounded hover:bg-gray-100 transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                    <div className="h-6 w-px bg-gray-200 mx-2"></div>
                    <button
                        onClick={handleReset}
                        className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-2 rounded hover:bg-red-50 transition-colors"
                    >
                        Reset All
                    </button>
                </div>
            </div>

            <Calendar
                initialPreferences={preferences}
                events={events}
                onPreferenceChange={handlePreferenceChange}
            />
        </div>
    );
}
