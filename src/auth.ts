import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, account, trigger, session: updateData }) {
      // Client called useSession().update({ ... }) — merge the new values into the token
      if (trigger === "update" && updateData) {
        if ("name" in updateData) token.name = updateData.name ?? token.name;
      }

      // Initial sign-in
      if (user && account) {
        if (account.provider === "google") {
          // Find or create user from Google profile
          let dbUser = await db.user.findUnique({ where: { email: token.email! } });
          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                email: token.email!,
                name: token.name ?? null,
                image: token.picture ?? null,
                googleId: account.providerAccountId,
              },
            });
          } else if (!dbUser.googleId) {
            dbUser = await db.user.update({
              where: { id: dbUser.id },
              data: { googleId: account.providerAccountId },
            });
          }
          token.id = dbUser.id;
        } else {
          token.id = user.id;
        }
        // Drop picture from the token — Google image URLs are long and bloat the cookie.
        // The layout fetches the image from the DB on each render anyway.
        delete token.picture;
      }
      return token;
    },

    session({ session, token }) {
      if (token.id && session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
