import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role", { enum: ["referrer", "poster", "both"] }).notNull().default("referrer"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  applicationStatus: text("application_status", {
    enum: ["incomplete", "submitted", "approved", "rejected"],
  }).notNull().default("incomplete"),
  // Stripe
  stripeAccountId: text("stripe_account_id"),
  stripeCustomerId: text("stripe_customer_id"),
  payoutEnabled: integer("payout_enabled", { mode: "boolean" }).notNull().default(false),
  // Identity
  idFrontUrl: text("id_front_url"),
  idBackUrl: text("id_back_url"),
  selfieUrl: text("selfie_url"),
  phone: text("phone"),
  // W-9
  w9LegalName: text("w9_legal_name"),
  w9Ssn: text("w9_ssn"),
  w9Address: text("w9_address"),
  w9City: text("w9_city"),
  w9State: text("w9_state"),
  w9Zip: text("w9_zip"),
  w9Completed: integer("w9_completed", { mode: "boolean" }).notNull().default(false),
  // Business profile (posters)
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  companySize: text("company_size"),
  ein: text("ein"),
  industry: text("industry"),
  // Referrer profile
  skills: text("skills"),
  linkedinUrl: text("linkedin_url"),
  bio: text("bio"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Listings ────────────────────────────────────────────────────────────────
export const listings = sqliteTable("listings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  posterId: text("poster_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  dealType: text("deal_type").notNull(),
  location: text("location"),
  payoutAmount: real("payout_amount").notNull(),
  payoutTrigger: text("payout_trigger").notNull(),
  payoutDeadlineDays: integer("payout_deadline_days").notNull().default(30),
  status: text("status", { enum: ["active", "paused", "closed"] }).notNull().default("active"),
  // Denormalized poster info
  posterName: text("poster_name").notNull(),
  posterCompany: text("poster_company"),
  // Stats
  totalSubmissions: integer("total_submissions").notNull().default(0),
  closedDeals: integer("closed_deals").notNull().default(0),
  totalPaidOut: real("total_paid_out").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Submissions ─────────────────────────────────────────────────────────────
export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listingId: text("listing_id").notNull().references(() => listings.id),
  referrerId: text("referrer_id").notNull().references(() => users.id),
  // Lead info
  leadName: text("lead_name").notNull(),
  leadEmail: text("lead_email").notNull(),
  leadPhone: text("lead_phone"),
  leadCompany: text("lead_company"),
  notes: text("notes"),
  fitScore: integer("fit_score").default(0),
  fitHints: text("fit_hints"),
  // Status
  status: text("status", {
    enum: ["pending", "reviewing", "accepted", "rejected", "closed", "forfeited"],
  }).notNull().default("pending"),
  // Payment lifecycle
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "deposit_paid", "fully_paid", "transferred", "refunded", "forfeited"],
  }).notNull().default("unpaid"),
  depositAmount: real("deposit_amount"),
  finalAmount: real("final_amount"),
  payoutAmount: real("payout_amount"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeTransferId: text("stripe_transfer_id"),
  paymentDeadline: integer("payment_deadline", { mode: "timestamp" }),
  // E-sig
  disclosureSigned: integer("disclosure_signed", { mode: "boolean" }).notNull().default(false),
  disclosureSignedAt: integer("disclosure_signed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ─── Auth (Better Auth generated tables) ─────────────────────────────────────
export * from "./auth-schema";
