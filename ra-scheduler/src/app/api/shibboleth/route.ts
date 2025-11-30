import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
    // Duke/Shibboleth Headers
    // remote-user: usually set by Apache/Nginx to the NetID
    // eppn: netid@duke.edu
    // uid: netid
    let netid = request.headers.get('remote-user') || request.headers.get('uid');
    const eppn = request.headers.get('eppn');

    // If netid is missing but eppn is present, extract netid from eppn
    if (!netid && eppn) {
        netid = eppn.split('@')[0];
    }

    // Name construction
    let name = request.headers.get('displayName');
    if (!name) {
        const givenName = request.headers.get('givenName');
        const sn = request.headers.get('sn');
        if (givenName && sn) {
            name = `${givenName} ${sn}`;
        } else {
            name = netid; // Fallback
        }
    }

    const email = request.headers.get('mail');

    if (!netid) {
        return NextResponse.json({ error: 'Missing authentication headers (remote-user, uid, or eppn)' }, { status: 401 });
    }

    // Check if user exists, if not create
    const userResult = await sql`SELECT * FROM users WHERE netid = ${netid}`;
    const user = userResult.rows[0];

    if (!user) {
        const countResult = await sql`SELECT count(*) as count FROM users`;
        const userCount = parseInt(countResult.rows[0].count);
        const role = userCount === 0 ? 'admin' : 'user';

        // We don't set team_name here, it will be set during onboarding
        await sql`INSERT INTO users (netid, name, email, role) VALUES (${netid}, ${name}, ${email}, ${role})`;
    } else {
        // Update name/email if changed
        if (user.name !== name || user.email !== email) {
            await sql`UPDATE users SET name = ${name}, email = ${email} WHERE netid = ${netid}`;
        }
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('netid', netid);

    // Redirect to home
    return NextResponse.redirect(new URL('/', request.url));
}
