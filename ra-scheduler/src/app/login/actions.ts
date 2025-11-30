'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import db from '@/lib/db';

export async function login(formData: FormData) {
    const netid = formData.get('netid') as string;
    const name = formData.get('name') as string;

    if (!netid || !name) {
        throw new Error('NetID and Name are required');
    }

    // Check if user exists, if not create
    const user = db.prepare('SELECT * FROM users WHERE netid = ?').get(netid) as any;

    if (!user) {
        const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
        const role = userCount.count === 0 ? 'admin' : 'user';

        db.prepare('INSERT INTO users (netid, name, role) VALUES (?, ?, ?)').run(netid, name, role);
    } else {
        // Update name if changed
        db.prepare('UPDATE users SET name = ? WHERE netid = ?').run(name, netid);
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('netid', netid);

    redirect('/');
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('netid');
    redirect('/login');
}
