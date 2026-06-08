import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

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

  const { data: applicationsData } = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: async () => {
      const r = await (api.admin.applications.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "applications",
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const r = await (api.admin.users.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "users",
  });

  const { data: listingsData } = useQuery({
    queryKey: ["admin", "listings"],
    queryFn: async () => {
      const r = await (api.admin.listings.$get() as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<any>;
    },
    enabled: tab === "listings",
  });

  const { data: submissionsData } = useQuery({
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

  const toggleListingMutation = useMutation({
    mutationFn: async ({ listingId, active }: { listingId: string; active: boolean }) => {
      const r = await (api.admin.listings[":listingId"].$patch({
        param: { listingId },
        json: { active },
      }) as Promise<Response>);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "stats", label: "Overview" },
    { id: "applications", label: "Applications" },
    { id: "users", label: "Users" },
    { id: "listings", label: "Listings" },
    { id: "submissions", label: "Submissions" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Safe Refer Admin</span>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-sky-600 hover:text-sky-700 font-medium"
        >
          ← Back to App
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {tab === "stats" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Platform Overview</h2>
            {statsData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: statsData.stats?.totalUsers ?? 0, color: "sky" },
                  { label: "Pending Applications", value: statsData.stats?.pendingApplications ?? 0, color: "amber" },
                  { label: "Active Listings", value: statsData.stats?.activeListings ?? 0, color: "emerald" },
                  { label: "Total Submissions", value: statsData.stats?.totalSubmissions ?? 0, color: "violet" },
                  { label: "Total Paid Out", value: `$${((statsData.stats?.totalPaidOut ?? 0) / 100).toFixed(2)}`, color: "sky" },
                  { label: "Posters", value: statsData.stats?.posters ?? 0, color: "emerald" },
                  { label: "Referrers", value: statsData.stats?.referrers ?? 0, color: "violet" },
                  { label: "Closed Deals", value: statsData.stats?.closedDeals ?? 0, color: "amber" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {tab === "applications" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Pending Applications</h2>
            {applicationsData?.applications?.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No pending applications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(applicationsData?.applications ?? []).map((app: any) => (
                  <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{app.name}</p>
                      <p className="text-sm text-gray-500">{app.email}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium capitalize">
                          {app.role}
                        </span>
                        {app.bio && (
                          <span className="text-xs text-gray-400 truncate max-w-xs">{app.bio}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
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
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">All Users</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(usersData?.users ?? []).map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium capitalize">{u.role}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          u.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                          u.status === "rejected" ? "bg-red-50 text-red-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!usersData && (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {tab === "listings" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">All Listings</h2>
            <div className="space-y-3">
              {(listingsData?.listings ?? []).map((l: any) => (
                <div key={l.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{l.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{l.posterName} · ${(l.payoutAmount / 100).toFixed(2)} payout · {l.submissionsCount ?? 0} submissions</p>
                    <div className="flex gap-2 mt-2 text-xs text-gray-400">
                      <span>Deadline: {new Date(l.deadlineDays * 24 * 60 * 60 * 1000 + new Date(l.createdAt).getTime()).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      l.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {l.active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => toggleListingMutation.mutate({ listingId: l.id, active: !l.active })}
                      disabled={toggleListingMutation.isPending}
                      className="text-sm text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
                    >
                      {l.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
              {!listingsData && (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {tab === "submissions" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">All Submissions</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Listing</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Referrer</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(submissionsData?.submissions ?? []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.leadName}</p>
                        <p className="text-xs text-gray-500">{s.leadEmail}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{s.listingTitle}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{s.referrerName}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          s.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                          s.status === "approved" ? "bg-sky-50 text-sky-700" :
                          s.status === "rejected" ? "bg-red-50 text-red-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!submissionsData && (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
