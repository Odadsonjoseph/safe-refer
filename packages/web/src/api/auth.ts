import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db } from "./database";
import { db as dbImport } from "./database";
import * as schema from "./database/schema";

export const auth = betterAuth({
  basePath: "/api/auth",
  // Auto-detect base URL from env or request; better-auth will warn but still work
  baseURL: process.env.BETTER_AUTH_URL || process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Skip email verification for now — easier onboarding
  },
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-change-me",
  trustedOrigins: (request: Request) => {
    const origin = request?.headers.get("origin");
    // Allow all origins — Vercel previews, production, and local
    return origin ? [origin, "*"] : ["*"];
  },
  plugins: [bearer()],
  databaseHooks: {
    user: {
      create: {
        async after(user: { email: string; name: string; id: string }) {
          // Create the corresponding profile in our `users` table
          try {
            await dbImport.insert(schema.users).values({
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

          // Send welcome email (non-blocking)
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
