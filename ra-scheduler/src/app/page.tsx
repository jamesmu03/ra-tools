import { getPreferences, getCurrentUser, getEvents, getShiftStats } from './actions';
import DashboardClient from '@/components/DashboardClient';
import { logout } from './login/actions';
import Link from 'next/link';
import clsx from 'clsx';

export default async function Dashboard() {
  const preferences = await getPreferences();
  const user = await getCurrentUser();
  const events = await getEvents();
  const stats = await getShiftStats();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RA Scheduler</h1>
            <p className="text-gray-600">Welcome, {user?.name} ({user?.netid})</p>
          </div>
          <div className="flex gap-4">
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

        <DashboardClient
          initialPreferences={preferences}
          events={events}
          stats={stats}
          user={user}
        />
      </div>
    </div>
  );
}
