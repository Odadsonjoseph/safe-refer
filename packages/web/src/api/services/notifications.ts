/**
 * Notifications service — Expo push + Resend email
 * Every state change fires both. Import sendNotification() anywhere.
 */
import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { sendEmail } from "./email";

let _expo: Expo | null = null;
function getExpo() {
  if (!_expo) _expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  return _expo;
}

// ─── Core push sender ────────────────────────────────────────────────────────
export async function sendPush(
  pushToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!pushToken) return;
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn("[push] Invalid Expo push token:", pushToken);
    return;
  }
  try {
    const expo = getExpo();
    const messages: ExpoPushMessage[] = [
      { to: pushToken, sound: "default", title, body, data: data ?? {} },
    ];
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          console.error("[push] Error ticket:", ticket.message, ticket.details);
        }
      }
    }
  } catch (e) {
    console.error("[push] Failed to send push:", e);
  }
}

// ─── Combined: push + email ───────────────────────────────────────────────────
interface NotifyOptions {
  pushToken?: string | null;
  email?: string | null;
  emailTemplate?: { subject: string; html: string };
  push: { title: string; body: string; data?: Record<string, unknown> };
}

export async function sendNotification(opts: NotifyOptions) {
  const tasks: Promise<any>[] = [];

  if (opts.pushToken) {
    tasks.push(sendPush(opts.pushToken, opts.push.title, opts.push.body, opts.push.data));
  }

  if (opts.email && opts.emailTemplate) {
    tasks.push(
      sendEmail({ to: opts.email, ...opts.emailTemplate }).catch((e) =>
        console.error("[notify] Email failed:", e)
      )
    );
  }

  await Promise.allSettled(tasks);
}

// ─── Notification templates ───────────────────────────────────────────────────

export const notifyTemplates = {
  // ── Application ────────────────────────────────────────────────────────────
  applicationApproved: (userName: string) => ({
    push: { title: "You're approved! 🎉", body: "Your Referrd application has been approved. Start browsing offers now." },
  }),

  applicationRejected: (userName: string, reason?: string) => ({
    push: {
      title: "Application Update",
      body: reason ? `Your application was not approved: ${reason}` : "Your Referrd application was not approved.",
    },
  }),

  // ── Submission (affiliate view) ────────────────────────────────────────────
  leadSubmitted: (leadName: string, listingTitle: string) => ({
    push: { title: "Lead Submitted ✅", body: `Your lead ${leadName} was submitted for "${listingTitle}".`, data: { screen: "submissions" } },
  }),

  leadAccepted: (leadName: string, depositAmount: number) => ({
    push: {
      title: "Lead Accepted 🎯",
      body: `${leadName} was accepted! A $${depositAmount.toFixed(2)} deposit has been secured for you.`,
      data: { screen: "submissions" },
    },
  }),

  leadRejected: (leadName: string) => ({
    push: { title: "Lead Update", body: `${leadName} was not accepted this time.`, data: { screen: "submissions" } },
  }),

  leadClosed: (leadName: string, finalAmount: number) => ({
    push: {
      title: "Deal Closed 🤝",
      body: `${leadName} deal closed. Final payment of $${finalAmount.toFixed(2)} is due within 48 hours.`,
      data: { screen: "submissions" },
    },
  }),

  payoutTransferred: (amount: number, leadName: string) => ({
    push: {
      title: "You've been paid! 💰",
      body: `$${amount.toFixed(2)} transferred to your Stripe account for ${leadName}.`,
      data: { screen: "earnings" },
    },
  }),

  forfeitReceived: (amount: number, leadName: string) => ({
    push: {
      title: "Forfeit Payment Received 🛡️",
      body: `Business missed the deadline for ${leadName}. $${amount.toFixed(2)} deposited to your account.`,
      data: { screen: "earnings" },
    },
  }),

  // ── Submission (business view) ─────────────────────────────────────────────
  newLeadIncoming: (listingTitle: string) => ({
    push: { title: "New Lead Submitted 📩", body: `A new lead was submitted for your offer "${listingTitle}". Review it now.`, data: { screen: "incoming" } },
  }),

  paymentDeadlineReminder: (leadName: string, hoursLeft: number) => ({
    push: {
      title: "Payment Deadline Reminder ⚠️",
      body: `You have ${hoursLeft}h left to pay for ${leadName} before the deposit forfeits.`,
      data: { screen: "submissions" },
    },
  }),

  depositReceived: (leadName: string) => ({
    push: { title: "Deposit Confirmed", body: `Deposit for ${leadName} received. Contact info is now unlocked.`, data: { screen: "incoming" } },
  }),
};
