import { useEffect, useState } from "react";
import { authClient } from "../lib/auth";
import { useSession } from "../hooks/useSession";

interface Submission {
  id: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  notes?: string;
  status: "pending" | "accepted" | "rejected";
  paymentStatus?: string;
  payoutAmount: number;
  listingTitle: string;
  businessName?: string;
  affiliateName?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600",
  accepted: "bg-green-50 text-green-600",
  rejected: "bg-red-50 text-red-500",
};

export default function Submissions() {
  const { user } = useSession();
  const role = (user as any)?.role as string;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [updating, setUpdating] = useState(false);

  async function getToken() {
    const session = await authClient.getSession();
    return (session as any)?.data?.session?.token;
  }

  async function load() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/submissions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setSubmissions(d.submissions || d);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: "accepted" | "rejected") {
    setUpdating(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/submissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await load();
        setSelected(null);
      }
    } finally {
      setUpdating(false);
    }
  }

  const filtered = submissions.filter((s) => filter === "all" || s.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {role === "business" ? "Incoming Leads" : "My Leads"}
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {role === "business" ? "Review and accept leads from affiliates" : "Track the status of your submitted leads"}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize ${
              filter === f ? "bg-sky-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300"
            }`}
          >
            {f}
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
          <div className="w-7 h-7 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
              onClick={() => setSelected(s)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{s.leadName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s.status]}`}>
                      {s.status}
                    </span>
                    {s.paymentStatus && s.paymentStatus !== "unpaid" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-sky-50 text-sky-600">
                        {s.paymentStatus}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{s.listingTitle}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {role === "business" ? `from ${s.affiliateName}` : `at ${s.businessName}`}
                    {" · "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sky-600">${s.payoutAmount}</p>
                  {role === "business" && s.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(s.id, "accepted"); }}
                        disabled={updating}
                        className="text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(s.id, "rejected"); }}
                        disabled={updating}
                        className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Lead Details</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Lead Name", value: selected.leadName },
                { label: "Email", value: selected.leadEmail },
                { label: "Phone", value: selected.leadPhone || "—" },
                { label: "Listing", value: selected.listingTitle },
                { label: "Payout", value: `$${selected.payoutAmount}` },
                { label: "Status", value: selected.status },
                { label: "Submitted", value: new Date(selected.createdAt).toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-medium text-gray-800">{item.value}</span>
                </div>
              ))}
              {selected.notes && (
                <div className="pt-2">
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.notes}</p>
                </div>
              )}
            </div>
            {role === "business" && selected.status === "pending" && (
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => updateStatus(selected.id, "accepted")}
                  disabled={updating}
                  className="flex-1 bg-green-500 text-white rounded-xl py-3 font-semibold hover:bg-green-600 transition disabled:opacity-50"
                >
                  Accept Lead
                </button>
                <button
                  onClick={() => updateStatus(selected.id, "rejected")}
                  disabled={updating}
                  className="flex-1 bg-red-50 text-red-500 border border-red-200 rounded-xl py-3 font-semibold hover:bg-red-100 transition disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
