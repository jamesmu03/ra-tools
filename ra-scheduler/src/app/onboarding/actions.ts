'use server'

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

export async function completeOnboarding(formData: FormData) {
    const isRc = formData.get('is_rc') === 'on';
    const teamName = formData.get('team_name') as string;

    const session = await auth();
    // @ts-ignore
    const netid = session?.user?.netid;

    if (!netid) {
        redirect('/login');
    }

    if (isRc) {
        await sql`UPDATE users SET role = 'admin', team_name = ${teamName}, onboarding_completed = 1 WHERE netid = ${netid}`;
    } else {
        await sql`UPDATE users SET onboarding_completed = 1 WHERE netid = ${netid}`;
    }

    redirect('/');
}
