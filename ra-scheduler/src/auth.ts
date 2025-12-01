import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import sql from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [Google],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user.email?.endsWith("@duke.edu")) {
                return false // Block non-Duke emails
            }

            // Extract netid
            const netid = user.email.split("@")[0];

            // Check/Create user in DB
            try {
                const userResult = await sql`SELECT * FROM users WHERE netid = ${netid}`;
                const existingUser = userResult.rows[0];

                if (!existingUser) {
                    const countResult = await sql`SELECT count(*) as count FROM users`;
                    const userCount = parseInt(countResult.rows[0].count);
                    const role = userCount === 0 ? 'admin' : 'user';
                    const name = user.name || netid;

                    await sql`INSERT INTO users (netid, name, email, role) VALUES (${netid}, ${name}, ${user.email}, ${role})`;
                } else {
                    // Update email/name if needed
                    if (existingUser.email !== user.email || existingUser.name !== user.name) {
                        await sql`UPDATE users SET email = ${user.email}, name = ${user.name} WHERE netid = ${netid}`;
                    }
                }
            } catch (e) {
                console.error("Error in signIn callback:", e);
                return false;
            }

            return true
        },
        async session({ session, token }) {
            if (session.user?.email) {
                // Add netid to session
                const netid = session.user.email.split("@")[0];
                // @ts-ignore
                session.user.netid = netid;

                // Fetch role/team from DB to add to session?
                // For now, just netid is enough to look up things in actions.
            }
            return session
        },
    },
})
