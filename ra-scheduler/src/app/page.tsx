import { getPreferences, getCurrentUser } from './actions';
import Calendar from '@/components/Calendar';
import { logout } from './login/actions';
import Link from 'next/link';

export default async function Dashboard() {
  const preferences = await getPreferences();
  const user = await getCurrentUser();

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

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
          <p className="text-sm text-blue-700">
            <strong>Instructions:</strong> Click on dates to toggle your preference.
            <br />
            Click once for <span className="bg-yellow-200 px-1">Prefer Not</span> (Yellow),
            twice for <span className="bg-red-200 px-1">Cannot</span> (Red),
            and again to clear (Available).
          </p>
        </div>

        <Calendar initialPreferences={preferences} />
      </div>
    </div>
  );
}
