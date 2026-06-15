import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { BarChart3, Users, ListChecks, FileText, ArrowLeft } from "lucide-react";

type Tab = "stats" | "applications" | "users" | "listings" | "submissions";

export default function Admin() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("stats");

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
    queryKey: ["admin", "applications"],
    queryFn: async () => {
      const r = await (api.admin.applications.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "applications",
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const r = await (api.admin.users.$get() as Promise<Response>);
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

  const approveMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "approve" | "reject" }) => {
      const r = await (api.admin.applications[":userId"].$patch({
        param: { userId },
        json: { action },
      }) as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const r = await (api.admin.users[":userId"] as any).admin.$patch({
        param: { userId },
        json: { isAdmin },
      }) as Promise<Response>;
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const toggleListingMutation = useMutation({
    mutationFn: async ({ listingId, active }: { listingId: string; active: boolean }) => {
      const r = await (api.admin.listings[":listingId"] as any).$patch({
        param: { listingId },
        json: { active },
      }) as Promise<Response>;
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  const updateSubmissionMutation = useMutation({
    mutationFn: async ({ submissionId, status }: { submissionId: string; status: string }) => {
      const r = await fetch(`/api/submissions/${submissionId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("safe_refer_token") ?? ""}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "submissions"] }),
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "stats", label: "Overview", icon: <BarChart3 size={15} /> },
    { id: "applications", label: "Applications", icon: <FileText size={15} /> },
    { id: "users", label: "Users", icon: <Users size={15} /> },
    { id: "listings", label: "Listings", icon: <ListChecks size={15} /> },
    { id: "submissions", label: "Submissions", icon: <FileText size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SR</span>
          </div>
          <span className="font-semibold text-slate-900">Admin Panel</span>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          <ArrowLeft size={14} /> Back to App
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit mb-8 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {tab === "stats" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Platform Overview</h2>
            {!statsData ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: statsData.stats?.users ?? 0 },
                  { label: "Pending Applications", value: statsData.stats?.pendingApplications ?? 0 },
                  { label: "Active Listings", value: statsData.stats?.listings ?? 0 },
                  { label: "Total Submissions", value: statsData.stats?.submissions ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {tab === "applications" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Pending Applications</h2>
            {appsLoading && <Spinner />}
            {!appsLoading && applicationsData?.applications?.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500">No pending applications</p>
              </div>
            )}
            <div className="space-y-3">
              {(applicationsData?.applications ?? []).map((app: any) => (
                <div key={app.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{app.name}</p>
                    <p className="text-sm text-slate-500">{app.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium capitalize">
                        {app.role}
                      </span>
                      {app.phone && (
                        <span className="text-xs text-slate-400">{app.phone}</span>
                      )}
                    </div>
                    {app.bio && (
                      <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{app.bio}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveMutation.mutate({ userId: app.id, action: "approve" })}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ userId: app.id, action: "reject" })}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Users</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {usersLoading ? <Spinner /> : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Name", "Email", "Role", "Status", "Admin", "Joined"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(usersData?.users ?? []).map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{u.name}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium capitalize">{u.role}</span>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={u.applicationStatus} />
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => toggleAdminMutation.mutate({ userId: u.id, isAdmin: !u.isAdmin })}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                              u.isAdmin ? "bg-violet-100 text-violet-700 hover:bg-violet-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {u.isAdmin ? "Admin" : "User"}
                          </button>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {tab === "listings" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Listings</h2>
            {listingsLoading ? <Spinner /> : (
              <div className="space-y-3">
                {(listingsData?.listings ?? []).map((l: any) => (
                  <div key={l.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{l.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {l.posterCompany ?? l.posterName} &middot; ${l.payoutAmount?.toFixed(2)} payout &middot; {l.totalSubmissions ?? 0} submissions
                      </p>
                      <div className="flex gap-2 mt-2">
                        {l.industry && <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">{l.industry}</span>}
                        {l.dealType && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{l.dealType}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        l.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {l.status ?? (l.active ? "active" : "inactive")}
                      </span>
                      <button
                        onClick={() => toggleListingMutation.mutate({ listingId: l.id, active: l.status !== "active" })}
                        disabled={toggleListingMutation.isPending}
                        className="text-sm text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
                      >
                        {l.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
                {!(listingsData?.listings?.length) && (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-500">No listings yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {tab === "submissions" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">All Submissions</h2>
            {subsLoading ? <Spinner /> : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {!(submissionsData?.submissions?.length) ? (
                  <p className="text-center py-12 text-sm text-slate-400">No submissions yet</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {["Lead", "Referrer", "Status", "Payout", "Submitted", "Action"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(submissionsData?.submissions ?? []).map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium text-slate-900">{s.leadName}</p>
                            <p className="text-xs text-slate-500">{s.leadEmail}</p>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">{s.referrerId?.slice(0, 8)}...</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-slate-900">
                            ${s.payoutAmount?.toFixed(2) ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <select
                              defaultValue={s.status}
                              onChange={(e) => updateSubmissionMutation.mutate({ submissionId: s.id, status: e.target.value })}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                            >
                              {["pending", "reviewing", "accepted", "rejected", "closed"].map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
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
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700",
    active: "bg-emerald-50 text-emerald-700",
    accepted: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
    submitted: "bg-sky-50 text-sky-700",
    pending: "bg-amber-50 text-amber-700",
    reviewing: "bg-sky-50 text-sky-700",
    closed: "bg-slate-100 text-slate-500",
    incomplete: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${colors[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
