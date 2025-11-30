import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

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
    const user = db.prepare('SELECT * FROM users WHERE netid = ?').get(netid) as any;

    if (!user) {
        const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
        const role = userCount.count === 0 ? 'admin' : 'user';
        db.prepare('INSERT INTO users (netid, name, email, role) VALUES (?, ?, ?, ?)').run(netid, name, email, role);
    } else {
        // Update name/email if changed
        if (user.name !== name || user.email !== email) {
            db.prepare('UPDATE users SET name = ?, email = ? WHERE netid = ?').run(name, email, netid);
        }
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('netid', netid);

    // Redirect to home
    return NextResponse.redirect(new URL('/', request.url));
}
