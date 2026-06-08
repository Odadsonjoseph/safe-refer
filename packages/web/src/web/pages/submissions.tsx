import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { DashboardLayout } from "../components/layout";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-600",
  reviewing: "bg-blue-50 text-blue-600",
  accepted: "bg-green-50 text-green-600",
  rejected: "bg-red-50 text-red-600",
  closed: "bg-slate-100 text-slate-500",
  forfeited: "bg-orange-50 text-orange-600",
};

const paymentColors: Record<string, string> = {
  unpaid: "text-slate-400",
  deposit_paid: "text-yellow-500",
  fully_paid: "text-green-500",
  transferred: "text-sky-500 font-semibold",
  refunded: "text-slate-400",
  forfeited: "text-red-400",
};

export default function SubmissionsPage() {
  const submissions = useQuery({
    queryKey: ["submissions-mine"],
    queryFn: async () => (await (api.submissions as any).mine.$get()).json(),
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Referrals</h1>
          <p className="text-slate-500 text-sm mt-1">Track every lead you've submitted</p>
        </div>

        {submissions.isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {!submissions.isLoading && !(submissions.data as any)?.submissions?.length && (
            <p className="text-center py-14 text-sm text-slate-400">No referrals yet. <Link href="/listings" className="text-sky-500 hover:underline">Browse listings →</Link></p>
          )}
          {(submissions.data as any)?.submissions?.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-medium text-slate-900 text-sm">{s.leadName}</p>
                <p className="text-slate-400 text-xs mt-0.5">{s.leadEmail} {s.leadCompany ? `· ${s.leadCompany}` : ""}</p>
                <p className="text-slate-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[s.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {s.status}
                </span>
                <span className={`text-xs ${paymentColors[s.paymentStatus] ?? "text-slate-400"}`}>
                  {s.paymentStatus === "transferred" ? `$${s.payoutAmount?.toFixed(2)} paid` : s.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
