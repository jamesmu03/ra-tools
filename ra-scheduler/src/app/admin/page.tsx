'use client';

import { useState, useEffect } from 'react';
import { triggerScheduleGeneration, getScheduleData, getAllUsers, downloadScheduleCSV, inviteRAs, getEvents, addEvent, removeEvent, updateHandicap, assignShift, getShiftCounts } from './actions';
import AdminCalendar from '@/components/AdminCalendar';
import Link from 'next/link';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [shiftCounts, setShiftCounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Forms
    const [inviteText, setInviteText] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventName, setNewEventName] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const u = await getAllUsers();
        setUsers(u as any[]);
        const s = await getScheduleData();
        setSchedule(s as any[]);
        const e = await getEvents();
        setEvents(e as any[]);
        const c = await getShiftCounts();
        setShiftCounts(c as any[]);
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

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteText) return;
        await inviteRAs(inviteText);
        setInviteText('');
        await loadData();
        alert('Invites sent (mock)!');
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventDate || !newEventName) return;
        await addEvent(newEventDate, newEventName);
        setNewEventDate('');
        setNewEventName('');
        await loadData();
    };

    const handleRemoveEvent = async (id: number) => {
        await removeEvent(id);
        await loadData();
    }

    const handleHandicapChange = async (userId: number, newValue: string) => {
        const val = parseInt(newValue);
        if (isNaN(val)) return;
        await updateHandicap(userId, val);
        await loadData();
    }

    const handleAssign = async (date: string, type: string, userId: number, locked: boolean) => {
        await assignShift(date, type, userId, locked);
        await loadData();
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <Link href="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Team & Invites */}
                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4">Invite RAs</h2>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Emails (one per line or comma separated)</label>
                                    <textarea
                                        value={inviteText}
                                        onChange={e => setInviteText(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                                        rows={4}
                                        placeholder="netid1@duke.edu, netid2@duke.edu"
                                    />
                                </div>
                                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Send Invites
                                </button>
                            </form>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold">Team Members ({users.length})</h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Handicap: <span className="font-bold text-green-600">+ (More Shifts)</span> / <span className="font-bold text-red-600">- (Fewer Shifts)</span>
                                </p>
                            </div>
                            <div className="">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / NetID</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Counts</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Handicap</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users.map(u => {
                                            const counts = shiftCounts.find(c => c.id === u.id) || { weekday: 0, weekendPri: 0, weekendSec: 0 };
                                            return (
                                                <tr key={u.id}>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                                        <div className="text-xs text-gray-500">{u.netid}</div>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div className="text-xs space-y-1">
                                                            <div className="text-blue-800"><span className="font-semibold">Weekday:</span> {counts.weekday || 0}</div>
                                                            <div className="text-purple-800"><span className="font-semibold">Weekend Pri:</span> {counts.weekendPri || 0}</div>
                                                            <div className="text-pink-800"><span className="font-semibold">Weekend Sec:</span> {counts.weekendSec || 0}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                                        <input
                                                            type="number"
                                                            value={u.handicap || 0}
                                                            onChange={(e) => handleHandicapChange(u.id, e.target.value)}
                                                            className="w-16 border rounded p-1 text-sm text-right"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Column 2 & 3: Events & Schedule */}
                    <div className="col-span-1 lg:col-span-2 space-y-8">
                        {/* Events Management */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4">Manage Events</h2>
                            <div className="flex gap-4 mb-4">
                                <input
                                    type="date"
                                    value={newEventDate}
                                    onChange={e => setNewEventDate(e.target.value)}
                                    className="border p-2 rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Event Name (e.g. LDOC)"
                                    value={newEventName}
                                    onChange={e => setNewEventName(e.target.value)}
                                    className="border p-2 rounded flex-1"
                                />
                                <button onClick={handleAddEvent} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Add</button>
                            </div>
                            <ul className="space-y-2">
                                {events.map(ev => (
                                    <li key={ev.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span><strong>{ev.date}</strong>: {ev.name}</span>
                                        <button onClick={() => handleRemoveEvent(ev.id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                                    </li>
                                ))}
                                {events.length === 0 && <p className="text-gray-500 text-sm">No events added.</p>}
                            </ul>
                        </div>

                        {/* Schedule */}
                        <div className="bg-white p-6 rounded-lg shadow">
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

                            {/* Graphical Schedule View */}
                            {schedule.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
                                    No schedule generated yet. Click "Generate Schedule" to start.
                                </div>
                            ) : (
                                <AdminCalendar schedule={schedule} users={users} onAssign={handleAssign} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
