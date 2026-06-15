import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";
import { DashboardLayout } from "../components/layout";
import { ListChecks, FileText, BadgeDollarSign, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const user = session?.user as any;

  const listings = useQuery({
    queryKey: ["listings"],
    queryFn: async () => (await api.listings.$get()).json(),
  });

  const submissions = useQuery({
    queryKey: ["submissions-mine"],
    queryFn: async () => (await (api.submissions as any).mine.$get()).json(),
  });

  const listingCount = (listings.data as any)?.listings?.length ?? 0;
  const subCount = (submissions.data as any)?.submissions?.length ?? 0;
  const earnings = (submissions.data as any)?.submissions
    ?.filter((s: any) => s.paymentStatus === "transferred")
    ?.reduce((acc: number, s: any) => acc + (s.payoutAmount ?? 0), 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Good {getTimeOfDay()}, {user?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Here's your overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Active Listings" value={listingCount} icon={<ListChecks className="text-sky-500" size={20} />} loading={listings.isLoading} />
          <StatCard label="My Referrals" value={subCount} icon={<FileText className="text-sky-500" size={20} />} loading={submissions.isLoading} />
          <StatCard label="Total Earned" value={`$${earnings.toFixed(2)}`} icon={<BadgeDollarSign className="text-sky-500" size={20} />} loading={submissions.isLoading} />
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Listings</h2>
            <Link href="/listings" className="text-sky-500 text-sm font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {listings.isLoading && (
              <div className="px-5 py-10 text-center">
                <div className="w-6 h-6 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
            {!listings.isLoading && listingCount === 0 && (
              <p className="px-5 py-8 text-sm text-slate-400 text-center">No listings yet.</p>
            )}
            {(listings.data as any)?.listings?.slice(0, 5).map((l: any) => (
              <Link key={l.id} href={`/listings/${l.id}`}>
                <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{l.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{l.posterCompany ?? l.posterName} · {l.industry}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sky-600 text-sm">${l.payoutAmount?.toFixed(0)}</p>
                    <p className="text-slate-400 text-xs">{l.payoutTrigger}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon, loading }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
