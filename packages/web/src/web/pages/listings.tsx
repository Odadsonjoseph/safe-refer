import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";

interface Listing {
  id: string;
  title: string;
  description: string;
  payoutAmount: number;
  category: string;
  businessName: string;
  status: string;
  createdAt: string;
}

function ListingCard({ listing, role, onSubmit, onEdit }: {
  listing: Listing;
  role: string;
  onSubmit?: (id: string) => void;
  onEdit?: (listing: Listing) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-sky-200 transition">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{listing.businessName}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-sky-600 text-lg">${listing.payoutAmount}</p>
          <p className="text-xs text-gray-400">per lead</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full font-medium">
          {listing.category}
        </span>
        {role === "affiliate" ? (
          <button
            onClick={() => onSubmit?.(listing.id)}
            className="text-sm bg-sky-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-sky-600 transition"
          >
            Submit Lead
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              listing.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
            }`}>
              {listing.status}
            </span>
            <button
              onClick={() => onEdit?.(listing)}
              className="text-sm text-sky-500 hover:underline"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Listings() {
  const { user } = useSession();
  const role = (user as any)?.role as string;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Create offer form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [category, setCategory] = useState("");
  const [dealType, setDealType] = useState("warm_lead");
  const [payoutTrigger, setPayoutTrigger] = useState("lead_accepted");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Submit lead form
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = ["Real Estate", "Insurance", "Finance & Lending", "Home Services", "Legal Services", "Healthcare", "Technology", "Automotive", "Education", "Other"];

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

  useEffect(() => { loadListings(); }, [role]);

  async function handleCreateOffer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, payoutAmount: parseFloat(payoutAmount), industry: category, dealType, payoutTrigger }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create offer");
      }
      setShowCreate(false);
      setTitle(""); setDescription(""); setPayoutAmount(""); setCategory("");
      loadListings();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
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
        body: JSON.stringify({ listingId: showSubmitModal, leadName, leadEmail, leadPhone, notes: leadNotes }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit lead");
      }
      setShowSubmitModal(null);
      setLeadName(""); setLeadEmail(""); setLeadPhone(""); setLeadNotes("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = listings.filter(
    (l) => l.title.toLowerCase().includes(search.toLowerCase()) || l.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {role === "business" ? "My Offers" : "Marketplace"}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {role === "business" ? "Manage your referral offers" : "Browse opportunities and submit qualified leads"}
          </p>
        </div>
        {role === "business" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-sky-600 transition text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Offer
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={role === "business" ? "Search your offers..." : "Search marketplace..."}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="font-medium">
            {role === "business" ? "No offers yet" : "No listings found"}
          </p>
          {role === "business" && (
            <button onClick={() => setShowCreate(true)} className="text-sky-500 text-sm hover:underline mt-1">
              Create your first offer →
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
            />
          ))}
        </div>
      )}

      {/* Create Offer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Create Offer</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {formError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{formError}</div>
            )}
            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Warm Real Estate Buyer Lead" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe exactly what lead you need..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payout ($)</label>
                  <input required type="number" min="1" step="0.01" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="50.00" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white">
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50">
                {saving ? "Creating..." : "Create Offer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Submit Lead Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Submit Lead</h2>
              <button onClick={() => setShowSubmitModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Name</label>
                <input required value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Full name" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Email</label>
                <input required type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="lead@example.com" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Phone</label>
                <input value={leadPhone} onChange={(e) => setLeadPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={leadNotes} onChange={(e) => setLeadNotes(e.target.value)} rows={2} placeholder="Any context about this lead..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none" />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Lead"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
