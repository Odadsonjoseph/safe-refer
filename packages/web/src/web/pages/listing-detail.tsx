import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { authClient } from "../lib/auth";
import { useAuth } from "../lib/auth";
import { useState } from "react";

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
  lead_accepted: "bg-blue-50 text-blue-600 border border-blue-100",
  deal_closed: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  payment_received: "bg-amber-50 text-amber-600 border border-amber-100",
};

const DEAL_TYPE_COLORS: Record<string, string> = {
  warm_lead: "bg-orange-50 text-orange-600 border border-orange-100",
  cold_lead: "bg-slate-100 text-slate-500 border border-slate-200",
  appointment: "bg-purple-50 text-purple-600 border border-purple-100",
  referral: "bg-sky-50 text-sky-600 border border-sky-100",
  signed_contract: "bg-green-50 text-green-600 border border-green-100",
};

async function getToken() {
  const session = await authClient.getSession();
  return (session as any)?.data?.session?.token;
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showSubmit, setShowSubmit] = useState(false);

  const listingQuery = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/listings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!id,
  });

  const l = (listingQuery.data as any)?.listing;
  const isAffiliate = user?.role === "affiliate";
  const isBusiness = user?.role === "business";

  return (
    <div className="max-w-2xl">
        <button
          onClick={() => navigate("/listings")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {isBusiness ? "My Offers" : "Marketplace"}
        </button>

        {listingQuery.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {l && (
          <div className="space-y-4">
            {/* Main Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DEAL_TYPE_COLORS[l.dealType] || "bg-slate-100 text-slate-500"}`}>
                  {DEAL_TYPE_LABELS[l.dealType] || l.dealType}
                </span>
                <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                  {l.industry}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  l.status === "active" ? "bg-green-50 text-green-600 border border-green-100" :
                  l.status === "paused" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                  "bg-gray-100 text-gray-500"
                }`}>
                  {l.status}
                </span>
              </div>

              {/* Title + Payout */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900 leading-snug">{l.title}</h1>
                  <p className="text-sm text-gray-400 mt-1">
                    {l.businessCompany || l.businessName}
                    {l.location && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {l.location}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-3xl font-bold text-sky-600">${Number(l.payoutAmount).toLocaleString()}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYOUT_TRIGGER_COLORS[l.payoutTrigger] || "bg-slate-100 text-slate-500"}`}>
                    {PAYOUT_TRIGGER_LABELS[l.payoutTrigger] || l.payoutTrigger}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">{l.description}</p>
            </div>

            {/* What qualifies a lead */}
            {l.requirements && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What makes a qualified lead
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">{l.requirements}</p>
              </div>
            )}

            {/* Target Audience */}
            {l.targetAudience && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Target Audience
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">{l.targetAudience}</p>
              </div>
            )}

            {/* Payout details */}
            <div className="bg-sky-50 rounded-2xl border border-sky-100 p-5">
              <h2 className="font-semibold text-sky-800 mb-3">Payout Details</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-sky-600">${Number(l.payoutAmount).toLocaleString()}</p>
                  <p className="text-xs text-sky-500 mt-0.5">Commission</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-sky-700 mt-1">
                    {PAYOUT_TRIGGER_LABELS[l.payoutTrigger] || l.payoutTrigger}
                  </p>
                  <p className="text-xs text-sky-500 mt-0.5">Paid When</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-sky-600">{l.payoutDeadlineDays ?? 30}</p>
                  <p className="text-xs text-sky-500 mt-0.5">Day Window</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-800">{l.totalSubmissions ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Leads Submitted</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{l.closedDeals ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Deals Closed</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            {isAffiliate && l.status === "active" && (
              <button
                onClick={() => setShowSubmit(true)}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-4 rounded-2xl text-sm transition-colors shadow-sm"
              >
                Submit a Qualified Lead — Earn ${Number(l.payoutAmount).toLocaleString()}
              </button>
            )}

            {l.status !== "active" && isAffiliate && (
              <div className="text-center py-4 text-sm text-gray-400">
                This offer is not currently accepting leads.
              </div>
            )}
          </div>
        )}

        {showSubmit && l && (
          <SubmitLeadModal listing={l} onClose={() => setShowSubmit(false)} />
        )}
      </div>
  );
}

function SubmitLeadModal({ listing, onClose }: { listing: any; onClose: () => void }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    leadName: "", leadEmail: "", leadPhone: "", leadCompany: "", notes: "", disclosureSigned: false,
  });
  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, listingId: listing.id }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions-mine"] });
      onClose();
      navigate("/submissions");
    },
  });

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Submit a Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          {listing.title} · <span className="text-sky-600 font-semibold">${Number(listing.payoutAmount).toLocaleString()} {PAYOUT_TRIGGER_LABELS[listing.payoutTrigger]}</span>
        </p>

        {listing.requirements && (
          <div className="bg-sky-50 rounded-xl px-4 py-3 mb-4 text-xs text-sky-700">
            <p className="font-semibold mb-0.5">Qualification criteria:</p>
            <p>{listing.requirements}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Name <span className="text-red-400">*</span></label>
            <input required value={form.leadName} onChange={(e) => update("leadName", e.target.value)} placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Email <span className="text-red-400">*</span></label>
            <input required type="email" value={form.leadEmail} onChange={(e) => update("leadEmail", e.target.value)} placeholder="lead@example.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Phone <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input value={form.leadPhone} onChange={(e) => update("leadPhone", e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Company <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input value={form.leadCompany} onChange={(e) => update("leadCompany", e.target.value)} placeholder="Company name" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-red-400">*</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Why is this a qualified lead? How do you know them?"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.disclosureSigned}
              onChange={(e) => update("disclosureSigned", e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-sky-500"
            />
            <span className="text-xs text-gray-500 leading-relaxed">
              I confirm this lead has agreed to be contacted and I have a genuine relationship with them. This constitutes my digital signature.
            </span>
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !form.leadName || !form.leadEmail || !form.notes || !form.disclosureSigned}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition"
          >
            {submit.isPending ? "Submitting…" : "Submit Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
