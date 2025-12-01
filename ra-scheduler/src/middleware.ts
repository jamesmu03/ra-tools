import { auth } from "@/auth"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnLoginPage = req.nextUrl.pathname.startsWith('/login')
    const isOnPublicApi = req.nextUrl.pathname.startsWith('/api/auth')

    if (isOnPublicApi) return;

    if (isOnLoginPage) {
        if (isLoggedIn) {
            return Response.redirect(new URL('/', req.nextUrl))
        }
        return
    }

    if (!isLoggedIn) {
        return Response.redirect(new URL('/login', req.nextUrl))
    }
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
