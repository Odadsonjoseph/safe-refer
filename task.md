# Safe Refer — Full Auth & Roles Rebuild

## Roles
- `affiliate` (was referrer): browse marketplace, submit leads, referral links, learning center, earnings
- `business` (was poster): post offers, review leads, analytics — admin handles payouts
- `admin`: manage all users, approve/reject businesses, all listings+submissions, payout management, platform analytics

## Auth Methods
- Email + Password (existing)
- Google OAuth (add)
- Magic Link / email (add)

## Sign-up Flow
1. Enter name + email + password (or Google/magic link)
2. Role selection screen (affiliate vs business) — no "both"
3. Affiliate → short profile onboarding → approved immediately (or pending?)
4. Business → company profile → requires admin approval

## Schema Changes
- users.role: "affiliate" | "business" (drop "referrer"/"poster"/"both")
- users.referralCode: unique code for affiliate referral links
- users.referredBy: which affiliate referred this user
- listings.businessId: rename from posterId
- submissions.affiliateId: rename from referrerId
- New: learning_resources table (title, description, url, category, order)
- New: referral_overrides table (affiliateId, referredUserId, amount, status)

## Files to Create/Modify
### Backend
- [x] schema.ts — update roles, add referral code, learning resources
- [x] auth.ts — add Google OAuth, magic link plugins
- [x] routes/users.ts — update role logic, add referral code gen
- [x] routes/listings.ts — rename posterId→businessId, role checks
- [x] routes/submissions.ts — rename referrerId→affiliateId, role checks  
- [x] routes/admin.ts — enhanced stats, payout management
- [x] routes/affiliate.ts — NEW: referral links, overrides, learning center

### Frontend
- [x] lib/auth.ts — add Google/magic link methods, update types
- [x] app.tsx — new routes, role-based redirects
- [x] pages/sign-up.tsx — Google + magic link buttons, role selection step
- [x] pages/sign-in.tsx — Google + magic link buttons
- [x] pages/onboarding.tsx — split affiliate vs business flows
- [x] pages/dashboard.tsx — role-specific dashboard
- [x] pages/listings.tsx — "marketplace" for affiliates, "my offers" for business
- [x] pages/submissions.tsx — affiliate view vs business review view
- [x] pages/earnings.tsx — affiliate earnings + overrides
- [x] pages/learning.tsx — NEW: learning center for affiliates
- [x] pages/referrals.tsx — NEW: affiliate referral links + tracking
- [x] pages/admin.tsx — enhanced with payout management, analytics
- [x] components/layout.tsx — role-specific nav

## Status: IN PROGRESS
