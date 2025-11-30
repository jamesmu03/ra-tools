'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';

export async function completeOnboarding(formData: FormData) {
    const isRc = formData.get('is_rc') === 'on';
    const teamName = formData.get('team_name') as string;

    const cookieStore = await cookies();
    const netid = cookieStore.get('netid')?.value;

    if (!netid) {
        redirect('/login');
    }

    if (isRc) {
        db.prepare('UPDATE users SET role = ?, team_name = ?, onboarding_completed = 1 WHERE netid = ?').run('admin', teamName, netid);
    } else {
        db.prepare('UPDATE users SET onboarding_completed = 1 WHERE netid = ?').run(netid);
    }

    redirect('/');
}
