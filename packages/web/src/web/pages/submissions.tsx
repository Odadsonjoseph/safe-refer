import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { useAuth } from "../lib/auth";

interface Submission {
  id: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadCompany?: string;
  notes?: string;
  fitScore?: number;
  fitHints?: string;
  status: "pending" | "reviewing" | "qualified" | "accepted" | "rejected" | "closed" | "forfeited";
  paymentStatus: string;
  payoutAmount: number;
  depositAmount?: number;
  finalAmount?: number;
  paymentDeadline?: string;
  qualifiedDeadline?: string;
  listingTitle?: string;
  contactUnlocked?: boolean;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  reviewing: "bg-blue-50 text-blue-600 border-blue-200",
  qualified: "bg-indigo-50 text-indigo-600 border-indigo-200",
  accepted: "bg-green-50 text-green-600 border-green-200",
  rejected: "bg-red-50 text-red-500 border-red-200",
  closed: "bg-purple-50 text-purple-600 border-purple-200",
  forfeited: "bg-gray-100 text-gray-500 border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  reviewing: "In Review",
  qualified: "Qualified",
  accepted: "Accepted",
  rejected: "Rejected",
  closed: "Closed",
  forfeited: "Forfeited",
};

const PAY_STATUS_STYLES: Record<string, string> = {
  unpaid: "text-gray-400",
  deposit_paid: "text-blue-500",
  fully_paid: "text-green-600",
  transferred: "text-sky-500",
  forfeited: "text-red-400",
};

function TimeLeft({ deadline, label = "left" }: { deadline: string; label?: string }) {
  const d = new Date(deadline);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return <span className="text-red-500 text-xs font-medium">Deadline passed</span>;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const urgent = hours < 6;
  return (
    <span className={`text-xs font-medium ${urgent ? "text-red-500" : "text-amber-600"}`}>
      {hours}h {mins}m {label}
    </span>
  );
}

export default function Submissions() {
  const { user, loading: userLoading } = useAuth();
  const role = user?.role as string;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [payingFinal, setPayingFinal] = useState(false);

  async function getToken() {
    const session = await authClient.getSession();
    return (session as any)?.data?.session?.token;
  }

  async function load(currentRole: string) {
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = currentRole === "business" ? "/api/submissions/incoming" : "/api/submissions/mine";
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setSubmissions(d.submissions || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userLoading && role) load(role);
    else if (!userLoading && !role) setLoading(false);
  }, [userLoading, role]);

  // ── Accept: no payment, just starts qualification window ──────────────────
  async function handleAccept(sub: Submission) {
    setActionLoading(true);
    setActionError("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/submissions/${sub.id}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load(role);
      // Update selected so modal reflects new state
      setSelected((prev) => prev ? { ...prev, status: "reviewing", qualifiedDeadline: data.qualifiedDeadline } : null);
    } catch (e: any) {
      setActionError(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Qualify: triggers 25% deposit payment ─────────────────────────────────
  async function handleQualify(sub: Submission) {
    setActionLoading(true);
    setActionError("");
    try {
      const token = await getToken();
      // Step 1: mark qualified
      const qualRes = await fetch(`/api/submissions/${sub.id}/qualify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const qualData = await qualRes.json();
      if (!qualRes.ok) throw new Error(qualData.error);

      // Step 2: create deposit payment intent
      const depositRes = await fetch(`/api/stripe/deposit/${sub.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const depositData = await depositRes.json();
      if (!depositRes.ok) throw new Error(depositData.error);

      // Redirect to Payments page for card collection
      if (depositData.clientSecret) {
        window.location.href = `/payments?deposit=${sub.id}&cs=${encodeURIComponent(depositData.clientSecret)}`;
      } else {
        await load(role);
      }
    } catch (e: any) {
      setActionError(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose(sub: Submission) {
    setActionLoading(true);
    setActionError("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/submissions/${sub.id}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load(role);
      setSelected(null);
    } catch (e: any) {
      setActionError(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(sub: Submission) {
    if (!confirm("Reject this lead? This cannot be undone.")) return;
    setActionLoading(true);
    setActionError("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/submissions/${sub.id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await load(role);
      setSelected(null);
    } catch (e: any) {
      setActionError(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePayFinal(sub: Submission) {
    setPayingFinal(true);
    setActionError("");
    try {
      const token = await getToken();
      const res = await fetch(`/api/stripe/final/${sub.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.clientSecret) {
        window.location.href = `/payments?final=${sub.id}&cs=${encodeURIComponent(data.clientSecret)}`;
      } else {
        await load(role);
      }
    } catch (e: any) {
      setActionError(e.message || "Payment failed");
    } finally {
      setPayingFinal(false);
    }
  }

  const allStatuses = ["all", "pending", "reviewing", "qualified", "accepted", "closed", "rejected"];
  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {role === "business" ? "Incoming Leads" : "My Leads"}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {role === "business"
            ? "Review leads · mark qualified to unlock contact · close when deal is done"
            : "Track the status of your submitted leads and earnings"}
        </p>
      </div>

      {/* How it works — business */}
      {role === "business" && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">How it works</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-sky-700">
            <span className="bg-white rounded-lg px-3 py-1.5 font-medium border border-sky-200">1. Accept lead</span>
            <span className="text-sky-400">→</span>
            <span className="bg-white rounded-lg px-3 py-1.5 font-medium border border-sky-200">2. Review (48–96h window)</span>
            <span className="text-sky-400">→</span>
            <span className="bg-white rounded-lg px-3 py-1.5 font-medium border border-sky-200">3. Mark Qualified → pay 25% deposit → contact unlocked</span>
            <span className="text-sky-400">→</span>
            <span className="bg-white rounded-lg px-3 py-1.5 font-medium border border-sky-200">4. Close deal → pay 75% within 48h</span>
          </div>
          <p className="text-xs text-sky-600 mt-2">⚠️ Don't qualify within window = lead auto-rejected. Miss 48h final payment = deposit forfeited to affiliate.</p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {allStatuses.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition capitalize ${
              filter === f ? "bg-sky-400 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300"
            }`}
          >
            {f === "all" ? "All" : (STATUS_LABEL[f] ?? f)}
            {f !== "all" && (
              <span className={`ml-1.5 text-xs ${filter === f ? "opacity-80" : "text-gray-400"}`}>
                ({submissions.filter((s) => s.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">No {filter === "all" ? "" : filter} submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-sky-200 transition cursor-pointer"
              onClick={() => { setSelected(s); setActionError(""); }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{s.leadName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_STYLES[s.status]}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    {s.paymentStatus && s.paymentStatus !== "unpaid" && (
                      <span className={`text-xs font-medium ${PAY_STATUS_STYLES[s.paymentStatus]}`}>
                        · {s.paymentStatus.replace(/_/g, " ")}
                      </span>
                    )}
                    {role === "business" && !s.contactUnlocked && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔒 locked</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{s.listingTitle}</p>
                  {s.fitHints && role === "business" && !s.contactUnlocked && (
                    <p className="text-xs text-gray-400 mt-1 italic">{s.fitHints}</p>
                  )}
                  {/* Qualification deadline */}
                  {role === "business" && s.status === "reviewing" && s.qualifiedDeadline && (
                    <p className="text-xs mt-1">
                      <span className="text-gray-400">Qualify by: </span>
                      <TimeLeft deadline={s.qualifiedDeadline} label="to qualify" />
                    </p>
                  )}
                  {/* Final payment deadline */}
                  {role === "business" && s.status === "closed" && s.paymentDeadline && (
                    <div className="mt-1">
                      <TimeLeft deadline={s.paymentDeadline} label="to pay balance" />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sky-600">${(s.payoutAmount ?? 0).toFixed(2)}</p>
                  {/* Quick actions */}
                  {role === "business" && s.status === "pending" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(s); setActionError(""); }}
                      className="mt-2 text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
                    >
                      Review
                    </button>
                  )}
                  {role === "business" && s.status === "reviewing" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(s); setActionError(""); }}
                      className="mt-2 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                    >
                      Mark Qualified
                    </button>
                  )}
                  {role === "business" && s.status === "accepted" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClose(s); }}
                      disabled={actionLoading}
                      className="mt-2 text-xs bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition disabled:opacity-50"
                    >
                      Mark Closed
                    </button>
                  )}
                  {role === "business" && s.status === "closed" && s.paymentStatus === "deposit_paid" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePayFinal(s); }}
                      disabled={payingFinal}
                      className="mt-2 text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition disabled:opacity-50"
                    >
                      Pay Remaining
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Lead Details</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contact locked notice */}
            {role === "business" && !selected.contactUnlocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                <span className="text-amber-500 flex-shrink-0">🔒</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Contact locked</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Mark this lead as qualified and pay the 25% deposit to unlock full contact info.
                  </p>
                </div>
              </div>
            )}

            {/* Qualification window banner */}
            {role === "business" && selected.status === "reviewing" && selected.qualifiedDeadline && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-semibold text-blue-800 mb-1">Qualification Window</p>
                <TimeLeft deadline={selected.qualifiedDeadline} label="to mark qualified" />
                <p className="text-xs text-blue-600 mt-1">
                  Review the lead info. If it looks good, mark it as qualified — you'll pay the 25% deposit and contact info unlocks.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {[
                { label: "Lead Name", value: selected.leadName },
                { label: "Email", value: selected.leadEmail },
                { label: "Phone", value: selected.leadPhone || "—" },
                { label: "Company", value: selected.leadCompany || "—" },
                { label: "Listing", value: selected.listingTitle },
                { label: "Total Payout", value: `$${(selected.payoutAmount ?? 0).toFixed(2)}` },
                { label: "Deposit (25%)", value: `$${(selected.depositAmount ?? (selected.payoutAmount ?? 0) * 0.25).toFixed(2)}` },
                { label: "Final (75%)", value: `$${(selected.finalAmount ?? (selected.payoutAmount ?? 0) * 0.75).toFixed(2)}` },
                { label: "Status", value: STATUS_LABEL[selected.status] ?? selected.status },
                { label: "Payment", value: selected.paymentStatus?.replace(/_/g, " ") || "unpaid" },
                { label: "Submitted", value: new Date(selected.createdAt).toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-medium text-gray-800 text-right max-w-[60%] break-all">{item.value}</span>
                </div>
              ))}
              {selected.fitHints && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 mb-1">Teaser Info</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">{selected.fitHints}</p>
                </div>
              )}
              {selected.notes && selected.contactUnlocked && (
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.notes}</p>
                </div>
              )}
              {selected.status === "closed" && selected.paymentDeadline && role === "business" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Final Payment Deadline</p>
                  <TimeLeft deadline={selected.paymentDeadline} label="to pay" />
                  <p className="text-xs text-amber-600 mt-1">Miss this → deposit auto-forfeited to affiliate.</p>
                </div>
              )}
            </div>

            {actionError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {/* Business actions */}
            {role === "business" && (
              <div className="flex gap-3 mt-5 flex-col">
                {selected.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleAccept(selected)}
                      disabled={actionLoading}
                      className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50 text-sm"
                    >
                      {actionLoading ? "Processing…" : "Accept Lead (starts review window)"}
                    </button>
                    <button
                      onClick={() => handleReject(selected)}
                      disabled={actionLoading}
                      className="w-full bg-red-50 text-red-500 border border-red-200 rounded-xl py-2.5 font-semibold hover:bg-red-100 transition disabled:opacity-50 text-sm"
                    >
                      Reject Lead
                    </button>
                  </>
                )}
                {selected.status === "reviewing" && (
                  <>
                    <button
                      onClick={() => handleQualify(selected)}
                      disabled={actionLoading}
                      className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold hover:bg-indigo-600 transition disabled:opacity-50 text-sm"
                    >
                      {actionLoading
                        ? "Processing…"
                        : `Mark Qualified & Pay $${(selected.depositAmount ?? (selected.payoutAmount ?? 0) * 0.25).toFixed(2)} Deposit`}
                    </button>
                    <button
                      onClick={() => handleReject(selected)}
                      disabled={actionLoading}
                      className="w-full bg-red-50 text-red-500 border border-red-200 rounded-xl py-2.5 font-semibold hover:bg-red-100 transition disabled:opacity-50 text-sm"
                    >
                      Reject Lead
                    </button>
                  </>
                )}
                {selected.status === "accepted" && (
                  <button
                    onClick={() => handleClose(selected)}
                    disabled={actionLoading}
                    className="w-full bg-purple-500 text-white rounded-xl py-3 font-semibold hover:bg-purple-600 transition disabled:opacity-50 text-sm"
                  >
                    {actionLoading ? "Processing…" : "Mark Deal Closed (starts 48h payment clock)"}
                  </button>
                )}
                {selected.status === "closed" && selected.paymentStatus === "deposit_paid" && (
                  <button
                    onClick={() => handlePayFinal(selected)}
                    disabled={payingFinal}
                    className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50 text-sm"
                  >
                    {payingFinal ? "Processing…" : `Pay Remaining $${(selected.finalAmount ?? 0).toFixed(2)}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
