import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireApproved } from "../middleware/auth";
import { sendEmail, submissionStatusEmail } from "../services/email";

export const submissions = new Hono()
  // Submit a referral
  .post("/", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const body = await c.req.json();

    const [listing] = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, body.listingId));
    if (!listing) return c.json({ error: "Listing not found" }, 404);
    if (listing.status !== "active") return c.json({ error: "Listing is not active" }, 400);

    // Simple fit score based on notes length / completeness
    const fitScore = body.notes && body.notes.length > 50 ? 80 : 50;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + listing.payoutDeadlineDays);

    const [submission] = await db
      .insert(schema.submissions)
      .values({
        listingId: body.listingId,
        referrerId: user.id,
        leadName: body.leadName,
        leadEmail: body.leadEmail,
        leadPhone: body.leadPhone ?? null,
        leadCompany: body.leadCompany ?? null,
        notes: body.notes ?? null,
        fitScore,
        disclosureSigned: body.disclosureSigned ?? false,
        disclosureSignedAt: body.disclosureSigned ? new Date() : null,
        payoutAmount: listing.payoutAmount,
        paymentDeadline: deadline,
      })
      .returning();

    // Increment listing submission count
    await db
      .update(schema.listings)
      .set({
        totalSubmissions: listing.totalSubmissions + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.listings.id, body.listingId));

    return c.json({ submission }, 201);
  })
  // My submissions (referrer)
  .get("/mine", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const rows = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.referrerId, user.id))
      .orderBy(desc(schema.submissions.createdAt));
    return c.json({ submissions: rows }, 200);
  })
  // Get one submission
  .get("/:id", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const [submission] = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);
    if (submission.referrerId !== user.id && !user.isAdmin) {
      // Also allow poster of the listing to see
      const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
      if (listing?.posterId !== user.id) return c.json({ error: "Forbidden" }, 403);
    }
    return c.json({ submission }, 200);
  })
  // Poster: update submission status
  .patch("/:id/status", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const { id } = c.req.param();
    const body = await c.req.json();

    const [submission] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id));
    if (!submission) return c.json({ error: "Not found" }, 404);

    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, submission.listingId));
    if (listing?.posterId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db
      .update(schema.submissions)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(schema.submissions.id, id))
      .returning();

    // Notify referrer
    try {
      const [referrer] = await db.select().from(schema.users).where(eq(schema.users.id, submission.referrerId)) as any[];
      if (referrer) {
        const emailData = submissionStatusEmail(referrer.name, submission.leadName, body.status);
        await sendEmail({ to: referrer.email, ...emailData });
      }
    } catch (e) {
      console.error("Failed to send status email", e);
    }

    return c.json({ submission: updated }, 200);
  })
  // Submissions for a listing (poster view)
  .get("/listing/:listingId", requireAuth, requireApproved, async (c) => {
    const user = c.get("user") as any;
    const { listingId } = c.req.param();
    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId));
    if (!listing) return c.json({ error: "Not found" }, 404);
    if (listing.posterId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);
    const rows = await db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.listingId, listingId))
      .orderBy(desc(schema.submissions.createdAt));
    return c.json({ submissions: rows }, 200);
  });
