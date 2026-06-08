import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, text, html, replyTo }: SendEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: "Safe Refer <refer@safesky.my>",
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    replyTo,
  });

  if (error) throw new Error(`Email failed: ${error.message}`);
  return data;
}

export function applicationStatusEmail(userName: string, status: "approved" | "rejected") {
  if (status === "approved") {
    return {
      subject: "You're approved on Safe Refer! 🎉",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:#0EA5E9;">You're approved!</h2>
          <p>Hi ${userName},</p>
          <p>Great news — your Safe Refer application has been approved. You can now browse listings and start submitting referrals.</p>
          <a href="${process.env.WEBSITE_URL}" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
        </div>
      `,
    };
  }
  return {
    subject: "Safe Refer application update",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#0F172A;">Application Update</h2>
        <p>Hi ${userName},</p>
        <p>After review, we're unable to approve your application at this time. Please contact us if you have questions.</p>
      </div>
    `,
  };
}

export function submissionStatusEmail(referrerName: string, leadName: string, status: string) {
  return {
    subject: `Your referral for ${leadName} has been ${status}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#0EA5E9;">Referral Update</h2>
        <p>Hi ${referrerName},</p>
        <p>Your referral for <strong>${leadName}</strong> has been <strong>${status}</strong>.</p>
        <a href="${process.env.WEBSITE_URL}" style="display:inline-block;background:#0EA5E9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Details</a>
      </div>
    `,
  };
}
