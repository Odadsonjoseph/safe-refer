import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient } from "../lib/auth";

export default function SignIn() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"email" | "magic">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState("");

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await (authClient as any).signIn.magicLink({ email: magicEmail });
      if (res?.error) throw new Error(res.error.message);
      setMagicSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-400 to-sky-600 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow">
              <span className="text-sky-500 font-bold text-lg">S</span>
            </div>
            <span className="text-white font-bold text-xl">Safe Refer</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Welcome back.
          </h2>
          <p className="text-sky-100 text-lg">
            Sign in to access your dashboard, track submissions, and manage your referrals.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: "💰", text: "Track your earnings in real time" },
            { icon: "📋", text: "Manage listings and submissions" },
            { icon: "🔒", text: "Secure, verified marketplace" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-white">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sky-100">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-sky-600 font-bold text-lg">Safe Refer</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h1>
          <p className="text-gray-500 mb-8">
            Don't have an account?{" "}
            <Link to="/sign-up" className="text-sky-500 font-medium hover:underline">
              Sign up
            </Link>
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 font-medium hover:bg-gray-50 transition mb-6 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Tabs */}
          <div className="flex border border-gray-200 rounded-xl p-1 mb-6">
            {(["email", "magic"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  tab === t ? "bg-sky-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "email" ? "Password" : "Magic Link"}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {tab === "email" ? (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-sky-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <div>
              {magicSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Check your email</h3>
                  <p className="text-gray-500 text-sm">
                    We sent a magic link to <strong>{magicEmail}</strong>. Click it to sign in.
                  </p>
                  <button
                    onClick={() => { setMagicSent(false); setMagicEmail(""); }}
                    className="mt-4 text-sky-500 text-sm hover:underline"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send Magic Link"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
