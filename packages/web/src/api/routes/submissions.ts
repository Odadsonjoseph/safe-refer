import { Hono } from "hono";
import type { AppEnv } from "../types";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";

// ─── Contact blurring ─────────────────────────────────────────────────────────
function blur(val: string | null | undefined): string {
  if (!val) return "—";
  return "█".repeat(Math.min(val.length, 12));
}

function blurSubmission(s: any, reveal: boolean) {
  if (reveal) return s;
  return {
    ...s,
    leadEmail: blur(s.leadEmail),
    leadPhone: blur(s.leadPhone),
    // Keep name blurred too — only show industry hint
    leadName: s.leadName ? s.leadName.charAt(0) + "███" : "███",
    leadCompany: blur(s.leadCompany),
    notes: s.notes ? s.notes.substring(0, 30) + "…" : "—",
  };
}

export const submissions = new Hono<AppEnv>()
  // ─── Affiliate: submit a lead ────────────────────────────────────────────
  .post("/", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "affiliate" && !user.isAdmin) {
      return c.json({ error: "Only affiliates can submit leads" }, 403);
    }
    const body = await c.req.json();
    const [listing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, body.listingId));
    if (!listing) return c.json({ error: "Listing not found" }, 404);
    if (listing.status !== "active") return c.json({ error: "Listing is not active" }, 400);

    const fitScore = body.notes && body.notes.length > 50 ? 80 : 50;
    // fitHints: teaser info shown to business before accepting
    const fitHints = [
      body.leadCompany ? `Company: ${body.leadCompany.substring(0, 3)}***` : null,
      `Fit score: ${fitScore}`,
      `Submitted: ${new Date().toLocaleDateString()}`,
    ].filter(Boolean).join(" · ");

    const [submission] = await db
      .insert(schema.submissions)
      .values({
        listingId: body.listingId,
        affiliateId: user.id,
        leadName: body.leadName,
        leadEmail: body.leadEmail,
        leadPhone: body.leadPhone ?? null,
        leadCompany: body.leadCompany ?? null,
        notes: body.notes ?? null,
        fitScore,
        fitHints,
        disclosureSigned: body.disclosureSigned ?? false,
        disclosureSignedAt: body.disclosureSigned ? new Date() : null,
        payoutAmount: listing.payoutAmount,
        depositAmount: listing.payoutAmount * 0.25,
        finalAmount: listing.payoutAmount * 0.75,
      })
      .returning();

    await db
      .update(schema.listings)
      .set({ totalSubmissions: listing.totalSubmissions + 1, updatedAt: new Date() })
      .where(eq(schema.listings.id, body.listingId));

    return c.json({ submission }, 201);
  })

  // ─── Affiliate: my submitted leads ───────────────────────────────────────
  .get("/mine", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const rows = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.affiliateId, user.id))
      .orderBy(desc(schema.submissions.createdAt));

    const withListings = await Promise.all(rows.map(async (s) => {
      const [listing] = await db
        .select({ title: schema.listings.title, industry: schema.listings.industry })
        .from(schema.listings)
        .where(eq(schema.listings.id, s.listingId));
      return { ...s, listingTitle: listing?.title, listingIndustry: listing?.industry };
    }));

    return c.json({ submissions: withListings }, 200);
  })

  // ─── Business: incoming leads (with contact blurring) ─────────────────────
  .get("/incoming", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    const myListings = await db
      .select({ id: schema.listings.id, title: schema.listings.title })
      .from(schema.listings)
      .where(eq(schema.listings.businessId, user.id));

    const myListingIds = myListings.map((l) => l.id);
    if (!myListingIds.length) return c.json({ submissions: [] }, 200);

    const allSubs = await db
      .select()
      .from(schema.submissions)
      .orderBy(desc(schema.submissions.createdAt));

    const filtered = allSubs.filter((s) => myListingIds.includes(s.listingId));
    const listingMap = Object.fromEntries(myListings.map((l) => [l.id, l.title]));

    // Contact info revealed only after deposit paid (accepted)
    const result = filtered.map((s) => {
      const reveal = s.paymentStatus === "deposit_paid" || s.paymentStatus === "fully_paid" || s.paymentStatus === "transferred";
      return {
        ...blurSubmission(s, reveal),
        listingTitle: listingMap[s.listingId],
        contactUnlocked: reveal,
      };
    });

    return c.json({ submissions: result }, 200);
  })

  // ─── Get one submission ───────────────────────────────────────────────────
  .get("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const { id } = c.req.param();
    const [submission] = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);

    // Affiliates always see their own leads fully
    if (submission.affiliateId === user.id || user.isAdmin) {
      return c.json({ submission }, 200);
    }

    // Business: check ownership
    const [listing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, submission.listingId));
    if (listing?.businessId !== user.id) return c.json({ error: "Forbidden" }, 403);

    const reveal = submission.paymentStatus === "deposit_paid" || submission.paymentStatus === "fully_paid" || submission.paymentStatus === "transferred";
    return c.json({ submission: { ...blurSubmission(submission, reveal), contactUnlocked: reveal } }, 200);
  })

  // ─── Business: accept a lead (triggers deposit payment) ──────────────────
  // Note: actual status update happens in Stripe webhook after deposit paid
  // This endpoint just validates and returns deposit amount for the UI
  .post("/:id/accept", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const { id } = c.req.param();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);
    if (submission.status !== "pending" && submission.status !== "reviewing") {
      return c.json({ error: "Lead is not in a state that can be accepted" }, 400);
    }

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (listing?.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    // Move to reviewing — deposit payment will flip it to accepted
    await db.update(schema.submissions).set({
      status: "reviewing",
      updatedAt: new Date(),
    }).where(eq(schema.submissions.id, id));

    return c.json({
      submissionId: id,
      depositAmount: submission.depositAmount ?? (submission.payoutAmount ?? 0) * 0.25,
      totalPayout: submission.payoutAmount,
    }, 200);
  })

  // ─── Business: mark deal closed (starts 48hr payment clock) ──────────────
  .post("/:id/close", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const { id } = c.req.param();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);
    if (submission.status !== "accepted") return c.json({ error: "Lead must be accepted before closing" }, 400);
    if (submission.paymentStatus !== "deposit_paid") {
      return c.json({ error: "Deposit must be paid to close a lead" }, 400);
    }

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (listing?.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    // 48-hour payment deadline
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);

    await db.update(schema.submissions).set({
      status: "closed",
      paymentDeadline: deadline,
      updatedAt: new Date(),
    }).where(eq(schema.submissions.id, id));

    return c.json({ deadline: deadline.toISOString(), finalAmount: submission.finalAmount }, 200);
  })

  // ─── Business: reject a lead ─────────────────────────────────────────────
  .post("/:id/reject", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "business" && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const { id } = c.req.param();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);
    if (submission.paymentStatus !== "unpaid") {
      return c.json({ error: "Cannot reject a lead that has been paid for" }, 400);
    }

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (listing?.businessId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db.update(schema.submissions).set({
      status: "rejected",
      updatedAt: new Date(),
    }).where(eq(schema.submissions.id, id)).returning();

    return c.json({ submission: updated }, 200);
  })

  // ─── Legacy patch (admin use) ─────────────────────────────────────────────
  .patch("/:id/status", requireAuth, async (c) => {
    const user = c.get("user")!;
    if (!user.isAdmin) return c.json({ error: "Admin only" }, 403);
    const { id } = c.req.param();
    const body = await c.req.json();
    const allowed = ["status", "paymentStatus", "adminNotes"];
    const updates: Record<string, any> = {};
    for (const k of allowed) if (k in body) updates[k] = body[k];
    updates.updatedAt = new Date();
    const [updated] = await db.update(schema.submissions).set(updates)
      .where(eq(schema.submissions.id, id)).returning();
    return c.json({ submission: updated }, 200);
  })

  // ─── Poster submissions (payments page compat) ────────────────────────────
  .get("/poster", requireAuth, requireApproved, async (c) => {
    const user = c.get("user")!;
    const myListings = await db
      .select({ id: schema.listings.id, title: schema.listings.title })
      .from(schema.listings)
      .where(eq(schema.listings.businessId, user.id));
    const myListingIds = myListings.map((l) => l.id);
    if (!myListingIds.length) return c.json({ submissions: [] }, 200);
    const allSubs = await db
      .select()
      .from(schema.submissions)
      .orderBy(desc(schema.submissions.createdAt));
    const filtered = allSubs.filter((s) => myListingIds.includes(s.listingId));
    const listingMap = Object.fromEntries(myListings.map((l) => [l.id, l.title]));
    return c.json({ submissions: filtered.map((s) => ({ ...s, listingTitle: listingMap[s.listingId] })) }, 200);
  });
