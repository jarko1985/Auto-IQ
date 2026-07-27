import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { db } from "@/lib/db";
import { verifyCredentials, activateOAuthUser, refreshSessionRole } from "@/features/auth/service";
import { loginSchema } from "@/features/auth/schemas";
import { createAuditLog } from "@/features/auth/repository";
import { shouldRefreshSessionRole } from "@/features/auth/session-refresh";
import type { RoleName, UserStatus } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  // Required outside `next dev`/Vercel — Auth.js otherwise rejects the Host
  // header on a self-hosted production build (`npm start`) with UntrustedHost.
  trustHost: true,

  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const user = await verifyCredentials(parsed.data);
          // Credentials provider must return an object matching the User type
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            status: user.status,
            role: user.role,
          };
        } catch {
          return null;
        }
      },
    }),

    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: false,
    }),

    // Apple requires Apple Developer enrollment — configured but not active yet
    Apple({
      clientId: process.env.AUTH_APPLE_ID ?? "com.autoiq.placeholder",
      clientSecret: process.env.AUTH_APPLE_SECRET ?? "placeholder",
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = (user.role as RoleName | undefined) ?? "CUSTOMER";

        if (account?.provider === "google" && token.id) {
          // Google already verified this email — the adapter-created row still has
          // Prisma's PENDING_VERIFICATION default until we activate it here. Doing
          // this in the jwt callback (not the signIn event) guarantees the very
          // first token issued for this login is already correct.
          await activateOAuthUser(token.id);
          token.status = "ACTIVE";
        } else {
          token.status = (user.status as UserStatus) ?? "PENDING_VERIFICATION";
        }
        token.roleCheckedAt = Date.now();
        return token;
      }

      // Not a fresh sign-in — periodically re-check role/status from the DB so
      // changes (suspension, org-role change, vendor/garage approval) reach an
      // already-signed-in session without forcing a full re-login.
      const dueForRecheck = shouldRefreshSessionRole(token.roleCheckedAt, Date.now());
      if (token.id && (trigger === "update" || dueForRecheck)) {
        const fresh = await refreshSessionRole(token.id);
        if (fresh) {
          token.role = fresh.role;
          token.status = fresh.status;
        }
        token.roleCheckedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.status = token.status as UserStatus;
      session.user.role = token.role as RoleName;
      return session;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      if (!user.id) return;
      await createAuditLog({
        userId: user.id,
        action: isNewUser ? "AUTH_REGISTER" : "AUTH_LOGIN",
      }).catch(() => void 0);
    },

    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.id) {
        await createAuditLog({
          userId: token.id as string,
          action: "AUTH_LOGOUT",
        }).catch(() => void 0);
      }
    },
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
    newUser: "/post-login",
    verifyRequest: "/verify-email",
  },
});
