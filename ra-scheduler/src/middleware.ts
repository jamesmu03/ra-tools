import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const netid = request.cookies.get('netid');

    // Check for various Shibboleth headers used by Duke
    const remoteUser = request.headers.get('remote-user');
    const uid = request.headers.get('uid');
    const eppn = request.headers.get('eppn');

    // Determine the authenticated user from headers
    let shibUser = remoteUser || uid;
    if (!shibUser && eppn) {
        shibUser = eppn.split('@')[0];
    }

    // Shibboleth Auto-Login
    if (shibUser) {
        // If no cookie, or cookie doesn't match header (user switched?), sync via API
        if (!netid || netid.value !== shibUser) {
            // Rewrite to API to handle DB logic (middleware cannot write to DB directly)
            return NextResponse.rewrite(new URL('/api/shibboleth', request.url));
        }
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Production Security: Block Mock Login
    if (isProduction && !shibUser && !netid) {
        return new NextResponse('Access Denied: Shibboleth Authentication Required. Please ensure this application is protected by Shibboleth.', { status: 403 });
    }

    if (!netid && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/api/shibboleth')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (netid && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Block direct access to /login in production even if not logged in (handled above, but for clarity)
    if (isProduction && request.nextUrl.pathname.startsWith('/login')) {
        return new NextResponse('Mock Login Disabled in Production', { status: 403 });
    }

    if (netid && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Onboarding Check
    // We cannot access DB in middleware.
    // We need to rely on a cookie or an API call.
    // Let's use an API call to check onboarding status if user is logged in.
    // OR, we can set a cookie 'onboarding_completed' when they finish onboarding.
    // But cookies can be manipulated.
    // Better approach: The /api/shibboleth route should check onboarding and redirect accordingly?
    // Actually, middleware runs on every request.
    // Let's add a lightweight API route /api/check-onboarding that returns status?
    // No, that adds latency.
    // Let's assume for now we can't easily check DB in middleware.
    // Alternative: When user hits /, we check in the Page component and redirect if needed?
    // Yes, doing it in the Page component (Server Component) is safer and easier.

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
