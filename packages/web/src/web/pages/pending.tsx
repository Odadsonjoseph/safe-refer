import { authClient, clearToken } from "../lib/auth";
import { Clock } from "lucide-react";

export default function PendingPage() {
  async function handleSignOut() {
    await authClient.signOut();
    clearToken();
    window.location.href = "/sign-in";
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock className="text-sky-500" size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Under Review</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Your application has been submitted. Our team will review it and you'll receive an email once approved. This typically takes 1–2 business days.
        </p>
        <button
          onClick={handleSignOut}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
