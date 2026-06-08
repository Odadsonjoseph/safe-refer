import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { DashboardLayout } from "../components/layout";
import { ArrowLeft, MapPin, Building2, DollarSign } from "lucide-react";
import { useState } from "react";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  const [showSubmit, setShowSubmit] = useState(false);
  const qc = useQueryClient();

  const listing = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => (await api.listings[":id"].$get({ param: { id } })).json(),
    enabled: !!id,
  });

  const l = (listing.data as any)?.listing;

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <button onClick={() => navigate("/listings")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5">
          <ArrowLeft size={15} /> Back to Listings
        </button>

        {listing.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {l && (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{l.industry}</span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{l.dealType}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"}`}>{l.status}</span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">{l.title}</h1>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-sky-600">${l.payoutAmount.toFixed(0)}</p>
                  <p className="text-xs text-slate-400">{l.payoutTrigger}</p>
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-5">{l.description}</p>

              <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1"><Building2 size={13} />{l.posterCompany ?? l.posterName}</span>
                {l.location && <span className="flex items-center gap-1"><MapPin size={13} />{l.location}</span>}
                <span>{l.totalSubmissions} referrals submitted</span>
                <span>Deadline: {l.payoutDeadlineDays} days</span>
              </div>
            </div>

            {(user?.role === "referrer" || user?.role === "both") && l.status === "active" && (
              <button
                onClick={() => setShowSubmit(true)}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                Submit a Referral
              </button>
            )}

            {showSubmit && <SubmitReferralModal listing={l} onClose={() => setShowSubmit(false)} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SubmitReferralModal({ listing, onClose }: { listing: any; onClose: () => void }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    leadName: "", leadEmail: "", leadPhone: "", leadCompany: "", notes: "",
    disclosureSigned: false,
  });
  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = useMutation({
    mutationFn: async () => {
      const res = await api.submissions.$post({ json: { ...form, listingId: listing.id } });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions-mine"] });
      onClose();
      navigate("/submissions");
    },
  });

  const F = ({ label, name, placeholder, type = "text", required = false }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} value={(form as any)[name]} onChange={(e) => update(name, e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Submit a Referral</h2>
        <p className="text-sm text-slate-500 mb-5">{listing.title} · <span className="text-sky-600 font-semibold">${listing.payoutAmount}</span> payout</p>
        <div className="space-y-3">
          <F label="Lead Name" name="leadName" placeholder="Jane Doe" required />
          <F label="Lead Email" name="leadEmail" type="email" placeholder="jane@company.com" required />
          <F label="Lead Phone" name="leadPhone" placeholder="+1 (555) 000-0000" />
          <F label="Lead Company" name="leadCompany" placeholder="Company Inc." />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes<span className="text-red-400 ml-0.5">*</span></label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)}
              placeholder="Why is this lead a good fit? Share any context…"
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.disclosureSigned} onChange={(e) => update("disclosureSigned", e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-sky-500" />
            <span className="text-xs text-slate-500">I confirm this lead has agreed to be contacted and I have a genuine relationship with them. I understand this constitutes a digital signature.</span>
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !form.leadName || !form.leadEmail || !form.notes || !form.disclosureSigned}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {submit.isPending ? "Submitting…" : "Submit Referral"}
          </button>
        </div>
      </div>
    </div>
  );
}
