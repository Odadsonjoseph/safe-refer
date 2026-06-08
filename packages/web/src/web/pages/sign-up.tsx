import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient, captureToken } from "../lib/auth";

export default function SignUpPage() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"referrer" | "poster" | "both">("referrer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await authClient.signUp.email(
      { name, email, password },
      { onSuccess: captureToken }
    );
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Sign up failed");
    } else {
      navigate("/onboarding");
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="hidden lg:flex flex-col justify-between w-96 bg-sky-500 p-12">
        <div>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-8">
            <span className="text-sky-500 font-black text-lg">SR</span>
          </div>
          <h1 className="text-white font-bold text-3xl leading-tight">Join the referral economy.</h1>
          <p className="text-sky-100 mt-4 text-base leading-relaxed">
            Connect companies with warm leads and earn when deals close.
          </p>
        </div>
        <p className="text-sky-200 text-sm">© 2025 Safe Refer. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SR</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">Safe Refer</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Create an account</h2>
          <p className="text-slate-500 text-sm mb-8">Get started in under 2 minutes</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">I want to…</label>
              <div className="grid grid-cols-3 gap-2">
                {(["referrer", "poster", "both"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-colors ${
                      role === r
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
                    }`}
                  >
                    {r === "referrer" ? "Refer Leads" : r === "poster" ? "Post Listings" : "Both"}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-sky-500 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
