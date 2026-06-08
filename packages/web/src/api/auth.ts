import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "./database";

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
      try {
        const { sendEmail } = await import("./services/email");
        await sendEmail({
          to: user.email,
          subject: "Verify your Safe Refer email",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #0EA5E9;">Verify your email</h2>
              <p>Hi ${user.name},</p>
              <p>Click the link below to verify your email address:</p>
              <a href="${url}" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
              <p style="color:#94A3B8;font-size:12px;margin-top:24px;">If you didn't create an account, you can ignore this email.</p>
            </div>
          `,
        });
      } catch (e) {
        console.error("[auth] Failed to send verification email:", e);
        // Don't throw — email failure should not block signup
      }
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: (request: Request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [bearer(), expo()],
  databaseHooks: {
    user: {
      create: {
        async after(user: { email: string; name: string; id: string }) {
          try {
            const { sendEmail } = await import("./services/email");
            await sendEmail({
              to: user.email,
              subject: "Welcome to Safe Refer!",
              html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                  <h2 style="color: #0EA5E9;">Welcome to Safe Refer</h2>
                  <p>Hi ${user.name},</p>
                  <p>Your account has been created. Complete your profile to start referring leads and earning money.</p>
                  <a href="${process.env.WEBSITE_URL}/onboarding" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Complete Your Profile</a>
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
