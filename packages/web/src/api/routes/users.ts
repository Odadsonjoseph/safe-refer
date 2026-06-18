import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const usersRouter = new Hono<AppEnv>()
  // GPT-4 Vision ID verification
  .post("/verify-id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const { idFrontBase64, selfieBase64 } = body as { idFrontBase64: string; selfieBase64: string };

    if (!idFrontBase64 || !selfieBase64) {
      return c.json({ error: "idFrontBase64 and selfieBase64 are required" }, 400);
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `You are an identity verification specialist. Analyze the provided government ID and selfie photo.
              
              Evaluate:
              1. Is the first image a real government-issued ID (driver's license, passport, state ID)? Not a screenshot or fake?
              2. Is the second image a live selfie photo of a real person? Not a screen/printout/photo-of-photo?
              3. Do the faces in the ID and selfie appear to match the same person?
              
              Respond ONLY with valid JSON in this exact format:
              {"passed": boolean, "score": number (0.0-1.0), "reason": "string (brief explanation, max 100 chars)"}
              
              Be strict but fair. Score 0.8+ = clear pass. Score below 0.6 = fail.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please verify this government ID and selfie:",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: idFrontBase64.startsWith("data:") ? idFrontBase64 : `data:image/jpeg;base64,${idFrontBase64}`,
                    detail: "high",
                  },
                },
                {
                  type: "image_url",
                  image_url: {
                    url: selfieBase64.startsWith("data:") ? selfieBase64 : `data:image/jpeg;base64,${selfieBase64}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI error:", errText);
        return c.json({ error: "Verification service error" }, 500);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content ?? "";
      
      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return c.json({ error: "Could not parse verification result" }, 500);
      }
      
      const result = JSON.parse(jsonMatch[0]) as { passed: boolean; score: number; reason: string };

      // Save result to DB
      await db
        .update(schema.users)
        .set({
          idVerified: result.passed,
          selfieVerified: result.passed,
          idVerificationScore: result.score,
          idRejectionReason: result.passed ? null : result.reason,
          idFrontUrl: idFrontBase64.substring(0, 200), // Store truncated ref only
          selfieUrl: selfieBase64.substring(0, 200),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));

      return c.json(result, 200);
    } catch (err: any) {
      console.error("verify-id error:", err);
      return c.json({ error: "Verification failed", details: err.message }, 500);
    }
  })

  // Submit final application (marks as submitted for admin review)
  .post("/me/finalize-application", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    if (!current) return c.json({ error: "User not found" }, 404);
    if (current.applicationStatus === "approved") {
      return c.json({ user: current }, 200); // already approved, no-op
    }
    const [updated] = await db
      .update(schema.users)
      .set({ applicationStatus: "submitted", updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning();
    return c.json({ user: updated }, 200);
  })

  // Get current user profile
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [profile] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));

    if (!profile) {
      const referralCode = generateReferralCode(user.name, user.id);
      const [newProfile] = await db
        .insert(schema.users)
        .values({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: false,
          role: "affiliate",
          isAdmin: false,
          applicationStatus: "incomplete",
          referralCode,
          payoutEnabled: false,
          w9Completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();
      return c.json({ user: newProfile }, 200);
    }

    // Ensure referral code is set
    if (!profile.referralCode) {
      const referralCode = generateReferralCode(profile.name, profile.id);
      const [updated] = await db
        .update(schema.users)
        .set({ referralCode, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id))
        .returning();
      return c.json({ user: updated }, 200);
    }

    return c.json({ user: profile }, 200);
  })

  // Update profile
  .patch("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();

    const allowed = [
      "name", "phone", "role", "bio", "skills", "linkedinUrl",
      "companyName", "companyWebsite", "companySize", "industry",
      "businessDescription", "ein",
      "idFrontUrl", "idBackUrl", "selfieUrl",
      "idVerified", "selfieVerified", "idVerificationScore", "idRejectionReason",
      "addressLine1", "addressLine2", "city", "state", "zip",
      "termsSigned", "termsSignedAt",
      "w9LegalName", "w9Ssn", "w9Address", "w9City", "w9State", "w9Zip", "w9Completed",
    ];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updatedAt = new Date();

    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    // Both affiliates and businesses go through admin review — no auto-approve
    // applicationStatus is set to "submitted" explicitly via /me/submit-application

    const [updated] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, user.id))
      .returning();

    return c.json({ user: updated }, 200);
  })

  // Submit application (for businesses)
  .post("/me/submit-application", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    if (!current) return c.json({ error: "User not found" }, 404);
    if (current.applicationStatus !== "incomplete") {
      return c.json({ error: "Application already submitted" }, 400);
    }
    const [updated] = await db
      .update(schema.users)
      .set({ applicationStatus: "submitted", updatedAt: new Date() })
      .where(eq(schema.users.id, user.id))
      .returning();
    return c.json({ user: updated }, 200);
  })

  // Set role during onboarding — handles full profile + auto-approval logic
  .post("/me/set-role", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const role = body.role as "affiliate" | "business";
    if (!["affiliate", "business"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }

    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    // Allow re-submission if still incomplete
    if (current && current.applicationStatus !== "incomplete") {
      return c.json({ error: "Role already set" }, 400);
    }

    const updates: Record<string, any> = {
      role,
      updatedAt: new Date(),
    };

    if (role === "affiliate") {
      // Affiliates now go through the full wizard — no auto-approve
      if (body.phone) updates.phone = body.phone;
      if (body.bio) updates.bio = body.bio;
    } else {
      // Businesses go to submitted for admin review
      if (body.phone) updates.phone = body.phone;
      if (body.companyName) updates.companyName = body.companyName;
      if (body.website) updates.companyWebsite = body.website;
      if (body.industry) updates.industry = body.industry;
      if (body.description) updates.businessDescription = body.description;
    }

    // Handle referral code from sign-up URL (?ref=CODE)
    const refCode = body.referredBy as string | undefined;
    if (refCode) {
      // Look up the affiliate with this referral code
      const [referrer] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.referralCode, refCode)) as any[];
      if (referrer) {
        updates.referredBy = referrer.id;
      }
    }

    // Ensure user has a referral code
    if (!current?.referralCode) {
      updates.referralCode = generateReferralCode(user.name, user.id);
    }

    const [updated] = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, user.id))
      .returning();

    return c.json({ user: updated }, 200);
  })

  // Earnings summary (affiliates)
  .get("/earnings", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const allSubs = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.affiliateId, user.id))
      .orderBy(desc(schema.submissions.createdAt));

    const totalEarned = allSubs
      .filter((s) => s.paymentStatus === "transferred" || s.paymentStatus === "fully_paid")
      .reduce((acc, s) => acc + (s.payoutAmount ?? 0), 0);

    const pendingPayout = allSubs
      .filter((s) => s.status === "accepted" && s.paymentStatus !== "transferred" && s.paymentStatus !== "fully_paid")
      .reduce((acc, s) => acc + (s.payoutAmount ?? 0), 0);

    const closedDeals = allSubs.filter((s) => s.status === "closed").length;
    const approvedLeads = allSubs.filter((s) => s.status === "accepted").length;

    // Override earnings
    const overrides = await db
      .select()
      .from(schema.referralOverrides)
      .where(eq(schema.referralOverrides.affiliateId, user.id));
    const overrideEarned = overrides
      .filter((o) => o.status === "paid")
      .reduce((acc, o) => acc + (o.overrideAmount ?? 0), 0);
    const overridePending = overrides
      .filter((o) => o.status === "pending")
      .reduce((acc, o) => acc + (o.overrideAmount ?? 0), 0);

    const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    // Build flat payouts list for the earnings page
    const withListings = await Promise.all(allSubs.map(async (s) => {
      const [listing] = await db
        .select({ title: schema.listings.title })
        .from(schema.listings)
        .where(eq(schema.listings.id, s.listingId));
      return { ...s, listingTitle: listing?.title };
    }));

    const payouts = [
      ...withListings.map((s) => ({
        id: s.id,
        amount: s.payoutAmount ?? 0,
        status: s.paymentStatus === "transferred" ? "transferred" : s.paymentStatus === "fully_paid" ? "transferred" : "pending",
        type: "direct",
        leadName: s.leadName,
        listingTitle: (s as any).listingTitle,
        createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
      ...overrides.map((o) => ({
        id: o.id,
        amount: o.overrideAmount ?? 0,
        status: o.status === "paid" ? "transferred" : "pending",
        type: "override",
        leadName: undefined,
        listingTitle: undefined,
        createdAt: o.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({
      totalEarned,
      pendingPayout,
      overrideEarned,
      overridePending,
      payouts,
      stats: {
        closedDeals,
        approvedLeads,
        totalWithOverrides: totalEarned + overrideEarned,
      },
      payoutEnabled: affiliate?.payoutEnabled ?? false,
      referralCode: affiliate?.referralCode ?? null,
    }, 200);
  })

  // Dashboard summary endpoint
  .get("/dashboard-summary", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const dbUser = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];
    const profile = dbUser[0];

    if (profile?.role === "business") {
      // Get business's listings
      const myListings = await db
        .select()
        .from(schema.listings)
        .where(eq(schema.listings.businessId, user.id));
      const listingIds = myListings.map((l) => l.id);

      let allSubs: any[] = [];
      if (listingIds.length > 0) {
        allSubs = await db
          .select({
            id: schema.submissions.id,
            leadName: schema.submissions.leadName,
            leadEmail: schema.submissions.leadEmail,
            status: schema.submissions.status,
            payoutAmount: schema.submissions.payoutAmount,
            createdAt: schema.submissions.createdAt,
            listingTitle: schema.listings.title,
            affiliateName: schema.users.name,
          })
          .from(schema.submissions)
          .leftJoin(schema.listings, eq(schema.submissions.listingId, schema.listings.id))
          .leftJoin(schema.users, eq(schema.submissions.affiliateId, schema.users.id))
          .where(eq(schema.listings.businessId, user.id))
          .orderBy(desc(schema.submissions.createdAt));
      }

      return c.json({
        activeListings: myListings.filter((l) => l.status === "active").length,
        totalSubmissions: allSubs.length,
        pendingSubmissions: allSubs.filter((s) => s.status === "pending").length,
        acceptedSubmissions: allSubs.filter((s) => s.status === "accepted").length,
        recentSubmissions: allSubs.slice(0, 5),
      }, 200);
    }

    const allSubs = await db
      .select({
        id: schema.submissions.id,
        leadName: schema.submissions.leadName,
        status: schema.submissions.status,
        payoutAmount: schema.submissions.payoutAmount,
        paymentStatus: schema.submissions.paymentStatus,
        createdAt: schema.submissions.createdAt,
        listingTitle: schema.listings.title,
        businessName: schema.users.name,
      })
      .from(schema.submissions)
      .leftJoin(schema.listings, eq(schema.submissions.listingId, schema.listings.id))
      .leftJoin(schema.users, eq(schema.listings.businessId, schema.users.id))
      .where(eq(schema.submissions.affiliateId, user.id))
      .orderBy(desc(schema.submissions.createdAt));

    const totalSubmissions = allSubs.length;
    const acceptedSubmissions = allSubs.filter((s) => s.status === "accepted").length;

    // Affiliate
    const totalEarned = allSubs
      .filter((s) => s.status === "accepted" && s.paymentStatus === "transferred")
      .reduce((a, s) => a + (s.payoutAmount ?? 0), 0);
    const pendingPayout = allSubs
      .filter((s) => s.status === "accepted" && s.paymentStatus !== "transferred")
      .reduce((a, s) => a + (s.payoutAmount ?? 0), 0);

    return c.json({
      totalEarned,
      pendingPayout,
      totalSubmissions,
      acceptedSubmissions,
      referralCode: profile?.referralCode,
      referralUrl: `${process.env.WEBSITE_URL || ""}/sign-up?ref=${profile?.referralCode}`,
      recentSubmissions: allSubs.slice(0, 5),
    }, 200);
  })

  // Referral link stats
  .get("/referrals", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const [affiliate] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    // People referred by this affiliate
    const referred = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.referredBy, user.id));

    const overrides = await db
      .select()
      .from(schema.referralOverrides)
      .where(eq(schema.referralOverrides.affiliateId, user.id));

    const overrideEarned = overrides.filter((o) => o.status === "paid").reduce((a, o) => a + o.overrideAmount, 0);
    const overridePending = overrides.filter((o) => o.status === "pending").reduce((a, o) => a + o.overrideAmount, 0);

    return c.json({
      referralCode: affiliate?.referralCode,
      referralUrl: `${process.env.WEBSITE_URL || ""}/sign-up?ref=${affiliate?.referralCode}`,
      overrideEarned,
      overridePending,
      totalReferred: referred.length,
      activeAffiliates: referred.filter((u) => u.applicationStatus === "approved").length,
      // Both names for compatibility
      referredUsers: referred.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        applicationStatus: u.applicationStatus,
        createdAt: u.createdAt?.toISOString() ?? null,
        totalSubmissions: 0,
        overrideEarned: overrides.filter((o) => o.referredUserId === u.id && o.status === "paid").reduce((a, o) => a + o.overrideAmount, 0),
      })),
      referred: referred.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        applicationStatus: u.applicationStatus,
        createdAt: u.createdAt,
      })),
    }, 200);
  });

function generateReferralCode(name: string, id: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  const suffix = id.slice(-4).toUpperCase();
  return `${prefix}${suffix}`;
}
