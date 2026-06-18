import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authClient, clearToken } from "../lib/auth";
import { Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

type Status = "submitted" | "approved" | "rejected" | "incomplete";

async function getToken() {
  const session = await authClient.getSession();
  return (session as any)?.data?.session?.token as string | undefined;
}

export default function PendingPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("submitted");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function checkStatus() {
    try {
      const token = await getToken();
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as any;
      const appStatus: Status = data.user?.applicationStatus ?? "submitted";
      setStatus(appStatus);
      setRejectionReason(data.user?.idRejectionReason ?? null);
      setLastChecked(new Date());

      if (appStatus === "approved") {
        // Redirect to dashboard after brief delay
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    } catch (e) {
      console.error("Status check failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
    // Poll every 15 seconds
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    await authClient.signOut();
    clearToken();
    window.location.href = "/sign-in";
  }

  async function handleReapply() {
    // Reset application status to incomplete, go back through onboarding
    const token = await getToken();
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ applicationStatus: undefined }),
    });
    navigate("/onboarding");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="text-sky-400 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="text-sky-600 font-bold text-lg">Referrd</span>
        </div>

        {/* Status: Submitted / Pending */}
        {status === "submitted" && (
          <>
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock className="text-sky-500" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Under Review</h1>
            <p className="text-slate-500 mb-2 leading-relaxed text-sm">
              Your application has been submitted and is being reviewed by our team.
              You'll receive an email once a decision is made — usually within <strong>24 hours</strong>.
            </p>
            {lastChecked && (
              <p className="text-xs text-slate-400 mb-6">
                Last checked: {lastChecked.toLocaleTimeString()} · Auto-refreshes every 15s
              </p>
            )}
            <div className="flex items-center justify-center gap-1.5 text-xs text-sky-500 mb-8">
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
              Checking for updates automatically...
            </div>
          </>
        )}

        {/* Status: Approved */}
        {status === "approved" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="text-green-500" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">You're Approved!</h1>
            <p className="text-slate-500 mb-6 text-sm">
              Welcome to Referrd. Redirecting you to your dashboard...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <Loader2 size={16} className="animate-spin" /> Taking you in...
            </div>
          </>
        )}

        {/* Status: Rejected */}
        {status === "rejected" && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <XCircle className="text-red-400" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Not Approved</h1>
            <p className="text-slate-500 mb-3 text-sm leading-relaxed">
              Unfortunately, we were unable to approve your application at this time.
            </p>
            {rejectionReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 mb-5 text-left">
                <strong>Reason:</strong> {rejectionReason}
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={handleReapply}
                className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition text-sm"
              >
                Update & Reapply
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-sm text-slate-400 hover:text-slate-600 py-2"
              >
                Sign out
              </button>
            </div>
          </>
        )}

        {/* Bottom actions for submitted state */}
        {status === "submitted" && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <button
              onClick={checkStatus}
              className="flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-700 transition"
            >
              <RefreshCw size={14} /> Check now
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-400 hover:text-slate-600 underline"
            >
              Sign out
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
