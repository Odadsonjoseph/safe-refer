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
                subject: "Your Referrd sign-in link",
                html: `
                  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
                      <div style="width:36px;height:36px;background:#87CEEB;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                        <span style="color:#fff;font-weight:900;font-size:16px;">R</span>
                      </div>
                      <span style="font-weight:800;font-size:20px;color:#0f172a;letter-spacing:-0.5px;">Referrd</span>
                    </div>
                    <h2 style="color:#0f172a;margin:0 0 8px;">Your sign-in link</h2>
                    <p style="color:#64748b;margin:0 0 24px;">Click below to sign in to Referrd. This link expires in 10 minutes and can only be used once.</p>
                    <a href="${url}" style="display:inline-block;background:#87CEEB;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Sign in to Referrd</a>
                    <p style="color:#94a3b8;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
                  </div>
                `,
              });
            } catch (e) {
              console.error("[magic-link] Email failed:", e);
            }
          },
        }),
      ],
      databaseHooks: {
        user: {
          create: {
            after: async (user: any) => {
              try {
                const db = getDb();
                const { eq } = await import("drizzle-orm");
                const referralCode = generateReferralCode(user.name || "user", user.id);
                await db
                  .update(schema.users)
                  .set({ referralCode })
                  .where(eq(schema.users.id, user.id));
              } catch (e) {
                console.error("[auth hook] referral code gen failed:", e);
              }
            },
          },
        },
      },
    });
  }
  return _auth;
}
