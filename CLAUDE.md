# CLAUDE.md - SafeRefer

## Project Identity
- **Name:** SafeRefer
- **Description:** Two-sided referral marketplace. Mobile iOS + web dashboard.
- **Repository:** Odadsonjoseph/safe-refer
- **Branch:** main
- **Supabase Ref:** iwryzrudrrqvqtrtwvut
- **Vercel Project:** safe-refer
- **Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Vercel

## CRITICAL: Project Isolation
You are working on **SafeRefer** and ONLY SafeRefer.
- Do NOT reference code, configs, or data from other projects
- Do NOT deploy to any other Vercel project
- Do NOT modify any other Supabase instance
- Verify: `git remote -v` must show `Odadsonjoseph/safe-refer`

## Standards
- Follow the company AGENTS.md universal operating protocol
- Use the quality-gate skill before every commit
- Use the git-workflow skill for all branching and PRs
- Use the security-hardening skill before every deployment
- All code must pass TypeScript strict mode
- All Supabase tables must have RLS enabled

## Environment
- Local dev: `npm run dev` or `pnpm dev`
- Build: `npm run build`
- Deploy: `vercel --prod --token $VERCEL_TOKEN`
- Supabase: `supabase` CLI with `$SUPABASE_ACCESS_TOKEN`
