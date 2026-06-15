import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, magicLink } from "better-auth/plugins";
import * as schema from "./database/schema";
import { getDb } from "./database";

type Auth = ReturnType<typeof betterAuth>;

let _auth: Auth | null = null;

function generateReferralCode(name: string, id: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  const suffix = id.slice(-4).toUpperCase();
  return `${prefix}${suffix}`;
}

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
      socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        } : {}),
      },
      secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-me",
      trustedOrigins: (request: Request) => {
        const origin = request?.headers.get("origin");
        return origin ? [origin, "*"] : ["*"];
      },
      plugins: [
        bearer(),
        magicLink({
          sendMagicLink: async ({ email, token, url }) => {
            try {
              const { sendEmail } = await import("./services/email");
              await sendEmail({
                to: email,
                subject: "Your Safe Refer sign-in link",
                html: `
                  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
                      <div style="width:36px;height:36px;background:#0EA5E9;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                        <span style="color:#fff;font-weight:900;font-size:14px;">SR</span>
                      </div>
                      <span style="font-weight:700;font-size:18px;color:#0f172a;">Safe Refer</span>
                    </div>
                    <h2 style="color:#0f172a;margin:0 0 8px;">Your sign-in link</h2>
                    <p style="color:#64748b;margin:0 0 24px;">Click below to sign in. This link expires in 10 minutes and can only be used once.</p>
                    <a href="${url}" style="display:inline-block;background:#0EA5E9;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Sign In to Safe Refer</a>
                    <p style="color:#94a3b8;font-size:12px;margin-top:28px;">If you didn't request this, ignore this email.</p>
                  </div>
                `,
              });
            } catch (e) {
              console.error("[auth] Failed to send magic link:", e);
            }
          },
        }),
      ],
      databaseHooks: {
        user: {
          create: {
            async after(user: { email: string; name: string; id: string }) {
              const referralCode = generateReferralCode(user.name, user.id);
              try {
                await db.insert(schema.users).values({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  emailVerified: false,
                  role: "affiliate",
                  isAdmin: false,
                  applicationStatus: "incomplete",
                  referralCode,
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
                  subject: "Welcome to Safe Refer",
                  html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
                        <div style="width:36px;height:36px;background:#0EA5E9;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                          <span style="color:#fff;font-weight:900;font-size:14px;">SR</span>
                        </div>
                        <span style="font-weight:700;font-size:18px;color:#0f172a;">Safe Refer</span>
                      </div>
                      <h2 style="color:#0f172a;margin:0 0 8px;">Welcome, ${user.name}</h2>
                      <p style="color:#64748b;margin:0 0 24px;">Your account is ready. Complete your profile to get started.</p>
                      <a href="${process.env.WEBSITE_URL || process.env.BETTER_AUTH_URL}/onboarding" style="display:inline-block;background:#0EA5E9;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Complete Your Profile</a>
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

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth() as object, prop, receiver);
  },
});
