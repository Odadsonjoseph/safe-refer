import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  BarChart3, Users, ListChecks, FileText, ArrowLeft, DollarSign,
  Search, ChevronDown, ChevronUp, CheckCircle, XCircle, RefreshCcw,
  Trash2, Shield, ShieldOff, Eye, EyeOff, AlertTriangle
} from "lucide-react";

type Tab = "stats" | "applications" | "users" | "listings" | "submissions" | "payouts";
type AppFilter = "submitted" | "approved" | "rejected" | "all";

// ── helpers ──────────────────────────────────────────────────────────────────
const token = () => localStorage.getItem("safe_refer_token") ?? "";
const authFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}`, ...(opts.headers ?? {}) } });

// ── component ─────────────────────────────────────────────────────────────────
export default function Admin() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("stats");

  // ── applications ───────────────────────────────────────────
  const [appFilter, setAppFilter] = useState<AppFilter>("submitted");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ userId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // ── users ──────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userStatusModal, setUserStatusModal] = useState<{ userId: string; name: string; currentStatus: string } | null>(null);
  const [userStatusValue, setUserStatusValue] = useState("");
  const [userRejectReason, setUserRejectReason] = useState("");

  // ── submissions ────────────────────────────────────────────
  const [subAdminNotes, setSubAdminNotes] = useState<Record<string, string>>({});

  // ─── queries ─────────────────────────────────────────────────────────────────
  const { data: statsData } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const r = await (api.admin.stats.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "stats",
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ["admin", "applications", appFilter],
    queryFn: async () => {
      const r = await authFetch(`/api/admin/applications?status=${appFilter}`);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "applications",
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users", userSearch, userRoleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      if (userRoleFilter !== "all") params.set("role", userRoleFilter);
      const r = await authFetch(`/api/admin/users?${params.toString()}`);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "users",
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ["admin", "listings"],
    queryFn: async () => {
      const r = await (api.admin.listings.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "listings",
  });

  const { data: submissionsData, isLoading: subsLoading } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: async () => {
      const r = await (api.admin.submissions.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "submissions",
  });

  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ["admin", "payouts"],
    queryFn: async () => {
      const r = await authFetch("/api/admin/payouts");
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "payouts",
  });

  // ─── mutations ────────────────────────────────────────────────────────────────

  // Approve/reject application
  const appActionMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: string; action: "approve" | "reject"; reason?: string }) => {
      const r = await authFetch(`/api/admin/applications/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setRejectModal(null);
      setRejectReason("");
    },
  });

  // Update user (role, status, isAdmin, etc.)
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, any> }) => {
      const r = await authFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setUserStatusModal(null);
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const r = await authFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteConfirm(null);
    },
  });

  // Toggle listing
  const toggleListingMutation = useMutation({
    mutationFn: async ({ listingId, active }: { listingId: string; active: boolean }) => {
      const r = await authFetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  // Delete listing
  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const r = await authFetch(`/api/admin/listings/${listingId}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  // Update submission status
  const updateSubmissionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const r = await authFetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "submissions"] }),
  });

  // Mark payout transferred
  const markPaidMutation = useMutation({
    mutationFn: async ({ id, adminNotes }: { id: string; adminNotes?: string }) => {
      const r = await authFetch(`/api/admin/payouts/${id}/mark-paid`, {
        method: "PATCH",
        body: JSON.stringify({ adminNotes }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "payouts"] }),
  });

  // ─── tabs config ─────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "stats", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "applications", label: "Applications", icon: <FileText size={14} /> },
    { id: "users", label: "Users", icon: <Users size={14} /> },
    { id: "listings", label: "Listings", icon: <ListChecks size={14} /> },
    { id: "submissions", label: "Submissions", icon: <FileText size={14} /> },
    { id: "payouts", label: "Payouts", icon: <DollarSign size={14} /> },
  ];

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-semibold text-slate-900">Admin Panel</span>
        </div>
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium">
          <ArrowLeft size={14} /> Back to App
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-8 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id ? "bg-sky-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── STATS ── */}
        {tab === "stats" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Platform Overview</h2>
            {!statsData ? <Spinner /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {[
                    { label: "Total Users", value: statsData.stats?.users ?? 0 },
                    { label: "Affiliates", value: statsData.stats?.affiliates ?? 0 },
                    { label: "Businesses", value: statsData.stats?.businesses ?? 0 },
                    { label: "Pending Applications", value: statsData.stats?.pendingApplications ?? 0, highlight: (statsData.stats?.pendingApplications ?? 0) > 0 },
                  ].map((s) => (
                    <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.highlight ? "border-amber-300" : "border-slate-200"}`}>
                      <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.highlight ? "text-amber-600" : "text-slate-900"}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Active Listings", value: statsData.stats?.listings ?? 0 },
                    { label: "Total Submissions", value: statsData.stats?.submissions ?? 0 },
                    { label: "Total Paid Out", value: `$${(statsData.stats?.totalPaidOut ?? 0).toFixed(2)}`, sky: true },
                    { label: "Pending Payouts", value: `$${(statsData.stats?.pendingPayouts ?? 0).toFixed(2)}`, warn: (statsData.stats?.pendingPayouts ?? 0) > 0 },
                  ].map((s) => (
                    <div key={s.label} className={`bg-white rounded-xl border p-5 ${(s as any).warn ? "border-amber-300" : "border-slate-200"}`}>
                      <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${(s as any).sky ? "text-sky-600" : (s as any).warn ? "text-amber-600" : "text-slate-900"}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── APPLICATIONS ── */}
        {tab === "applications" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Applications</h2>
              <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
                {(["submitted", "approved", "rejected", "all"] as AppFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAppFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                      appFilter === f ? "bg-sky-500 text-white" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {appsLoading && <Spinner />}
            {!appsLoading && !(applicationsData?.applications?.length) && (
              <EmptyState message={`No ${appFilter === "all" ? "" : appFilter} applications`} />
            )}

            <div className="space-y-3">
              {(applicationsData?.applications ?? []).map((app: any) => {
                const isExpanded = expandedApp === app.id;
                return (
                  <div key={app.id} className="bg-white rounded-xl border border-slate-200">
                    {/* Row */}
                    <div className="p-5 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{app.name}</p>
                          <RoleBadge role={app.role} />
                          <StatusBadge status={app.applicationStatus} />
                          {app.idVerified ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">
                              ✓ ID {Math.round((app.idVerificationScore ?? 0) * 100)}%
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600">✗ No ID</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{app.email}</p>
                        {app.phone && <p className="text-xs text-slate-400">{app.phone}</p>}
                        {app.idRejectionReason && (
                          <p className="text-xs text-red-500 mt-1">Rejection reason: {app.idRejectionReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                          title="View details"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        {app.applicationStatus !== "approved" && (
                          <button
                            onClick={() => appActionMutation.mutate({ userId: app.id, action: "approve" })}
                            disabled={appActionMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}
                        {app.applicationStatus !== "rejected" && (
                          <button
                            onClick={() => { setRejectModal({ userId: app.id, name: app.name }); setRejectReason(""); }}
                            disabled={appActionMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        )}
                        {(app.applicationStatus === "approved" || app.applicationStatus === "rejected") && (
                          <button
                            onClick={() => appActionMutation.mutate({ userId: app.id, action: "approve" })}
                            disabled={appActionMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                            title="Re-open to submitted"
                          >
                            <RefreshCcw size={12} /> Re-open
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 rounded-b-xl grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {app.addressLine1 && (
                          <Field label="Address" value={`${app.addressLine1}${app.addressLine2 ? `, ${app.addressLine2}` : ""}, ${app.city}, ${app.state} ${app.zip}`} />
                        )}
                        {app.role === "business" && app.companyName && (
                          <Field label="Company" value={`${app.companyName}${app.industry ? ` · ${app.industry}` : ""}`} />
                        )}
                        {app.role === "business" && app.businessDescription && (
                          <Field label="Description" value={app.businessDescription} />
                        )}
                        {app.role === "affiliate" && app.bio && (
                          <Field label="Bio" value={app.bio} />
                        )}
                        <Field label="Terms" value={app.termsSigned ? `Signed${app.termsSignedAt ? ` ${new Date(app.termsSignedAt).toLocaleDateString()}` : ""}` : "Not signed"} />
                        <Field label="Joined" value={new Date(app.createdAt).toLocaleString()} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">All Users</h2>

            {/* Search + filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="all">All roles</option>
                <option value="affiliate">Affiliates</option>
                <option value="business">Businesses</option>
              </select>
            </div>

            {usersLoading ? <Spinner /> : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                {!(usersData?.users?.length) ? (
                  <EmptyState message="No users found" />
                ) : (
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["Name / Email", "Role", "App Status", "Admin", "Joined", "Actions"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(usersData?.users ?? []).map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50 group">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </td>
                          <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                          <td className="px-4 py-3"><StatusBadge status={u.applicationStatus} /></td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => updateUserMutation.mutate({ userId: u.id, updates: { isAdmin: !u.isAdmin } })}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                                u.isAdmin ? "bg-violet-100 text-violet-700 hover:bg-violet-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {u.isAdmin ? "Admin" : "User"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* Approve */}
                              {u.applicationStatus !== "approved" && (
                                <ActionBtn
                                  title="Approve"
                                  onClick={() => updateUserMutation.mutate({ userId: u.id, updates: { applicationStatus: "approved" } })}
                                  color="emerald"
                                  icon={<CheckCircle size={13} />}
                                />
                              )}
                              {/* Reject */}
                              {u.applicationStatus !== "rejected" && (
                                <ActionBtn
                                  title="Reject"
                                  onClick={() => { setUserStatusModal({ userId: u.id, name: u.name, currentStatus: u.applicationStatus }); setUserStatusValue("rejected"); setUserRejectReason(""); }}
                                  color="red"
                                  icon={<XCircle size={13} />}
                                />
                              )}
                              {/* Suspend (set back to incomplete) */}
                              {u.applicationStatus === "approved" && (
                                <ActionBtn
                                  title="Suspend"
                                  onClick={() => updateUserMutation.mutate({ userId: u.id, updates: { applicationStatus: "incomplete" } })}
                                  color="amber"
                                  icon={<ShieldOff size={13} />}
                                />
                              )}
                              {/* Delete */}
                              <ActionBtn
                                title="Delete user"
                                onClick={() => setDeleteConfirm(u.id)}
                                color="slate"
                                icon={<Trash2 size={13} />}
                                danger
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LISTINGS ── */}
        {tab === "listings" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Listings</h2>
            {listingsLoading ? <Spinner /> : !(listingsData?.listings?.length) ? <EmptyState message="No listings yet" /> : (
              <div className="space-y-3">
                {(listingsData?.listings ?? []).map((l: any) => {
                  const isActive = l.status === "active";
                  return (
                    <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-slate-900">{l.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {l.status ?? (isActive ? "active" : "inactive")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {l.posterCompany ?? l.posterName} &middot; ${l.payoutAmount?.toFixed(2)} payout &middot; {l.totalSubmissions ?? 0} submissions
                        </p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {l.industry && <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">{l.industry}</span>}
                          {l.dealType && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{l.dealType}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleListingMutation.mutate({ listingId: l.id, active: !isActive })}
                          disabled={toggleListingMutation.isPending}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            isActive
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {isActive ? "Pause" : "Activate"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete listing "${l.title}"? This cannot be undone.`)) {
                              deleteListingMutation.mutate(l.id);
                            }
                          }}
                          disabled={deleteListingMutation.isPending}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete listing"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SUBMISSIONS ── */}
        {tab === "submissions" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Submissions</h2>
            {subsLoading ? <Spinner /> : !(submissionsData?.submissions?.length) ? <EmptyState message="No submissions yet" /> : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Lead", "Affiliate", "Listing", "Status", "Payout", "Payment", "Change Status", "Notes", "Date"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(submissionsData?.submissions ?? []).map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{s.leadName}</p>
                          <p className="text-xs text-slate-400">{s.leadEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{s.affiliateName ?? "—"}</p>
                          <p className="text-xs text-slate-400">{s.affiliateEmail ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[140px] truncate">{s.listingTitle ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">${s.payoutAmount?.toFixed(2) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.paymentStatus === "transferred" ? "bg-emerald-50 text-emerald-700" :
                            s.paymentStatus === "deposit_paid" ? "bg-sky-50 text-sky-700" :
                            "bg-amber-50 text-amber-600"
                          }`}>
                            {s.paymentStatus ?? "unpaid"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            defaultValue={s.status}
                            onChange={(e) => updateSubmissionMutation.mutate({ id: s.id, updates: { status: e.target.value } })}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                          >
                            {["pending", "reviewing", "accepted", "rejected", "closed"].map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="Admin note…"
                              value={subAdminNotes[s.id] ?? (s.adminNotes ?? "")}
                              onChange={(e) => setSubAdminNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                            <button
                              onClick={() => updateSubmissionMutation.mutate({ id: s.id, updates: { adminNotes: subAdminNotes[s.id] ?? s.adminNotes } })}
                              className="text-xs px-2 py-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 font-medium"
                            >
                              Save
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── PAYOUTS ── */}
        {tab === "payouts" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Payout Management</h2>
                <p className="text-sm text-slate-500 mt-0.5">Accepted submissions — transfer affiliate payments here.</p>
              </div>
            </div>
            {payoutsLoading ? <Spinner /> : !(payoutsData?.payouts?.length) ? <EmptyState message="No pending payouts" /> : (
              <div className="space-y-3">
                {payoutsData.payouts.map((p: any) => {
                  const total = p.payoutAmount ?? 0;
                  const deposit = +(total * 0.25).toFixed(2);
                  const final = +(total * 0.75).toFixed(2);
                  const affiliateEarns = +(total * 0.96).toFixed(2);

                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-900">{p.leadName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              p.paymentStatus === "transferred" ? "bg-emerald-50 text-emerald-700" :
                              p.paymentStatus === "deposit_paid" ? "bg-sky-50 text-sky-700" :
                              "bg-amber-50 text-amber-600"
                            }`}>
                              {p.paymentStatus ?? "unpaid"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{p.listingTitle ?? "—"}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Affiliate: <span className="font-medium text-slate-600">{p.affiliateName ?? "—"}</span>
                            {p.affiliateEmail ? ` · ${p.affiliateEmail}` : ""}
                          </p>
                          {/* Payout split breakdown */}
                          <div className="flex gap-4 mt-3 flex-wrap">
                            <div className="bg-slate-50 rounded-lg px-3 py-2 text-center min-w-[90px]">
                              <p className="text-xs text-slate-400">Total</p>
                              <p className="text-sm font-bold text-slate-900">${total.toFixed(2)}</p>
                            </div>
                            <div className="bg-sky-50 rounded-lg px-3 py-2 text-center min-w-[90px]">
                              <p className="text-xs text-sky-500">Deposit (25%)</p>
                              <p className="text-sm font-bold text-sky-700">${deposit.toFixed(2)}</p>
                            </div>
                            <div className="bg-sky-50 rounded-lg px-3 py-2 text-center min-w-[90px]">
                              <p className="text-xs text-sky-500">Final (75%)</p>
                              <p className="text-sm font-bold text-sky-700">${final.toFixed(2)}</p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-center min-w-[90px]">
                              <p className="text-xs text-emerald-500">Affiliate gets (96%)</p>
                              <p className="text-sm font-bold text-emerald-700">${affiliateEarns.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                          {p.paymentStatus !== "transferred" && (
                            <button
                              onClick={() => markPaidMutation.mutate({ id: p.id })}
                              disabled={markPaidMutation.isPending}
                              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition"
                            >
                              Mark Transferred
                            </button>
                          )}
                          {p.acceptedAt && (
                            <p className="text-xs text-slate-400">Accepted {new Date(p.acceptedAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── REJECT MODAL (applications) ── */}
      {rejectModal && (
        <Modal onClose={() => setRejectModal(null)}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <XCircle size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Reject Application</h3>
              <p className="text-sm text-slate-500">Rejecting <strong>{rejectModal.name}</strong></p>
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Reason <span className="text-slate-400 font-normal">(optional — sent to applicant)</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Incomplete information, could not verify identity…"
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={() => setRejectModal(null)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => appActionMutation.mutate({ userId: rejectModal.userId, action: "reject", reason: rejectReason || undefined })}
              disabled={appActionMutation.isPending}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
            >
              Confirm Reject
            </button>
          </div>
        </Modal>
      )}

      {/* ── REJECT MODAL (users tab) ── */}
      {userStatusModal && (
        <Modal onClose={() => setUserStatusModal(null)}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Reject User</h3>
              <p className="text-sm text-slate-500">Rejecting <strong>{userStatusModal.name}</strong></p>
            </div>
          </div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Reason <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={userRejectReason}
            onChange={(e) => setUserRejectReason(e.target.value)}
            placeholder="Reason for rejection…"
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setUserStatusModal(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => updateUserMutation.mutate({
                userId: userStatusModal.userId,
                updates: { applicationStatus: "rejected", ...(userRejectReason ? { idRejectionReason: userRejectReason } : {}) },
              })}
              disabled={updateUserMutation.isPending}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
            >
              Confirm Reject
            </button>
          </div>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Delete User</h3>
              <p className="text-sm text-slate-500">This permanently removes the user and all their data. Cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => deleteUserMutation.mutate(deleteConfirm)}
              disabled={deleteUserMutation.isPending}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition"
            >
              Yes, Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700",
    active: "bg-emerald-50 text-emerald-700",
    accepted: "bg-emerald-50 text-emerald-700",
    transferred: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
    submitted: "bg-sky-50 text-sky-700",
    reviewing: "bg-sky-50 text-sky-700",
    deposit_paid: "bg-sky-50 text-sky-700",
    pending: "bg-amber-50 text-amber-700",
    closed: "bg-slate-100 text-slate-500",
    incomplete: "bg-slate-100 text-slate-500",
    paused: "bg-slate-100 text-slate-500",
    unpaid: "bg-amber-50 text-amber-600",
    fully_paid: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${role === "affiliate" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
      {role}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ActionBtn({
  title, onClick, color, icon, danger
}: {
  title: string; onClick: () => void; color: string; icon: React.ReactNode; danger?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 hover:bg-emerald-50",
    red: "text-red-500 hover:bg-red-50",
    amber: "text-amber-500 hover:bg-amber-50",
    slate: danger ? "text-red-400 hover:bg-red-50" : "text-slate-500 hover:bg-slate-100",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${colorMap[color] ?? "text-slate-500 hover:bg-slate-100"}`}
    >
      {icon}
    </button>
  );
}
