import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { DashboardLayout } from "../components/layout";
import { BadgeDollarSign, ExternalLink } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export default function EarningsPage() {
  const submissions = useQuery({
    queryKey: ["submissions-mine"],
    queryFn: async () => (await (api.submissions as any).mine.$get()).json(),
  });

  const connectStatus = useQuery({
    queryKey: ["stripe-connect"],
    queryFn: async () => (await (api.stripe as any).connect.status.$get()).json(),
  });

  const onboard = useMutation({
    mutationFn: async () => {
      const res = await (api.stripe as any).connect.onboard.$post({});
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
  });

  const allSubs = (submissions.data as any)?.submissions ?? [];
  const transferred = allSubs.filter((s: any) => s.paymentStatus === "transferred");
  const pending = allSubs.filter((s: any) => ["accepted", "deposit_paid", "fully_paid"].includes(s.paymentStatus));
  const totalEarned = transferred.reduce((acc: number, s: any) => acc + (s.payoutAmount ?? 0), 0);
  const pendingAmount = pending.reduce((acc: number, s: any) => acc + (s.payoutAmount ?? 0), 0);

  const connected = (connectStatus.data as any)?.connected;
  const payoutEnabled = (connectStatus.data as any)?.payoutEnabled;

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="text-slate-500 text-sm mt-1">Track your payouts</p>
        </div>

        {/* Stripe Connect status */}
        <div className={`rounded-xl border p-5 mb-6 ${payoutEnabled ? "bg-green-50 border-green-200" : "bg-sky-50 border-sky-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 text-sm">
                {payoutEnabled ? "✓ Payouts Enabled" : connected ? "Complete Stripe Setup" : "Set Up Payouts"}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {payoutEnabled
                  ? "Your Stripe Connect account is active. Earnings will be transferred automatically."
                  : "Connect your bank account via Stripe to receive payouts."}
              </p>
            </div>
            {!payoutEnabled && (
              <button
                onClick={() => onboard.mutate()}
                disabled={onboard.isPending}
                className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {onboard.isPending ? "Loading…" : "Connect Stripe"} <ExternalLink size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Earned</p>
            <p className="text-3xl font-bold text-slate-900">${totalEarned.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pending</p>
            <p className="text-3xl font-bold text-sky-500">${pendingAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Payout history */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Payout History</h2>
          </div>
          {submissions.isLoading && (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!submissions.isLoading && !transferred.length && (
            <p className="text-center py-10 text-sm text-slate-400">No payouts yet.</p>
          )}
          {transferred.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{s.leadName}</p>
                <p className="text-xs text-slate-400">{new Date(s.updatedAt).toLocaleDateString()}</p>
              </div>
              <span className="text-sm font-bold text-green-600">+${s.payoutAmount?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
