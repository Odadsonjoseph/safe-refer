import { useEffect, useState } from "react";
import { Link } from "wouter";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";

function StatCard({ label, value, sub, color = "sky" }: { label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    sky: "bg-sky-50 text-sky-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]?.split(" ")[1] || "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useSession();
  const role = (user as any)?.role as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const session = await authClient.getSession();
        const token = (session as any)?.data?.session?.token;
        const res = await fetch("/api/users/dashboard-summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } catch (e) {
        // non-fatal
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";
  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (role === "business") {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{timeOfDay()}, {firstName}</h1>
          <p className="text-gray-500 mt-1">Here's how your offers are performing.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Offers" value={data?.activeListings ?? "0"} color="sky" />
          <StatCard label="Total Submissions" value={data?.totalSubmissions ?? "0"} color="purple" />
          <StatCard label="Pending Review" value={data?.pendingSubmissions ?? "0"} sub="Needs your action" color="amber" />
          <StatCard label="Accepted Leads" value={data?.acceptedSubmissions ?? "0"} color="green" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Recent Submissions</h2>
              <Link to="/submissions" className="text-sm text-sky-500 hover:underline">View all</Link>
            </div>
            {data?.recentSubmissions?.length > 0 ? (
              <div className="space-y-3">
                {data.recentSubmissions.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.leadName}</p>
                      <p className="text-xs text-gray-400">{s.listingTitle}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      s.status === "pending" ? "bg-amber-50 text-amber-600" :
                      s.status === "accepted" ? "bg-green-50 text-green-600" :
                      "bg-red-50 text-red-500"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No submissions yet.</p>
                <Link to="/listings" className="text-sky-500 text-sm hover:underline mt-1 block">Create your first offer →</Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <Link to="/listings" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-200 hover:bg-sky-50 transition group">
                <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center group-hover:bg-sky-200 transition">
                  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Create New Offer</p>
                  <p className="text-xs text-gray-400">Post a referral opportunity</p>
                </div>
              </Link>
              <Link to="/submissions" className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-200 hover:bg-sky-50 transition group">
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Review Pending Leads</p>
                  <p className="text-xs text-gray-400">{data?.pendingSubmissions ?? 0} waiting for review</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Affiliate dashboard (default)
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{timeOfDay()}, {firstName}</h1>
        <p className="text-gray-500 mt-1">Here's your referral performance at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Earned" value={`$${(data?.totalEarned ?? 0).toFixed(2)}`} color="green" />
        <StatCard label="Pending Payout" value={`$${(data?.pendingPayout ?? 0).toFixed(2)}`} sub="Processing" color="amber" />
        <StatCard label="Leads Submitted" value={data?.totalSubmissions ?? "0"} color="sky" />
        <StatCard label="Accepted Leads" value={data?.acceptedSubmissions ?? "0"} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Referral code widget */}
        <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-6 text-white shadow-sm">
          <h2 className="font-semibold mb-1">Your Referral Link</h2>
          <p className="text-sky-100 text-sm mb-4">Earn override commissions when people you refer join as affiliates.</p>
          <div className="bg-white/20 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-mono truncate">
              {data?.referralUrl || `referrd.one/r/${(user as any)?.referralCode || "..."}`}
            </span>
            <button
              onClick={() => {
                const url = data?.referralUrl || `https://referrd.one/r/${(user as any)?.referralCode}`;
                navigator.clipboard.writeText(url);
              }}
              className="bg-white text-sky-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-sky-50 transition flex-shrink-0"
            >
              Copy
            </button>
          </div>
          <Link to="/referrals" className="text-sky-100 text-sm hover:text-white mt-3 block hover:underline">
            View referral details →
          </Link>
        </div>

        {/* Recent leads */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Leads</h2>
            <Link to="/submissions" className="text-sm text-sky-500 hover:underline">View all</Link>
          </div>
          {data?.recentSubmissions?.length > 0 ? (
            <div className="space-y-3">
              {data.recentSubmissions.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.leadName}</p>
                    <p className="text-xs text-gray-400">{s.listingTitle}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    s.status === "pending" ? "bg-amber-50 text-amber-600" :
                    s.status === "accepted" ? "bg-green-50 text-green-600" :
                    "bg-red-50 text-red-500"
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">No leads submitted yet.</p>
              <Link to="/marketplace" className="text-sky-500 text-sm hover:underline mt-1 block">Browse marketplace →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
