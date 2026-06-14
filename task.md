# Safe Refer — Full Fix & Feature Build

## ROOT CAUSE OF SIGN-UP FAILURE
1. **No .env file** → DB creds missing locally
2. **auth-schema NOT in drizzle.config** → better-auth tables (user, session, account, verification) may not exist in Supabase
3. **Two user tables**: `user` (better-auth) vs `users` (app schema) — need to merge them or link them
4. **betterAuth baseURL** using WEBSITE_URL which may be wrong in prod

## FIX PLAN

### Phase 1: Database Fix (CRITICAL)
- [x] Get DB creds via secrets form
- [ ] Fix drizzle.config.ts to include BOTH schema files
- [ ] Merge auth `user` table with app `users` table into one unified table
- [ ] Push schema to Supabase via drizzle-kit push
- [ ] Seed admin user

### Phase 2: Auth Fix
- [ ] Fix betterAuth to use single user table with all app fields
- [ ] Set BETTER_AUTH_URL correctly
- [ ] Fix trustedOrigins
- [ ] Test sign-up → login locally

### Phase 3: Deploy
- [ ] Add all env vars to Vercel
- [ ] Push and deploy
- [ ] Test sign-up on production

### Phase 4: Complete Features
- [ ] Admin dashboard (full)
- [ ] Listings browse & create
- [ ] Submissions flow
- [ ] Earnings page
- [ ] Onboarding flow
- [ ] Stripe connect setup
- [ ] Mobile app screens

## KEY INSIGHT: USER TABLE MERGE
- better-auth creates a `user` table with: id, name, email, emailVerified, image, createdAt, updatedAt
- App schema has `users` table with ALL the extra fields
- SOLUTION: Use better-auth's `user` table as base, configure it with all extra fields via `additionalFields`
  OR: keep two tables and just JOIN them — simpler, less risky
- CHOSEN APPROACH: Two tables, joined. better-auth manages `user`, app manages `users` with FK to user.id

## VERCEL ENV VARS NEEDED
- DATABASE_URL (transaction pooler, port 6543)
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL = https://safe-refer-zeta.vercel.app
- WEBSITE_URL = https://safe-refer-zeta.vercel.app
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
