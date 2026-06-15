import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";

interface EarningsData {
  totalEarned: number;
  pendingPayout: number;
  overrideEarned: number;
  overridePending: number;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    type: string;
    leadName?: string;
    listingTitle?: string;
    createdAt: string;
  }>;
}

export default function Earnings() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "direct" | "override">("all");

  useEffect(() => {
    async function load() {
      try {
        const session = await authClient.getSession();
        const token = (session as any)?.data?.session?.token;
        const res = await fetch("/api/users/earnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalAll = (data?.totalEarned || 0) + (data?.overrideEarned || 0);
  const pendingAll = (data?.pendingPayout || 0) + (data?.overridePending || 0);

  const filtered = (data?.payouts || []).filter(
    (p) => filter === "all" || p.type === filter
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your referral and override commission history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-green-600">${totalAll.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Pending Payout</p>
          <p className="text-2xl font-bold text-amber-500">${pendingAll.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Processing</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Direct Referrals</p>
          <p className="text-2xl font-bold text-sky-600">${(data?.totalEarned || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Lead payouts</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Override Commissions</p>
          <p className="text-2xl font-bold text-purple-600">${(data?.overrideEarned || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">From your referrals</p>
        </div>
      </div>

      {/* Payout info banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <svg className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-sky-800">Payouts processed by Safe Refer</p>
          <p className="text-sm text-sky-600 mt-0.5">All payouts are handled directly by our admin team. Funds are transferred once your lead is accepted and verified.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "direct", "override"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${
              filter === f ? "bg-sky-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Payout history */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">No earnings yet</p>
          <p className="text-sm mt-1">Submit leads to start earning.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Description</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{p.leadName || "Override commission"}</p>
                    {p.listingTitle && <p className="text-xs text-gray-400">{p.listingTitle}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      p.type === "override" ? "bg-purple-50 text-purple-600" : "bg-sky-50 text-sky-600"
                    }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-green-600">
                    +${p.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      p.status === "transferred" ? "bg-green-50 text-green-600" :
                      p.status === "pending" ? "bg-amber-50 text-amber-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
