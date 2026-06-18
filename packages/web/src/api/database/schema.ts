import { pgTable, text, boolean, real, integer, timestamp } from "drizzle-orm/pg-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Roles: affiliate (earns commissions), business (posts offers), admin flag separate
  role: text("role", { enum: ["affiliate", "business"] }).notNull().default("affiliate"),
  isAdmin: boolean("is_admin").notNull().default(false),
  applicationStatus: text("application_status", {
    enum: ["incomplete", "submitted", "approved", "rejected"],
  }).notNull().default("incomplete"),
  // Referral system
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"), // affiliateId who referred them
  // Stripe
  stripeAccountId: text("stripe_account_id"),
  stripeCustomerId: text("stripe_customer_id"),
  payoutEnabled: boolean("payout_enabled").notNull().default(false),
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
  w9Completed: boolean("w9_completed").notNull().default(false),
  // Business profile
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  companySize: text("company_size"),
  ein: text("ein"),
  industry: text("industry"),
  businessDescription: text("business_description"),
  // Affiliate profile
  skills: text("skills"),
  linkedinUrl: text("linkedin_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// ─── Listings (Offers posted by businesses) ──────────────────────────────────
export const listings = pgTable("listings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text("business_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  dealType: text("deal_type").notNull(),
  location: text("location"),
  payoutAmount: real("payout_amount").notNull(),
  payoutTrigger: text("payout_trigger").notNull(),
  payoutDeadlineDays: integer("payout_deadline_days").notNull().default(30),
  // Hours a business has to mark a lead as qualified after accepting (48 or 96)
  qualificationWindowHours: integer("qualification_window_hours").notNull().default(72),
  status: text("status", { enum: ["active", "paused", "closed"] }).notNull().default("active"),
  // Requirements shown to affiliates
  requirements: text("requirements"),
  targetAudience: text("target_audience"),
  // Denormalized business info
  businessName: text("business_name").notNull(),
  businessCompany: text("business_company"),
  // Stats
  totalSubmissions: integer("total_submissions").notNull().default(0),
  closedDeals: integer("closed_deals").notNull().default(0),
  totalPaidOut: real("total_paid_out").notNull().default(0),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// ─── Submissions (Leads submitted by affiliates) ─────────────────────────────
export const submissions = pgTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  listingId: text("listing_id").notNull().references(() => listings.id),
  affiliateId: text("affiliate_id").notNull().references(() => users.id),
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
    enum: ["pending", "reviewing", "qualified", "accepted", "rejected", "closed", "forfeited"],
  }).notNull().default("pending"),
  // Payment lifecycle — admin manages payouts
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "deposit_paid", "fully_paid", "transferred", "refunded", "forfeited"],
  }).notNull().default("unpaid"),
  depositAmount: real("deposit_amount"),
  finalAmount: real("final_amount"),
  payoutAmount: real("payout_amount"),
  adminNotes: text("admin_notes"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeTransferId: text("stripe_transfer_id"),
  paymentDeadline: timestamp("payment_deadline"),
  qualifiedDeadline: timestamp("qualified_deadline"), // deadline to mark lead as qualified after accept
  // E-sig
  disclosureSigned: boolean("disclosure_signed").notNull().default(false),
  disclosureSignedAt: timestamp("disclosure_signed_at"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// ─── Referral Overrides (affiliate earns when someone they referred earns) ───
export const referralOverrides = pgTable("referral_overrides", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  affiliateId: text("affiliate_id").notNull().references(() => users.id), // earner of override
  referredUserId: text("referred_user_id").notNull().references(() => users.id),
  submissionId: text("submission_id").references(() => submissions.id),
  overridePercent: real("override_percent").notNull().default(10), // % of referred user's payout
  overrideAmount: real("override_amount").notNull().default(0),
  status: text("status", { enum: ["pending", "paid", "forfeited"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

// ─── Learning Resources ───────────────────────────────────────────────────────
export const learningResources = pgTable("learning_resources", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url"),
  videoUrl: text("video_url"),
  category: text("category").notNull().default("general"),
  order: integer("order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
});

// ─── Business Posts ──────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  businessId: text("business_id").notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type", { enum: ["announcement", "promotion", "update", "tip"] }).notNull().default("announcement"),
  imageUrl: text("image_url"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  published: boolean("published").notNull().default(true),
  pinnedUntil: timestamp("pinned_until"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// ─── Auth (Better Auth generated tables) ─────────────────────────────────────
export * from "./auth-schema";
