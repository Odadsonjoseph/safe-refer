# Referrd Rebrand + Money Flow

## Done
- [x] email.ts — Referrd branding, new email templates (deposit, payout, forfeit, reminder)
- [x] auth.ts — Referrd branding, magic link email
- [x] stripe.ts — /deposit/:id (25%), /final/:id (75%) endpoints
- [x] webhooks.ts — deposit webhook → accept+blur unlock; final webhook → 96% transfer to affiliate
- [x] submissions.ts — contact blurring, accept/close/reject endpoints, escrow states
- [x] jobs/forfeit.ts — 5min job: auto-forfeit expired deadlines, 24h reminder emails
- [x] index.ts — startJobs() added
- [x] layout.tsx — full Referrd rebrand, logo, sky-400 active states

## In Progress
- [ ] sign-in.tsx — rebrand
- [ ] sign-up.tsx — rebrand
- [ ] dashboard.tsx — referral link URL update, rebrand copy
- [ ] submissions.tsx — new escrow actions (accept→deposit, close, reject)
- [ ] payments.tsx — deposit/final payment flows with Stripe.js
- [ ] earnings.tsx — minor rebrand copy
- [ ] referrals.tsx — URL update to referrd.one
- [ ] admin.tsx — rebrand copy

## DB Schema Changes Needed
- submissions table needs `deposit_amount`, `final_amount` columns (schema already has them ✓)
- Need to check if `paymentDeadline` reset logic on close is correct

## Deploy
- git add -A && commit && bunx vercel --prod
- Add custom domain referrd.one to Vercel
