'use client';

import { useState, useEffect } from 'react';
import { triggerScheduleGeneration, getScheduleData, getAllUsers, downloadScheduleCSV } from './actions';
import Link from 'next/link';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const u = await getAllUsers();
        setUsers(u as any[]);
        const s = await getScheduleData();
        setSchedule(s as any[]);
    };

    const handleGenerate = async () => {
        setLoading(true);
        await triggerScheduleGeneration();
        await loadData();
        setLoading(false);
    };

    const handleDownload = async () => {
        const csv = await downloadScheduleCSV();
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ra-schedule.csv';
        a.click();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <Link href="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Team Members */}
                    <div className="bg-white p-6 rounded-lg shadow col-span-1">
                        <h2 className="text-xl font-semibold mb-4">Team Members ({users.length})</h2>
                        <ul className="space-y-2 max-h-96 overflow-y-auto">
                            {users.map(u => (
                                <li key={u.id} className="p-2 border-b last:border-0">
                                    <div className="font-medium">{u.name}</div>
                                    <div className="text-sm text-gray-500">{u.netid}</div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Schedule Controls & Preview */}
                    <div className="bg-white p-6 rounded-lg shadow col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Schedule</h2>
                            <div className="space-x-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                                >
                                    {loading ? 'Generating...' : 'Generate Schedule'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={schedule.length === 0}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                                >
                                    Download CSV
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {schedule.length === 0 ? (
                                        <tr><td colSpan={3} className="p-4 text-center text-gray-500">No schedule generated yet.</td></tr>
                                    ) : (
                                        schedule.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {row.type === 'weekday' && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Weekday</span>}
                                                    {row.type === 'weekend_pri' && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Weekend Pri</span>}
                                                    {row.type === 'weekend_sec' && <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">Weekend Sec</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name || 'Unassigned'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
