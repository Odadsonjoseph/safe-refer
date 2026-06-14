import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import * as schema from "./database/schema";
import { getDb } from "./database";

type Auth = ReturnType<typeof betterAuth>;

// Lazy singleton — betterAuth() + drizzleAdapter() are expensive; don't init at module load
let _auth: Auth | null = null;

export function getAuth(): Auth {
  if (!_auth) {
    const db = getDb();

    _auth = betterAuth({
      basePath: "/api/auth",
      baseURL: process.env.BETTER_AUTH_URL || process.env.WEBSITE_URL,
      database: drizzleAdapter(db, { provider: "pg" }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-me",
      trustedOrigins: (request: Request) => {
        const origin = request?.headers.get("origin");
        return origin ? [origin, "*"] : ["*"];
      },
      plugins: [bearer()],
      databaseHooks: {
        user: {
          create: {
            async after(user: { email: string; name: string; id: string }) {
              try {
                await db.insert(schema.users).values({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  emailVerified: false,
                  role: "referrer",
                  isAdmin: false,
                  applicationStatus: "incomplete",
                  payoutEnabled: false,
                  w9Completed: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }).onConflictDoNothing();
              } catch (e) {
                console.error("[auth] Failed to create user profile:", e);
              }

              try {
                const { sendEmail } = await import("./services/email");
                await sendEmail({
                  to: user.email,
                  subject: "Welcome to Safe Refer!",
                  html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                      <h2 style="color: #0EA5E9;">Welcome to Safe Refer</h2>
                      <p>Hi ${user.name},</p>
                      <p>Your account is ready. Complete your profile to start submitting referrals and earning money.</p>
                      <a href="${process.env.WEBSITE_URL || process.env.BETTER_AUTH_URL}/onboarding" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Complete Your Profile</a>
                    </div>
                  `,
                });
              } catch (e) {
                console.error("[auth] Failed to send welcome email:", e);
              }
            },
          },
        },
      },
    });
  }
  return _auth;
}

// Typed proxy for backward-compatible `auth` named export
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth() as object, prop, receiver);
  },
});
