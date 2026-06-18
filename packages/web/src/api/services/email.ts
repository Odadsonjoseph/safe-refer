import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, text, html, replyTo }: SendEmailOptions) {
  const payload: any = {
    from: "Referrd <refer@safesky.my>",
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(replyTo ? { replyTo } : {}),
  };
  const { data, error } = await getResend().emails.send(payload);
  if (error) throw new Error(`Email failed: ${error.message}`);
  return data;
}

const brand = `
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px;">
    <div style="width:36px;height:36px;background:#87CEEB;border-radius:8px;display:flex;align-items:center;justify-content:center;">
      <span style="color:#fff;font-weight:900;font-size:16px;letter-spacing:-1px;">R</span>
    </div>
    <span style="font-weight:800;font-size:20px;color:#0f172a;letter-spacing:-0.5px;">Referrd</span>
  </div>
`;

export function applicationStatusEmail(userName: string, status: "approved" | "rejected") {
  if (status === "approved") {
    return {
      subject: "You're approved on Referrd! 🎉",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          ${brand}
          <h2 style="color:#0f172a;margin:0 0 8px;">You're approved!</h2>
          <p style="color:#64748b;">Hi ${userName},</p>
          <p style="color:#64748b;">Great news — your Referrd application has been approved. You can now browse listings and start submitting referrals.</p>
          <a href="${process.env.WEBSITE_URL}/dashboard" style="display:inline-block;background:#87CEEB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Go to Dashboard</a>
        </div>
      `,
    };
  }
  return {
    subject: "Referrd application update",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        ${brand}
        <h2 style="color:#0f172a;margin:0 0 8px;">Application Update</h2>
        <p style="color:#64748b;">Hi ${userName},</p>
        <p style="color:#64748b;">After review, we're unable to approve your application at this time. Please contact us if you have questions.</p>
      </div>
    `,
  };
}

export function submissionStatusEmail(referrerName: string, leadName: string, status: string) {
  return {
    subject: `Your referral for ${leadName} has been ${status}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        ${brand}
        <h2 style="color:#0f172a;">Referral Update</h2>
        <p style="color:#64748b;">Hi ${referrerName},</p>
        <p style="color:#64748b;">Your referral for <strong>${leadName}</strong> has been <strong>${status}</strong>.</p>
        <a href="${process.env.WEBSITE_URL}/submissions" style="display:inline-block;background:#87CEEB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View Details</a>
      </div>
    `,
  };
}

export function depositPaidEmail(affiliateName: string, leadName: string, depositAmount: number, listingTitle: string) {
  return {
    subject: `Deposit received for your lead — ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        ${brand}
        <h2 style="color:#0f172a;">Deposit Secured</h2>
        <p style="color:#64748b;">Hi ${affiliateName},</p>
        <p style="color:#64748b;">Great news! The business has accepted your lead <strong>${leadName}</strong> for <em>${listingTitle}</em> and paid a $${depositAmount.toFixed(2)} deposit. Your full payout is secured — you'll receive the remainder once the deal closes.</p>
        <a href="${process.env.WEBSITE_URL}/submissions" style="display:inline-block;background:#87CEEB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View Lead Status</a>
      </div>
    `,
  };
}

export function payoutTransferredEmail(affiliateName: string, leadName: string, amount: number) {
  return {
    subject: `You've been paid $${amount.toFixed(2)} for ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        ${brand}
        <h2 style="color:#16a34a;">Payment Transferred 🎉</h2>
        <p style="color:#64748b;">Hi ${affiliateName},</p>
        <p style="color:#64748b;"><strong>$${amount.toFixed(2)}</strong> has been transferred to your Stripe account for the lead <strong>${leadName}</strong>. It should appear within 1–2 business days.</p>
        <a href="${process.env.WEBSITE_URL}/earnings" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View Earnings</a>
      </div>
    `,
  };
}

export function forfeitEmail(affiliateName: string, leadName: string, amount: number) {
  return {
    subject: `Forfeit payment received — ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        ${brand}
        <h2 style="color:#0f172a;">Forfeit Protection Activated</h2>
        <p style="color:#64748b;">Hi ${affiliateName},</p>
        <p style="color:#64748b;">The business missed their 48-hour payment deadline for <strong>${leadName}</strong>. Per our default protection policy, the $${amount.toFixed(2)} deposit has been automatically transferred to your account.</p>
        <a href="${process.env.WEBSITE_URL}/earnings" style="display:inline-block;background:#87CEEB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View Earnings</a>
      </div>
    `,
  };
}

export function closedDeadlineReminderEmail(businessName: string, leadName: string, hoursLeft: number) {
  return {
    subject: `⚠️ ${hoursLeft}h left to pay for ${leadName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        ${brand}
        <h2 style="color:#d97706;">Payment Deadline Approaching</h2>
        <p style="color:#64748b;">Hi ${businessName},</p>
        <p style="color:#64748b;">You have <strong>${hoursLeft} hours</strong> remaining to complete payment for the closed lead <strong>${leadName}</strong>. If payment is not received, the deposit will be automatically forfeited to the affiliate.</p>
        <a href="${process.env.WEBSITE_URL}/submissions" style="display:inline-block;background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Pay Now</a>
      </div>
    `,
  };
}
