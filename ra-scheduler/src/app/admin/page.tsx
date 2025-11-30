'use client';

import { useState, useEffect } from 'react';
import { triggerScheduleGeneration, getScheduleData, getAllUsers, downloadScheduleCSV, inviteRAs, getEvents, addEvent, removeEvent, updateHandicap, assignShift, getShiftCounts } from './actions';
import { getTeamName } from '../actions';
import AdminCalendar from '@/components/AdminCalendar';
import Link from 'next/link';
import clsx from 'clsx';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [shiftCounts, setShiftCounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [teamName, setTeamName] = useState('RA Scheduler');

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
        const t = await getTeamName();
        setTeamName(t);
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

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...users].sort((a, b) => {
        if (!sortConfig) return 0;

        const countsA = shiftCounts.find(c => c.id === a.id) || { weekday: 0, weekendPri: 0, weekendSec: 0 };
        const countsB = shiftCounts.find(c => c.id === b.id) || { weekday: 0, weekendPri: 0, weekendSec: 0 };

        let valA = 0;
        let valB = 0;

        switch (sortConfig.key) {
            case 'name':
                return sortConfig.direction === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            case 'weekday':
                valA = countsA.weekday || 0;
                valB = countsB.weekday || 0;
                break;
            case 'weekendPri':
                valA = countsA.weekendPri || 0;
                valB = countsB.weekendPri || 0;
                break;
            case 'weekendSec':
                valA = countsA.weekendSec || 0;
                valB = countsB.weekendSec || 0;
                break;
            case 'handicap':
                valA = a.handicap || 0;
                valB = b.handicap || 0;
                break;
            default:
                return 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span className="text-gray-300 ml-1">↕</span>;
        return <span className="text-gray-900 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold text-gray-900">{teamName} <span className="text-gray-400 font-normal">| Admin</span></h1>
                    </div>
                    <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        &larr; Back to Scheduler
                    </Link>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Team & Invites */}
                    <div className="space-y-8">
                        {/* Invite Section */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Invite RAs</h2>
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Emails (comma separated)</label>
                                    <textarea
                                        value={inviteText}
                                        onChange={e => setInviteText(e.target.value)}
                                        className="block w-full border-gray-200 rounded-md text-sm focus:border-gray-400 focus:ring-0 bg-gray-50"
                                        rows={3}
                                        placeholder="netid1@duke.edu, netid2@duke.edu"
                                    />
                                </div>
                                <button type="submit" className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">
                                    Send Invites
                                </button>
                            </form>
                        </div>

                        {/* Team Members */}
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <div className="flex justify-between items-center mb-1">
                                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Team ({users.length})</h2>
                                </div>
                                <p className="text-xs text-gray-500">
                                    <strong>Handicap:</strong> Positive (+) adds shifts, Negative (-) removes shifts.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                        <tr>
                                            <th
                                                className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                                                onClick={() => handleSort('name')}
                                            >
                                                RA <SortIcon column="name" />
                                            </th>
                                            <th
                                                className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 align-bottom"
                                                onClick={() => handleSort('weekday')}
                                            >
                                                Weekday <SortIcon column="weekday" />
                                            </th>
                                            <th
                                                className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 align-bottom"
                                                onClick={() => handleSort('weekendPri')}
                                            >
                                                Weekend<br />Primary <SortIcon column="weekendPri" />
                                            </th>
                                            <th
                                                className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 align-bottom"
                                                onClick={() => handleSort('weekendSec')}
                                            >
                                                Weekend<br />Secondary <SortIcon column="weekendSec" />
                                            </th>
                                            <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider align-bottom">
                                                <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={() => handleSort('handicap')}>
                                                    <span>Handicap</span>
                                                    <SortIcon column="handicap" />
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {sortedUsers.map(u => {
                                            const counts = shiftCounts.find(c => c.id === u.id) || { weekday: 0, weekendPri: 0, weekendSec: 0 };
                                            return (
                                                <tr key={u.id} className="hover:bg-gray-50">
                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                        <div className="text-xs font-medium text-gray-900 truncate max-w-[100px]">{u.name}</div>
                                                        <div className="text-[10px] text-gray-500 truncate max-w-[100px]">{u.netid}</div>
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap text-center">
                                                        <span className="text-xs text-gray-900 font-medium">{counts.weekday || 0}</span>
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap text-center">
                                                        <span className="text-xs text-gray-900 font-medium">{counts.weekendPri || 0}</span>
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap text-center">
                                                        <span className="text-xs text-gray-900 font-medium">{counts.weekendSec || 0}</span>
                                                    </td>
                                                    <td className="px-2 py-2 whitespace-nowrap text-right">
                                                        <input
                                                            type="number"
                                                            value={u.handicap || 0}
                                                            onChange={(e) => handleHandicapChange(u.id, e.target.value)}
                                                            className="w-10 border-gray-200 rounded text-xs text-right focus:border-gray-400 focus:ring-0 p-1 bg-gray-50"
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
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Manage Events</h2>
                            <div className="flex gap-3 mb-6">
                                <input
                                    type="date"
                                    value={newEventDate}
                                    onChange={e => setNewEventDate(e.target.value)}
                                    className="border-gray-200 rounded text-sm focus:border-gray-400 focus:ring-0 bg-gray-50"
                                />
                                <input
                                    type="text"
                                    placeholder="Event Name"
                                    value={newEventName}
                                    onChange={e => setNewEventName(e.target.value)}
                                    className="border-gray-200 rounded text-sm flex-1 focus:border-gray-400 focus:ring-0 bg-gray-50"
                                />
                                <button onClick={handleAddEvent} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors">Add</button>
                            </div>
                            <div className="space-y-2">
                                {events.map(ev => (
                                    <div key={ev.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                        <span className="text-sm text-gray-700"><span className="font-medium text-gray-900">{ev.date}</span>: {ev.name}</span>
                                        <button onClick={() => handleRemoveEvent(ev.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Remove</button>
                                    </div>
                                ))}
                                {events.length === 0 && <p className="text-gray-400 text-sm italic">No events added.</p>}
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Schedule</h2>
                                <div className="space-x-3">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                                    >
                                        {loading ? 'Generating...' : 'Generate'}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        disabled={schedule.length === 0}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        Download CSV
                                    </button>
                                </div>
                            </div>

                            {/* Graphical Schedule View */}
                            {schedule.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                                    No schedule generated yet.
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">Tip</span>
                                        <span>Hold <strong>Ctrl</strong> (or <strong>Cmd</strong>) + Click a day to lock/unlock all shifts.</span>
                                    </p>
                                    <AdminCalendar schedule={schedule} users={users} onAssign={handleAssign} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
