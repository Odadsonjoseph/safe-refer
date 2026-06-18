import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";

import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Loader2,
  Clock,
  DollarSign,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

export default function PaymentsPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user as any;
  const qc = useQueryClient();

  const params = new URLSearchParams(window.location.search);
  const isSuccess = params.get("success") === "1";
  const isRefresh = params.get("refresh") === "1";
  const paymentDone = params.get("paid") === "1";
  const inlineClientSecret = params.get("cs") || "";
  const depositSubId = params.get("deposit") || "";
  const finalSubId = params.get("final") || "";
  const isInlinePayment = !!(inlineClientSecret && (depositSubId || finalSubId));

  // Stripe Connect status (referrers)
  const connectStatus = useQuery({
    queryKey: ["stripe-connect-status"],
    queryFn: async () => (await (api.stripe as any).connect.status.$get()).json(),
    enabled: !!user && (user?.role === "referrer" || user?.role === "both"),
  });

  // Poster's submissions needing payment
  const posterSubmissions = useQuery({
    queryKey: ["poster-submissions-pay"],
    queryFn: async () => (await (api.submissions as any).poster.$get()).json(),
    enabled: !!user && !isInlinePayment,
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

  const allSubs: any[] = (posterSubmissions.data as any)?.submissions ?? [];
  const awaitingDeposit = allSubs.filter(
    (s) => s.status === "accepted" && (!s.paymentStatus || s.paymentStatus === "unpaid")
  );
  const awaitingFinal = allSubs.filter(
    (s) => s.status === "closed" && s.paymentStatus === "deposit_paid"
  );

  const isPosterOrAdmin = user?.role === "poster" || user?.role === "both" || user?.isAdmin;
  const isReferrer = user?.role === "referrer" || user?.role === "both";

  // ─── Inline card payment mode ─────────────────────────────────────────────
  if (isInlinePayment) {
    const payType = depositSubId ? "deposit" : "final";
    const label = payType === "deposit" ? "25% Deposit" : "75% Final Payment";

    return (
      <>
        <div className="max-w-lg space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Complete Payment</h1>
            <p className="text-slate-500 text-sm mt-1">Pay {label} — held securely in escrow</p>
          </div>

          <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-3 flex items-center gap-2 text-xs text-sky-700">
            <Lock size={13} className="text-sky-500 flex-shrink-0" />
            <span>Payment is processed securely by Stripe. Funds held in escrow until referral closes.</span>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret: inlineClientSecret }}>
            <InlineCardForm
              clientSecret={inlineClientSecret}
              payType={payType}
              onSuccess={() => {
                window.location.href = "/payments?paid=1";
              }}
            />
          </Elements>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">
            Escrow-backed referral payouts — deposit on acceptance, balance on close
          </p>
        </div>

        {/* Banners */}
        {paymentDone && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Payment successful</p>
              <p className="text-xs text-green-600 mt-0.5">
                Funds are held in escrow and will transfer to the referrer automatically when the deal closes.
              </p>
            </div>
          </div>
        )}
        {isSuccess && !paymentDone && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Stripe account connected</p>
              <p className="text-xs text-green-600 mt-0.5">You're set up to receive payouts automatically.</p>
            </div>
          </div>
        )}
        {isRefresh && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
            <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Stripe onboarding incomplete</p>
              <p className="text-xs text-yellow-600 mt-0.5">Complete setup to receive payouts.</p>
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

        {/* Referrer: Payout Account */}
        {isReferrer && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Payout Account</h2>
            <p className="text-xs text-slate-400 mb-4">
              Connect Stripe to receive your 96% payout when referrals are closed and paid.
            </p>
            {connectStatus.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Checking status…
              </div>
            ) : connectStatus.data?.connected && connectStatus.data?.payoutEnabled ? (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle size={16} /> Stripe account connected — payouts active
              </div>
            ) : connectStatus.data?.connected ? (
              <div className="space-y-3">
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <AlertCircle size={15} /> Account connected but setup incomplete
                </p>
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
                <p className="text-sm text-slate-500">
                  Connect your Stripe account to receive payouts when referrals close.
                </p>
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

        {/* Escrow info banner */}
        {isPosterOrAdmin && (
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 text-xs text-sky-700">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-sky-500 flex-shrink-0" />
              <span><strong>Escrow protected</strong> — funds held safely until you confirm the referral closed.</span>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto whitespace-nowrap">
              <CreditCard size={14} className="text-sky-500 flex-shrink-0" />
              <span><strong>25%</strong> on accept · <strong>75%</strong> on close · <strong>48h</strong> to pay or deposit forfeits</span>
            </div>
          </div>
        )}

        {/* Poster: Awaiting Deposit */}
        {isPosterOrAdmin && (
          <SubmissionPaySection
            title="Step 1 — Pay Deposit (25%)"
            subtitle="Accept a lead by paying 25% upfront into escrow. Referrer earns this if you don't close."
            icon={<DollarSign size={16} className="text-sky-500" />}
            submissions={awaitingDeposit}
            loading={posterSubmissions.isLoading}
            emptyText="No leads awaiting deposit"
            payType="deposit"
            onPaid={() => qc.invalidateQueries({ queryKey: ["poster-submissions-pay"] })}
          />
        )}

        {/* Poster: Awaiting Final */}
        {isPosterOrAdmin && (
          <SubmissionPaySection
            title="Step 2 — Pay Balance (75%)"
            subtitle="Lead closed successfully — pay the remaining 75% within 48 hours to release payout to referrer."
            icon={<Clock size={16} className="text-amber-500" />}
            submissions={awaitingFinal}
            loading={posterSubmissions.isLoading}
            emptyText="No closed leads awaiting final payment"
            payType="final"
            onPaid={() => qc.invalidateQueries({ queryKey: ["poster-submissions-pay"] })}
          />
        )}
      </div>
    </>
  );
}

// ─── Inline Stripe card form ──────────────────────────────────────────────────
function InlineCardForm({
  clientSecret,
  payType,
  onSuccess,
}: {
  clientSecret: string;
  payType: "deposit" | "final";
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");
    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (result.error) {
        setError(result.error.message || "Payment failed");
      } else if (result.paymentIntent?.status === "succeeded") {
        onSuccess();
      }
    } catch (e: any) {
      setError(e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Card details</label>
        <div className="border border-slate-300 rounded-lg px-4 py-3 focus-within:ring-2 focus-within:ring-sky-400 focus-within:border-sky-400 transition-all">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "15px",
                  color: "#1e293b",
                  "::placeholder": { color: "#94a3b8" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {paying ? (
          <><Loader2 size={16} className="animate-spin" /> Processing…</>
        ) : (
          <><Lock size={15} /> Pay {payType === "deposit" ? "25% Deposit" : "75% Balance"} Securely</>
        )}
      </button>

      <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
        <Lock size={11} /> Secured by Stripe — your card info is never stored
      </p>
    </form>
  );
}

// ─── Section component ────────────────────────────────────────────────────────
function SubmissionPaySection({
  title,
  subtitle,
  icon,
  submissions,
  loading,
  emptyText,
  payType,
  onPaid,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  submissions: any[];
  loading: boolean;
  emptyText: string;
  payType: "deposit" | "final";
  onPaid: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !submissions.length ? (
        <p className="text-center py-10 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div>
          {submissions.map((s) => (
            <PayRow key={s.id} submission={s} payType={payType} onPaid={onPaid} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Individual row ───────────────────────────────────────────────────────────
function PayRow({
  submission: s,
  payType,
  onPaid,
}: {
  submission: any;
  payType: "deposit" | "final";
  onPaid: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const depositAmt = (s.depositAmount ?? (s.payoutAmount ?? 0) * 0.25).toFixed(2);
  const finalAmt = (s.finalAmount ?? (s.payoutAmount ?? 0) * 0.75).toFixed(2);
  const amount = payType === "deposit" ? depositAmt : finalAmt;

  const deadline = s.paymentDeadline ? new Date(s.paymentDeadline) : null;
  const hoursLeft = deadline
    ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 36e5))
    : null;

  const pay = async () => {
    setPaying(true);
    setError("");
    try {
      const endpoint = payType === "deposit"
        ? `/api/stripe/deposit/${s.id}`
        : `/api/stripe/final/${s.id}`;
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      if (data.clientSecret) {
        const qp = payType === "deposit" ? `deposit=${s.id}` : `final=${s.id}`;
        window.location.href = `/payments?${qp}&cs=${encodeURIComponent(data.clientSecret)}`;
      }
    } catch {
      setError("Payment failed. Try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="px-5 py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 text-sm truncate">{s.leadName}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {s.leadEmail}{s.leadCompany ? ` · ${s.leadCompany}` : ""}
          </p>
          <p className="text-xs text-slate-400 truncate">{s.listingTitle}</p>
          {hoursLeft !== null && payType === "final" && (
            <p className={`text-xs mt-1 font-medium ${hoursLeft < 6 ? "text-red-500" : "text-amber-500"}`}>
              ⏱ {hoursLeft}h remaining to pay
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-sky-600">${amount}</p>
            <p className="text-xs text-slate-400">of ${(s.payoutAmount ?? 0).toFixed(2)} total</p>
            {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
          </div>
          <button
            onClick={pay}
            disabled={paying}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {paying ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
            {payType === "deposit" ? "Pay Deposit" : "Pay Balance"}
          </button>
        </div>
      </div>
    </div>
  );
}
