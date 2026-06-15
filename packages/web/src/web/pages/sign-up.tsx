import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient, captureToken } from "../lib/auth";
import { Building2, Users, ArrowRight, Mail, Lock, User, Loader2, ChevronLeft } from "lucide-react";

type Step = "role" | "credentials";

export default function SignUpPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"affiliate" | "business" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicMode, setMagicMode] = useState(false);

  // Capture referral code from URL
  const ref = new URLSearchParams(window.location.search).get("ref") ?? "";

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.signUp.email(
        { name, email, password },
        { onSuccess: captureToken, onError: (ctx) => setError(ctx.error?.message ?? "Sign up failed.") }
      );
      if (!res.error) {
        // Store role + referral code for onboarding
        sessionStorage.setItem("sr_pending_role", role ?? "affiliate");
        if (ref) sessionStorage.setItem("sr_ref_code", ref);
        navigate("/onboarding");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    sessionStorage.setItem("sr_pending_role", role ?? "affiliate");
    if (ref) sessionStorage.setItem("sr_ref_code", ref);
    await authClient.signIn.social({ provider: "google", callbackURL: "/onboarding" });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await (authClient as any).signIn.magicLink({ email, callbackURL: "/onboarding" });
      sessionStorage.setItem("sr_pending_role", role ?? "affiliate");
      setMagicSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to send link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-sky-500 p-12">
        <div>
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-8">
            <span className="text-sky-500 font-black text-lg">SR</span>
          </div>
          <h1 className="text-white font-bold text-3xl leading-tight">Join the referral economy.</h1>
          <p className="text-sky-100 mt-4 text-base leading-relaxed">
            Connect businesses with warm leads and earn when deals close.
          </p>
          <div className="mt-10 space-y-5">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-semibold text-sm mb-1">Affiliates</p>
              <p className="text-sky-100 text-xs">Browse offers, submit leads, earn commissions and overrides.</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-semibold text-sm mb-1">Businesses</p>
              <p className="text-sky-100 text-xs">Post offers, get warm leads from our affiliate network.</p>
            </div>
          </div>
        </div>
        <p className="text-sky-200 text-sm">© 2025 Safe Refer. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SR</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">Safe Refer</span>
          </div>

          {step === "role" && (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">How will you use Safe Refer?</h2>
              <p className="text-slate-500 text-sm mb-8">Choose your role to get started</p>
              <div className="space-y-3">
                <button
                  onClick={() => setRole("affiliate")}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    role === "affiliate"
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${role === "affiliate" ? "bg-sky-500" : "bg-slate-100"}`}>
                      <Users size={18} className={role === "affiliate" ? "text-white" : "text-slate-500"} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Affiliate</p>
                      <p className="text-slate-500 text-xs mt-0.5">Browse offers, submit leads, earn commissions + overrides</p>
                    </div>
                    {role === "affiliate" && <div className="ml-auto w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                  </div>
                </button>
                <button
                  onClick={() => setRole("business")}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    role === "business"
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${role === "business" ? "bg-sky-500" : "bg-slate-100"}`}>
                      <Building2 size={18} className={role === "business" ? "text-white" : "text-slate-500"} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Business</p>
                      <p className="text-slate-500 text-xs mt-0.5">Post offers, get warm leads from our affiliate network</p>
                    </div>
                    {role === "business" && <div className="ml-auto w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                  </div>
                </button>
              </div>
              <button
                disabled={!role}
                onClick={() => setStep("credentials")}
                className="w-full mt-6 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={15} />
              </button>
              <p className="text-center text-slate-500 text-sm mt-6">
                Already have an account? <Link href="/sign-in" className="text-sky-500 font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {step === "credentials" && !magicSent && (
            <>
              <button onClick={() => setStep("role")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
                <ChevronLeft size={15} /> Back
              </button>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${role === "affiliate" ? "bg-sky-50 text-sky-600" : "bg-emerald-50 text-emerald-600"}`}>
                {role === "affiliate" ? <Users size={12} /> : <Building2 size={12} />}
                {role === "affiliate" ? "Affiliate" : "Business"}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h2>
              <p className="text-slate-500 text-sm mb-6">Get started in under 2 minutes</p>

              {!magicMode ? (
                <>
                  <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-2.5 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-4">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </button>
                  <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or</span></div>
                  </div>
                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith"
                          className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                          className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Min 8 characters"
                          className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
                      </div>
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"><p className="text-red-600 text-sm">{error}</p></div>}
                    <button type="submit" disabled={loading}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                      {loading ? "Creating account…" : "Create Account"}
                    </button>
                  </form>
                  <button onClick={() => setMagicMode(true)} className="w-full text-center text-sm text-sky-500 hover:underline mt-3">
                    Sign up with magic link instead
                  </button>
                </>
              ) : (
                <>
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                          className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent" />
                      </div>
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"><p className="text-red-600 text-sm">{error}</p></div>}
                    <button type="submit" disabled={loading}
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                      {loading ? "Sending…" : "Send Magic Link"}
                    </button>
                  </form>
                  <button onClick={() => setMagicMode(false)} className="w-full text-center text-sm text-sky-500 hover:underline mt-3">
                    Use email + password instead
                  </button>
                </>
              )}

              <p className="text-center text-slate-500 text-sm mt-6">
                Already have an account? <Link href="/sign-in" className="text-sky-500 font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {magicSent && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-sky-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h2>
              <p className="text-slate-500 text-sm">We sent a sign-in link to <strong>{email}</strong>. It expires in 10 minutes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
