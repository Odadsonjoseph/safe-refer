import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

export const usersRouter = new Hono<AppEnv>()
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
      "w9LegalName", "w9Ssn", "w9Address", "w9City", "w9State", "w9Zip", "w9Completed",
    ];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updatedAt = new Date();

    const [current] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)) as any[];

    // Affiliates get auto-approved after completing profile
    if (
      current?.role === "affiliate" &&
      current?.applicationStatus === "incomplete" &&
      body.phone
    ) {
      updates.applicationStatus = "approved";
    }

    // Businesses go to submitted for admin review
    if (
      current?.role === "business" &&
      current?.applicationStatus === "incomplete" &&
      body.companyName &&
      body.phone
    ) {
      updates.applicationStatus = "submitted";
    }

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
      // Affiliates get auto-approved
      if (body.phone) updates.phone = body.phone;
      if (body.bio) updates.bio = body.bio;
      updates.applicationStatus = "approved";
    } else {
      // Businesses go to submitted for admin review
      if (body.phone) updates.phone = body.phone;
      if (body.companyName) updates.companyName = body.companyName;
      if (body.website) updates.companyWebsite = body.website;
      if (body.industry) updates.industry = body.industry;
      if (body.description) updates.businessDescription = body.description;
      updates.applicationStatus = "submitted";
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

    return c.json({
      stats: {
        totalEarned,
        pendingPayout,
        closedDeals,
        approvedLeads,
        overrideEarned,
        overridePending,
        totalWithOverrides: totalEarned + overrideEarned,
      },
      recentSubmissions: allSubs.slice(0, 10),
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

    return c.json({
      referralCode: affiliate?.referralCode,
      referralUrl: `${process.env.WEBSITE_URL || ""}/sign-up?ref=${affiliate?.referralCode}`,
      totalReferred: referred.length,
      activeAffiliates: referred.filter((u) => u.applicationStatus === "approved").length,
      overrides: {
        total: overrides.length,
        earned: overrides.filter((o) => o.status === "paid").reduce((a, o) => a + o.overrideAmount, 0),
        pending: overrides.filter((o) => o.status === "pending").reduce((a, o) => a + o.overrideAmount, 0),
      },
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
