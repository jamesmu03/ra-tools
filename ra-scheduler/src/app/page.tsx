import { getPreferences, getCurrentUser, getEvents, getShiftStats, getTeamName } from './actions';
import DashboardClient from '@/components/DashboardClient';
import { logout } from './login/actions';
import Link from 'next/link';
import clsx from 'clsx';

import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const preferences = await getPreferences();
  const user = await getCurrentUser();

  if (user && user.onboarding_completed === 0) {
    redirect('/onboarding');
  }

  const events = await getEvents();
  const stats = await getShiftStats();
  const teamName = await getTeamName(); // Fetch team_name

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#00539B] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">{teamName}</h1>
            {user?.role === 'admin' && (
              <span className="bg-blue-800 text-xs px-2 py-1 rounded">Admin</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>{user?.name} ({user?.netid})</span>
            {user?.role === 'admin' && (
              <Link href="/admin" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Admin Panel
              </Link>
            )}
            <form action={logout}>
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardClient
          initialPreferences={preferences}
          events={events}
          stats={stats}
          user={user}
        />
      </div>
    </main>
  );
}
