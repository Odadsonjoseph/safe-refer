import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { DashboardLayout } from "../components/layout";
import { Link } from "wouter";
import { useState } from "react";
import { Plus, MapPin, Building2, ChevronRight } from "lucide-react";

export default function ListingsPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  const [showCreate, setShowCreate] = useState(false);

  const listings = useQuery({
    queryKey: ["listings"],
    queryFn: async () => (await api.listings.$get()).json(),
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Listings</h1>
            <p className="text-slate-500 text-sm mt-1">Browse referral opportunities</p>
          </div>
          {(user?.role === "poster" || user?.role === "both" || user?.isAdmin) && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Plus size={16} /> Post Listing
            </button>
          )}
        </div>

        {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} />}

        {listings.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="grid gap-4">
          {(listings.data as any)?.listings?.map((l: any) => (
            <ListingCard key={l.id} listing={l} />
          ))}
          {!listings.isLoading && !(listings.data as any)?.listings?.length && (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Building2 size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400">No listings available right now.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ListingCard({ listing }: { listing: any }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {listing.industry && (
                <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{listing.industry}</span>
              )}
              {listing.dealType && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{listing.dealType}</span>
              )}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{listing.title}</h3>
            <p className="text-sm text-slate-500 line-clamp-2">{listing.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              {(listing.posterCompany || listing.posterName) && (
                <span className="flex items-center gap-1">
                  <Building2 size={12} />{listing.posterCompany ?? listing.posterName}
                </span>
              )}
              {listing.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />{listing.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            <p className="text-xl font-bold text-sky-600">${listing.payoutAmount?.toFixed(0)}</p>
            <p className="text-xs text-slate-400">{listing.payoutTrigger}</p>
            <p className="text-xs text-slate-400">{listing.totalSubmissions ?? 0} referrals</p>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-sky-400 transition-colors mt-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function CreateListingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", description: "", industry: "", dealType: "",
    location: "", payoutAmount: "", payoutTrigger: "", payoutDeadlineDays: "30",
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: async () => {
      const res = await api.listings.$post({
        json: {
          ...form,
          payoutAmount: parseFloat(form.payoutAmount),
          payoutDeadlineDays: parseInt(form.payoutDeadlineDays),
        },
      });
      if (!res.ok) throw new Error("Failed to create listing");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      onClose();
    },
  });

  const F = ({ label, name, placeholder, type = "text", required = false }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={(form as any)[name]}
        onChange={(e) => update(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-5">Post a Listing</h2>
        {create.isError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            <p className="text-red-600 text-sm">Failed to create listing. Please try again.</p>
          </div>
        )}
        <div className="space-y-3">
          <F label="Title" name="title" placeholder="e.g. SaaS Sales Referral" required />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-red-400 ml-0.5">*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the opportunity, ideal leads, and how payouts work..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <F label="Industry" name="industry" placeholder="e.g. Technology" />
            <F label="Deal Type" name="dealType" placeholder="e.g. B2B SaaS" />
          </div>
          <F label="Location (optional)" name="location" placeholder="e.g. United States" />
          <div className="grid grid-cols-2 gap-3">
            <F label="Payout Amount ($)" name="payoutAmount" type="number" placeholder="500" required />
            <F label="Payout Trigger" name="payoutTrigger" placeholder="e.g. Deal closes" required />
          </div>
          <F label="Payment Deadline (days)" name="payoutDeadlineDays" type="number" placeholder="30" />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.title || !form.payoutAmount}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {create.isPending ? "Posting..." : "Post Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}
