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
            <div className="bg-white p-4 rounded-lg shadow mb-8 flex justify-around text-center">
                <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.userCount}</div>
                    <div className="text-sm text-gray-500">Total RAs</div>
                </div>
                <div>
                    <div className={clsx("text-2xl font-bold", availWeekday >= stats.weekdayTarget ? "text-green-600" : "text-red-600")}>
                        {availWeekday} / {stats.weekdayTarget}
                    </div>
                    <div className="text-sm text-gray-500">Available Weekday (Target)</div>
                </div>
                <div>
                    <div className={clsx("text-2xl font-bold", availWeekend >= stats.weekendTarget ? "text-green-600" : "text-red-600")}>
                        {availWeekend} / {stats.weekendTarget}
                    </div>
                    <div className="text-sm text-gray-500">Available Weekend (Target)</div>
                </div>
            </div>

            <div className="flex justify-between items-center bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                <p className="text-sm text-blue-700">
                    <strong>Instructions:</strong> Hover over dates to select your preference:
                    <span className="inline-block w-3 h-3 bg-white border ml-2 mr-1"></span>Available
                    <span className="inline-block w-3 h-3 bg-yellow-200 ml-2 mr-1"></span>Prefer Not
                    <span className="inline-block w-3 h-3 bg-orange-300 ml-2 mr-1"></span>Strongly Prefer Not
                    <span className="inline-block w-3 h-3 bg-red-400 ml-2 mr-1"></span>Excused
                </p>
                <button
                    onClick={handleReset}
                    className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 bg-white px-3 py-1 rounded transition-colors"
                >
                    Reset All Preferences
                </button>
            </div>

            <Calendar
                initialPreferences={preferences}
                events={events}
                onPreferenceChange={handlePreferenceChange}
            />
        </div>
    );
}
