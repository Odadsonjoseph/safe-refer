import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";

interface ReferralData {
  referralCode: string;
  referralUrl: string;
  referredUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    totalSubmissions: number;
    overrideEarned: number;
  }>;
  overrideEarned: number;
  overridePending: number;
}

export default function Referrals() {
  const { user } = useSession();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const session = await authClient.getSession();
        const token = (session as any)?.data?.session?.token;
        const res = await fetch("/api/users/referrals", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function copyLink() {
    const url = data?.referralUrl || `https://referrd.one/r/${(user as any)?.referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const referralCode = data?.referralCode || (user as any)?.referralCode || "—";
  const referralUrl = data?.referralUrl || `https://referrd.one/r/${referralCode}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <p className="text-gray-500 text-sm mt-0.5">Earn override commissions when people you refer submit leads</p>
      </div>

      {/* Referral link card */}
      <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-6 text-white mb-6 shadow-sm">
        <h2 className="font-semibold text-lg mb-1">Your Referral Link</h2>
        <p className="text-sky-100 text-sm mb-5">
          Share this link to invite other affiliates. You'll earn a percentage of every payout they receive — passively.
        </p>
        <div className="bg-white/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
          <span className="flex-1 text-sm font-mono truncate">{referralUrl}</span>
          <button
            onClick={copyLink}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition ${
              copied ? "bg-green-400 text-white" : "bg-white text-sky-600 hover:bg-sky-50"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-xl px-4 py-2">
            <p className="text-sky-100 text-xs">Your Code</p>
            <p className="font-mono font-bold text-lg">{referralCode}</p>
          </div>
        </div>
      </div>

      {/* Override earnings */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Override Earned</p>
          <p className="text-2xl font-bold text-purple-600">${(data?.overrideEarned || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">From your referrals' activity</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Referred Affiliates</p>
          <p className="text-2xl font-bold text-sky-600">{data?.referredUsers?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Active in your network</p>
        </div>
      </div>

      {/* Referred users list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Your Referred Affiliates</h2>
        </div>
        {!data?.referredUsers?.length ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium">No referrals yet</p>
            <p className="text-sm mt-1">Share your link to start building your network.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.referredUsers.map((u) => (
              <div key={u.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sky-600 font-semibold text-sm">
                      {(u.name || u.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-purple-600">+${u.overrideEarned.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">{u.totalSubmissions} leads</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="mt-6 bg-gray-50 rounded-2xl p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-3">How override commissions work</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
            <p>Share your referral link with others you'd like to recruit as affiliates.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
            <p>When they sign up and submit leads that get accepted, you earn an override commission.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
            <p>Override commissions are paid out by Referrd — no action required from you.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
