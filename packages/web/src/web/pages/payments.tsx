import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { DashboardLayout } from "../components/layout";
import { CheckCircle, AlertCircle, ExternalLink, CreditCard, Loader2 } from "lucide-react";

export default function PaymentsPage() {
  const [, navigate] = useLocation();
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  const qc = useQueryClient();

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "1";
  const isRefresh = params.get("refresh") === "1";

  // Stripe Connect status (for referrers)
  const connectStatus = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: async () => (await (api.stripe as any).connect.status.$get()).json(),
    enabled: !!user,
  });

  // Poster's accepted submissions that need payment
  const posterSubmissions = useQuery({
    queryKey: ["poster-submissions-pay"],
    queryFn: async () => (await (api.submissions as any).poster.$get()).json(),
    enabled: !!user,
  });

  const onboard = useMutation({
    mutationFn: async () => {
      const res = await (api.stripe as any).connect.onboard.$post();
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
  });

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage payouts and pay accepted referrals</p>
        </div>

        {/* Stripe Connect return banners */}
        {isSuccess && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Stripe account connected</p>
              <p className="text-xs text-green-600 mt-0.5">You're set up to receive payouts. Funds will transfer automatically once a referral is approved.</p>
            </div>
          </div>
        )}
        {isRefresh && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
            <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Stripe onboarding incomplete</p>
              <p className="text-xs text-yellow-600 mt-0.5">Please complete Stripe setup to receive payouts.</p>
            </div>
            <button
              onClick={() => onboard.mutate()}
              disabled={onboard.isPending}
              className="ml-auto text-xs font-semibold text-yellow-700 border border-yellow-300 px-3 py-1.5 rounded-lg hover:bg-yellow-100 flex items-center gap-1.5"
            >
              {onboard.isPending ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
              Continue setup
            </button>
          </div>
        )}

        {/* Referrer: Stripe Connect panel */}
        {(user?.role === "referrer" || user?.role === "both") && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-3">Payout Account</h2>
            {connectStatus.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Checking status…
              </div>
            ) : connectStatus.data?.connected && connectStatus.data?.payoutEnabled ? (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle size={16} /> Stripe account connected and active
              </div>
            ) : connectStatus.data?.connected && !connectStatus.data?.payoutEnabled ? (
              <div className="space-y-3">
                <p className="text-sm text-yellow-600 flex items-center gap-2"><AlertCircle size={15} /> Account connected but setup incomplete</p>
                <button
                  onClick={() => onboard.mutate()}
                  disabled={onboard.isPending}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  {onboard.isPending ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                  Complete Stripe Setup
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Connect your Stripe account to receive payouts when referrals are approved.</p>
                <button
                  onClick={() => onboard.mutate()}
                  disabled={onboard.isPending}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  {onboard.isPending ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                  Connect Stripe
                </button>
              </div>
            )}
          </div>
        )}

        {/* Poster: pay accepted submissions */}
        {(user?.role === "poster" || user?.role === "both" || user?.isAdmin) && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Accepted Referrals — Awaiting Payment</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pay out referrers for accepted leads</p>
            </div>

            {posterSubmissions.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !(posterSubmissions.data as any)?.submissions?.filter((s: any) => s.status === "accepted" && s.paymentStatus !== "transferred")?.length ? (
              <p className="text-center py-12 text-sm text-slate-400">No pending payments</p>
            ) : (
              <div>
                {(posterSubmissions.data as any)?.submissions
                  ?.filter((s: any) => s.status === "accepted" && s.paymentStatus !== "transferred")
                  .map((s: any) => (
                    <PaySubmissionRow key={s.id} submission={s} onPaid={() => qc.invalidateQueries({ queryKey: ["poster-submissions-pay"] })} />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function PaySubmissionRow({ submission: s, onPaid }: { submission: any; onPaid: () => void }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await (api.stripe as any).pay[s.id].$post();
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      // For now we just mark as initiated — full Stripe.js flow would go here
      // clientSecret: data.clientSecret
      alert("Payment intent created. Integrate Stripe.js Elements here for full card collection flow.");
      onPaid();
    } catch {
      setError("Payment failed. Try again.");
    } finally {
      setPaying(false);
    }
  };

  const paymentStatusColor: Record<string, string> = {
    unpaid: "text-slate-400",
    deposit_paid: "text-yellow-500",
    fully_paid: "text-green-600",
    transferred: "text-sky-500",
    forfeited: "text-red-400",
  };

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="font-medium text-slate-900 text-sm">{s.leadName}</p>
        <p className="text-xs text-slate-400 mt-0.5">{s.leadEmail}{s.leadCompany ? ` · ${s.leadCompany}` : ""}</p>
        <p className="text-xs text-slate-400">{s.listingTitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-sky-600">${(s.payoutAmount ?? 0).toFixed(2)}</p>
          <p className={`text-xs ${paymentStatusColor[s.paymentStatus] ?? "text-slate-400"}`}>{s.paymentStatus}</p>
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>
        <button
          onClick={pay}
          disabled={paying}
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {paying ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
          Pay
        </button>
      </div>
    </div>
  );
}
