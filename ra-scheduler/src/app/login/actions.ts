'use server'

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

export async function login(formData: FormData) {
    const netid = formData.get('netid') as string;
    const name = formData.get('name') as string;

    if (!netid || !name) {
        throw new Error('NetID and Name are required');
    }

    // Check if user exists, if not create
    const userResult = await sql`SELECT * FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];

    if (!user) {
        const countResult = await sql`SELECT count(*) as count FROM users`;
        const userCount = parseInt(countResult.rows[0].count);
        const role = userCount === 0 ? 'admin' : 'user';

        await sql`INSERT INTO users (netid, name, role) VALUES (${netid}, ${name}, ${role})`;
    } else {
        // Update name if changed
        await sql`UPDATE users SET name = ${name} WHERE netid = ${netid}`;
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
