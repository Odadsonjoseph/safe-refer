import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";
import { useLocation } from "wouter";

interface Listing {
  id: string;
  title: string;
  description: string;
  payoutAmount: number;
  payoutTrigger: string; // "lead_accepted" | "deal_closed" | "payment_received"
  dealType: string; // "warm_lead" | "cold_lead" | "appointment" | "referral" | "signed_contract"
  industry: string;
  location?: string | null;
  requirements?: string | null;
  targetAudience?: string | null;
  payoutDeadlineDays?: number | null;
  businessName: string;
  businessCompany?: string | null;
  status: string;
  totalSubmissions?: number;
  closedDeals?: number;
  createdAt: string;
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  warm_lead: "Warm Lead",
  cold_lead: "Cold Lead",
  appointment: "Appointment Set",
  referral: "Referral",
  signed_contract: "Signed Contract",
};

const PAYOUT_TRIGGER_LABELS: Record<string, string> = {
  lead_accepted: "On Acceptance",
  deal_closed: "On Close",
  payment_received: "On Payment",
};

const PAYOUT_TRIGGER_COLORS: Record<string, string> = {
  lead_accepted: "bg-blue-50 text-blue-600",
  deal_closed: "bg-emerald-50 text-emerald-600",
  payment_received: "bg-amber-50 text-amber-600",
};

const INDUSTRIES = [
  "Real Estate", "Insurance", "Finance & Lending", "Home Services",
  "Legal Services", "Healthcare", "Technology", "Automotive", "Education",
  "Credit Repair", "Business Services", "Other",
];

function DealTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    warm_lead: "bg-orange-50 text-orange-600",
    cold_lead: "bg-slate-100 text-slate-500",
    appointment: "bg-purple-50 text-purple-600",
    referral: "bg-sky-50 text-sky-600",
    signed_contract: "bg-green-50 text-green-600",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[type] || "bg-slate-100 text-slate-500"}`}>
      {DEAL_TYPE_LABELS[type] || type}
    </span>
  );
}

function ListingCard({ listing, role, onSubmit, onEdit, onView, onStatusChange }: {
  listing: Listing;
  role: string;
  onSubmit?: (id: string) => void;
  onEdit?: (listing: Listing) => void;
  onView?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
}) {
  const triggerLabel = PAYOUT_TRIGGER_LABELS[listing.payoutTrigger] || listing.payoutTrigger;
  const triggerColor = PAYOUT_TRIGGER_COLORS[listing.payoutTrigger] || "bg-slate-100 text-slate-500";

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-sky-200 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onView?.(listing.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <DealTypeBadge type={listing.dealType} />
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
              {listing.industry}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 leading-snug">{listing.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{listing.businessCompany || listing.businessName}</p>
        </div>
        <div className="text-right flex-shrink-0 pl-2">
          <p className="font-bold text-sky-600 text-xl">${listing.payoutAmount.toLocaleString()}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${triggerColor}`}>
            {triggerLabel}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{listing.description}</p>

      {/* Requirements snippet */}
      {listing.requirements && (
        <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3 text-xs text-gray-500 line-clamp-2">
          <span className="font-medium text-gray-700">Qualified lead: </span>
          {listing.requirements}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {listing.location && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {listing.location}
            </span>
          )}
          <span>{listing.totalSubmissions ?? 0} leads</span>
          {listing.payoutDeadlineDays && <span>{listing.payoutDeadlineDays}d deadline</span>}
        </div>

        {role === "affiliate" ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSubmit?.(listing.id); }}
            className="text-sm bg-sky-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-sky-600 transition"
          >
            Submit Lead
          </button>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              listing.status === "active" ? "bg-green-50 text-green-600" :
              listing.status === "paused" ? "bg-amber-50 text-amber-600" :
              "bg-gray-100 text-gray-500"
            }`}>
              {listing.status}
            </span>
            <button
              onClick={() => onEdit?.(listing)}
              className="text-sm text-sky-500 hover:underline font-medium"
            >
              Edit
            </button>
            {listing.status === "active" ? (
              <button
                onClick={() => onStatusChange?.(listing.id, "paused")}
                className="text-sm text-amber-500 hover:underline font-medium"
              >
                Pause
              </button>
            ) : listing.status === "paused" ? (
              <button
                onClick={() => onStatusChange?.(listing.id, "active")}
                className="text-sm text-green-500 hover:underline font-medium"
              >
                Activate
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable field wrapper
function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {note && <span className="ml-1 text-gray-400 font-normal text-xs">{note}</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white";

export default function Listings() {
  const { user } = useSession();
  const [, navigate] = useLocation();
  const role = (user as any)?.role as string;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterDealType, setFilterDealType] = useState("");

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    payoutAmount: "",
    payoutTrigger: "deal_closed",
    dealType: "warm_lead",
    industry: "",
    location: "",
    requirements: "",
    targetAudience: "",
    payoutDeadlineDays: "30",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Submit lead form
  const [leadForm, setLeadForm] = useState({
    leadName: "", leadEmail: "", leadPhone: "", leadCompany: "", notes: "", disclosureSigned: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateForm = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function getToken() {
    const session = await authClient.getSession();
    return (session as any)?.data?.session?.token;
  }

  async function loadListings() {
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = role === "business" ? "/api/listings/mine/all" : "/api/listings";
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setListings(d.listings || d);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (role) loadListings(); }, [role]);

  function openCreate() {
    setEditListing(null);
    setForm({ title: "", description: "", payoutAmount: "", payoutTrigger: "deal_closed", dealType: "warm_lead", industry: "", location: "", requirements: "", targetAudience: "", payoutDeadlineDays: "30" });
    setFormError("");
    setShowCreate(true);
  }

  function openEdit(listing: Listing) {
    setEditListing(listing);
    setForm({
      title: listing.title,
      description: listing.description,
      payoutAmount: String(listing.payoutAmount),
      payoutTrigger: listing.payoutTrigger,
      dealType: listing.dealType,
      industry: listing.industry,
      location: listing.location || "",
      requirements: listing.requirements || "",
      targetAudience: listing.targetAudience || "",
      payoutDeadlineDays: String(listing.payoutDeadlineDays ?? 30),
    });
    setFormError("");
    setShowCreate(true);
  }

  async function handleSaveOffer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const token = await getToken();
      const payload = {
        title: form.title,
        description: form.description,
        payoutAmount: parseFloat(form.payoutAmount),
        payoutTrigger: form.payoutTrigger,
        dealType: form.dealType,
        industry: form.industry,
        location: form.location || null,
        requirements: form.requirements || null,
        targetAudience: form.targetAudience || null,
        payoutDeadlineDays: parseInt(form.payoutDeadlineDays) || 30,
      };
      const res = await fetch(editListing ? `/api/listings/${editListing.id}` : "/api/listings", {
        method: editListing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save offer");
      }
      setShowCreate(false);
      setEditListing(null);
      loadListings();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const token = await getToken();
    await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadListings();
  }

  async function handleSubmitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!showSubmitModal) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId: showSubmitModal, ...leadForm }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit lead");
      }
      setShowSubmitModal(null);
      setLeadForm({ leadName: "", leadEmail: "", leadPhone: "", leadCompany: "", notes: "", disclosureSigned: false });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Filtering
  const filtered = listings.filter((l) => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.businessCompany || "").toLowerCase().includes(search.toLowerCase());
    const matchIndustry = !filterIndustry || l.industry === filterIndustry;
    const matchDeal = !filterDealType || l.dealType === filterDealType;
    return matchSearch && matchIndustry && matchDeal;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === "business" ? "My Offers" : "Marketplace"}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {role === "business"
              ? "Post offers — affiliates submit qualified leads, you pay on close"
              : "Browse offers and submit qualified leads to earn commissions"}
          </p>
        </div>
        {role === "business" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-sky-600 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post Offer
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search offers..."
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white text-gray-600 min-w-[150px]"
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select
          value={filterDealType}
          onChange={(e) => setFilterDealType(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white text-gray-600 min-w-[150px]"
        >
          <option value="">All Lead Types</option>
          {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Stats bar for business */}
      {role === "business" && listings.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-sky-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-sky-600">{listings.length}</p>
            <p className="text-xs text-sky-500 mt-0.5">Total Offers</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{listings.filter(l => l.status === "active").length}</p>
            <p className="text-xs text-green-500 mt-0.5">Active</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{listings.reduce((a, l) => a + (l.totalSubmissions ?? 0), 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Leads</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="font-medium text-gray-500">
            {role === "business" ? "No offers posted yet" : "No listings found"}
          </p>
          {role === "business" && (
            <button onClick={openCreate} className="text-sky-500 text-sm hover:underline mt-2">
              Post your first offer →
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              role={role || "affiliate"}
              onSubmit={(id) => setShowSubmitModal(id)}
              onEdit={openEdit}
              onView={(id) => navigate(`/listings/${id}`)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Offer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">
                  {editListing ? "Edit Offer" : "Post an Offer"}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {editListing ? "Update your offer details" : "Affiliates will find and submit qualified leads for this offer"}
                </p>
              </div>
              <button onClick={() => { setShowCreate(false); setEditListing(null); }} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-5">{formError}</div>
            )}

            <form onSubmit={handleSaveOffer} className="space-y-5">
              {/* Title */}
              <Field label="Offer Title">
                <input
                  required
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="e.g. Warm Real Estate Buyer Lead — Miami Area"
                  className={inputCls}
                />
              </Field>

              {/* Description */}
              <Field label="Description" note="(what you're looking for)">
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                  placeholder="Describe the type of customer you're looking for and what the lead needs to have..."
                  className={`${inputCls} resize-none`}
                />
              </Field>

              {/* Lead Type + Industry */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Lead Type">
                  <select required value={form.dealType} onChange={(e) => updateForm("dealType", e.target.value)} className={inputCls}>
                    <option value="warm_lead">Warm Lead</option>
                    <option value="cold_lead">Cold Lead</option>
                    <option value="appointment">Appointment Set</option>
                    <option value="referral">Referral</option>
                    <option value="signed_contract">Signed Contract</option>
                  </select>
                </Field>
                <Field label="Industry">
                  <select required value={form.industry} onChange={(e) => updateForm("industry", e.target.value)} className={inputCls}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </Field>
              </div>

              {/* What qualifies a lead */}
              <Field label="What makes a qualified lead?" note="(affiliates will see this before submitting)">
                <textarea
                  value={form.requirements}
                  onChange={(e) => updateForm("requirements", e.target.value)}
                  rows={3}
                  placeholder="e.g. Must be actively looking to buy within 90 days, pre-approved for financing, located in FL or TX..."
                  className={`${inputCls} resize-none`}
                />
              </Field>

              {/* Target Audience */}
              <Field label="Target Audience" note="(optional)">
                <input
                  value={form.targetAudience}
                  onChange={(e) => updateForm("targetAudience", e.target.value)}
                  placeholder="e.g. Homeowners aged 35-55 with household income $80k+"
                  className={inputCls}
                />
              </Field>

              {/* Payout */}
              <div className="bg-sky-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-sky-700 mb-3">Payout Structure</p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Payout Amount ($)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                      <input
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        value={form.payoutAmount}
                        onChange={(e) => updateForm("payoutAmount", e.target.value)}
                        placeholder="500"
                        className={`${inputCls} pl-7`}
                      />
                    </div>
                  </Field>
                  <Field label="Paid When">
                    <select required value={form.payoutTrigger} onChange={(e) => updateForm("payoutTrigger", e.target.value)} className={inputCls}>
                      <option value="deal_closed">On Close</option>
                      <option value="lead_accepted">On Acceptance</option>
                      <option value="payment_received">On Payment</option>
                    </select>
                  </Field>
                  <Field label="Deadline (days)">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={form.payoutDeadlineDays}
                      onChange={(e) => updateForm("payoutDeadlineDays", e.target.value)}
                      placeholder="30"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <p className="text-xs text-sky-500 mt-2">
                  Affiliates earn <strong>${form.payoutAmount || "—"}</strong> {form.payoutTrigger === "deal_closed" ? "when the deal closes" : form.payoutTrigger === "lead_accepted" ? "when you accept the lead" : "when payment is received"}.
                </p>
              </div>

              {/* Location */}
              <Field label="Location" note="(optional — leave blank for nationwide)">
                <input
                  value={form.location}
                  onChange={(e) => updateForm("location", e.target.value)}
                  placeholder="e.g. Miami, FL or Nationwide"
                  className={inputCls}
                />
              </Field>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setEditListing(null); }}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editListing ? "Save Changes" : "Post Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Lead Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Submit a Lead</h2>
              <button onClick={() => setShowSubmitModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <Field label="Lead Name">
                <input required value={leadForm.leadName} onChange={(e) => setLeadForm(f => ({ ...f, leadName: e.target.value }))} placeholder="Full name" className={inputCls} />
              </Field>
              <Field label="Lead Email">
                <input required type="email" value={leadForm.leadEmail} onChange={(e) => setLeadForm(f => ({ ...f, leadEmail: e.target.value }))} placeholder="lead@example.com" className={inputCls} />
              </Field>
              <Field label="Lead Phone" note="(optional)">
                <input value={leadForm.leadPhone} onChange={(e) => setLeadForm(f => ({ ...f, leadPhone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputCls} />
              </Field>
              <Field label="Lead Company" note="(optional)">
                <input value={leadForm.leadCompany} onChange={(e) => setLeadForm(f => ({ ...f, leadCompany: e.target.value }))} placeholder="Company name" className={inputCls} />
              </Field>
              <Field label="Notes">
                <textarea
                  required
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Why is this a qualified lead? How do you know them?"
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leadForm.disclosureSigned}
                  onChange={(e) => setLeadForm(f => ({ ...f, disclosureSigned: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-300 text-sky-500"
                />
                <span className="text-xs text-gray-500 leading-relaxed">
                  I confirm this lead has agreed to be contacted and I have a genuine relationship with them. This constitutes my digital signature.
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !leadForm.leadName || !leadForm.leadEmail || !leadForm.notes || !leadForm.disclosureSigned}
                  className="flex-1 bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
