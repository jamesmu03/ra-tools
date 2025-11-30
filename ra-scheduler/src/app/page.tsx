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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">{teamName}</h1>
            {user?.role === 'admin' && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium">Admin</span>
            )}
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-gray-600">{user?.name} <span className="text-gray-400">({user?.netid})</span></span>
            {user?.role === 'admin' && (
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 transition-colors">
                Admin Panel
              </Link>
            )}
            <form action={logout}>
              <button className="text-gray-500 hover:text-red-600 transition-colors">
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
