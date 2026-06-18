import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "../lib/auth";
import { useAuth } from "../lib/auth";
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  CreditCard,
  RefreshCw,
  User,
  Lock,
  Bell,
} from "lucide-react";

async function getToken() {
  const session = await authClient.getSession();
  return (session as any)?.data?.session?.token;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const token = await getToken();
  return fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers },
  });
}

export default function Settings() {
  const { user } = useAuth();
  const role = (user as any)?.role as string;
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "1";
  const isRefresh = params.get("refresh") === "1";

  const [activeTab, setActiveTab] = useState<"account" | "billing" | "notifications">("account");

  // Stripe Connect status — affiliates need this to receive payouts
  const connectStatus = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: async () => (await apiFetch("/api/stripe/connect/status")).json(),
    enabled: !!user && (role === "affiliate" || role === "both"),
  });

  // Business: saved payment methods (Stripe customer)
  const paymentMethods = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => (await apiFetch("/api/stripe/payment-methods")).json(),
    enabled: !!user && (role === "business" || role === "both"),
  });

  const onboard = useMutation({
    mutationFn: async () => (await apiFetch("/api/stripe/connect/onboard", { method: "POST" })).json(),
    onSuccess: (data: any) => { if (data.url) window.location.href = data.url; },
  });

  const addPaymentMethod = useMutation({
    mutationFn: async () => (await apiFetch("/api/stripe/setup-intent", { method: "POST" })).json(),
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const isAffiliate = role === "affiliate" || role === "both";
  const isBusiness = role === "business" || role === "both";

  const tabs = [
    { id: "account" as const, label: "Account", icon: <User size={15} /> },
    { id: "billing" as const, label: "Stripe & Payments", icon: <CreditCard size={15} /> },
    { id: "notifications" as const, label: "Notifications", icon: <Bell size={15} /> },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account, Stripe setup, and preferences</p>
      </div>

      {/* Banners */}
      {isSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-5">
          <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-800">Stripe account connected — you're set up to receive payouts.</p>
        </div>
      )}
      {isRefresh && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 mb-5">
          <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">Stripe onboarding incomplete</p>
            <p className="text-xs text-yellow-600 mt-0.5">Complete your setup to receive payouts.</p>
          </div>
          <button
            onClick={() => onboard.mutate()}
            disabled={onboard.isPending}
            className="text-xs font-semibold text-yellow-700 border border-yellow-300 px-3 py-1.5 rounded-lg hover:bg-yellow-100 flex items-center gap-1.5"
          >
            {onboard.isPending ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
            Continue
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition ${
              activeTab === t.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Profile</h2>
            <div className="space-y-3">
              {[
                { label: "Name", value: (user as any)?.name || "—" },
                { label: "Email", value: (user as any)?.email || "—" },
                { label: "Role", value: role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "—" },
                { label: "Account status", value: (user as any)?.applicationStatus || "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-medium text-slate-800 capitalize">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Password</h2>
            <p className="text-xs text-slate-400 mb-4">Change your account password.</p>
            <button
              onClick={() => authClient.changePassword && (window.location.href = "/change-password")}
              className="flex items-center gap-2 text-sm font-medium text-sky-600 border border-sky-200 px-4 py-2 rounded-lg hover:bg-sky-50 transition"
            >
              <Lock size={14} /> Change Password
            </button>
          </div>
        </div>
      )}

      {/* Billing / Stripe Tab */}
      {activeTab === "billing" && (
        <div className="space-y-4">
          {/* Affiliate: Stripe Connect payout account */}
          {isAffiliate && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Payout Account</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect Stripe to receive your 96% commission when referrals close. Required to get paid.
                  </p>
                </div>
                {connectStatus.data?.connected && (
                  <button
                    onClick={() => connectStatus.refetch()}
                    className="text-slate-400 hover:text-slate-600 transition flex-shrink-0"
                    title="Refresh status"
                  >
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>

              <div className="mt-4">
                {connectStatus.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={16} className="animate-spin" /> Checking status…
                  </div>
                ) : connectStatus.data?.connected && connectStatus.data?.payoutEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <CheckCircle size={16} /> Stripe account connected — payouts active
                    </div>
                    <button
                      onClick={() => onboard.mutate()}
                      disabled={onboard.isPending}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                    >
                      {onboard.isPending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                      Update Stripe Account
                    </button>
                  </div>
                ) : connectStatus.data?.connected ? (
                  <div className="space-y-3">
                    <p className="text-sm text-yellow-600 flex items-center gap-2">
                      <AlertCircle size={15} /> Account connected but setup incomplete
                    </p>
                    <button
                      onClick={() => onboard.mutate()}
                      disabled={onboard.isPending}
                      className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
                    >
                      {onboard.isPending ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                      Complete Stripe Setup
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <p className="text-sm font-semibold text-amber-800">Stripe not connected</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        You won't receive payouts until you connect a Stripe account. Takes ~2 minutes.
                      </p>
                    </div>
                    <button
                      onClick={() => onboard.mutate()}
                      disabled={onboard.isPending}
                      className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
                    >
                      {onboard.isPending ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                      Connect Stripe Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Business: payment card management */}
          {isBusiness && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Payment Method</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Card used to pay deposits (25%) and final balances (75%) when qualifying and closing leads.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {paymentMethods.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={16} className="animate-spin" /> Loading payment methods…
                  </div>
                ) : paymentMethods.data?.methods?.length > 0 ? (
                  <div className="space-y-3">
                    {paymentMethods.data.methods.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CreditCard size={16} className="text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-800 capitalize">
                              {m.card?.brand} •••• {m.card?.last4}
                            </p>
                            <p className="text-xs text-slate-400">
                              Expires {m.card?.exp_month}/{m.card?.exp_year}
                            </p>
                          </div>
                        </div>
                        {m.isDefault && (
                          <span className="text-xs text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addPaymentMethod.mutate()}
                      disabled={addPaymentMethod.isPending}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition"
                    >
                      {addPaymentMethod.isPending ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                      Add / Change Card
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500">
                      No saved payment method. You'll be prompted to enter card details when qualifying a lead.
                    </p>
                    <button
                      onClick={() => addPaymentMethod.mutate()}
                      disabled={addPaymentMethod.isPending}
                      className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
                    >
                      {addPaymentMethod.isPending ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                      Add Payment Method
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Escrow info */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-700 space-y-1">
            <p className="font-semibold">How escrow works</p>
            <p>• Business accepts lead → review window starts (48–96h, depends on industry)</p>
            <p>• Business marks lead as qualified → pays 25% deposit → contact info unlocks</p>
            <p>• Business closes deal → 48h to pay remaining 75%</p>
            <p>• Miss 48h deadline → deposit auto-forfeited to affiliate. Platform keeps 4%.</p>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Notifications</h2>
          <p className="text-xs text-slate-400 mb-4">Email notifications are sent automatically for key events.</p>
          <div className="space-y-3">
            {[
              { label: "New lead submitted", desc: "When an affiliate submits a lead to your offer", roles: ["business"] },
              { label: "Lead accepted", desc: "When a business accepts your submitted lead", roles: ["affiliate"] },
              { label: "Deposit paid", desc: "When a business qualifies and pays the deposit", roles: ["affiliate"] },
              { label: "Payout transferred", desc: "When your 96% commission hits your Stripe account", roles: ["affiliate"] },
              { label: "Payment deadline warning", desc: "24h before your final payment deadline", roles: ["business"] },
              { label: "Deposit forfeited", desc: "When a missed deadline triggers an auto-forfeit", roles: ["affiliate", "business"] },
            ]
              .filter((n) => !n.roles || n.roles.some((r) => r === role || role === "both"))
              .map((n) => (
                <div key={n.label} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{n.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.desc}</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <div className="w-9 h-5 bg-sky-400 rounded-full flex items-center px-0.5">
                      <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Notification preferences coming soon — all emails are currently enabled.</p>
        </div>
      )}
    </div>
  );
}
