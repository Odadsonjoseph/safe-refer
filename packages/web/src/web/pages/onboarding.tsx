import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authClient } from "../lib/auth";

export default function Onboarding() {
  const [, navigate] = useLocation();
  const role = sessionStorage.getItem("sr_pending_role") as "affiliate" | "business" | null;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Affiliate fields
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  // Business fields
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [bizPhone, setBizPhone] = useState("");

  useEffect(() => {
    if (!role) navigate("/sign-up");
  }, [role, navigate]);

  async function submitAffiliate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await authClient.getSession();
      const token = (session as any)?.data?.session?.token;
      const res = await fetch("/api/users/me/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: "affiliate", phone, bio }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to complete profile");
      }
      sessionStorage.removeItem("sr_pending_role");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitBusiness(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await authClient.getSession();
      const token = (session as any)?.data?.session?.token;
      const res = await fetch("/api/users/me/set-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: "business",
          companyName,
          website,
          industry,
          description,
          phone: bizPhone,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit application");
      }
      sessionStorage.removeItem("sr_pending_role");
      navigate("/pending");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const industries = [
    "Real Estate", "Insurance", "Finance & Lending",
    "Home Services", "Legal Services", "Healthcare",
    "Technology", "Automotive", "Education", "Other",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <span className="text-sky-600 font-bold text-xl">Safe Refer</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {role === "affiliate" ? (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-600 px-3 py-1 rounded-full text-sm font-medium mb-3">
                  <span>Affiliate Account</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
                <p className="text-gray-500 mt-1">You'll be approved instantly and can start submitting leads right away.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={submitAffiliate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Bio <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell businesses a bit about yourself and your network..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                  />
                </div>

                <div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-700">
                  <strong>Instant approval</strong> — once you submit, you'll go straight to your dashboard. No waiting required.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                >
                  {loading ? "Setting up your account..." : "Start Referring →"}
                </button>
              </form>
            </>
          ) : (
            <>
              {step === 1 && (
                <>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-medium mb-3">
                      <span>Business Account</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Tell us about your business</h1>
                    <p className="text-gray-500 mt-1">Your application will be reviewed by our team. Most approvals happen within 24 hours.</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Corp"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                      <select
                        required
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                      >
                        <option value="">Select industry...</option>
                        {industries.map((i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition"
                    >
                      Continue →
                    </button>
                  </form>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="mb-6">
                    <button onClick={() => setStep(1)} className="text-sm text-sky-500 hover:underline mb-3 block">
                      ← Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">A bit more detail</h1>
                    <p className="text-gray-500 mt-1">This helps our team verify your business quickly.</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <form onSubmit={submitBusiness} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={bizPhone}
                        onChange={(e) => setBizPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
                      <textarea
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what your business does and what kind of referrals you're looking for..."
                        rows={4}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                      />
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
                      Your application will be reviewed and you'll be notified within <strong>24 hours</strong>.
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                    >
                      {loading ? "Submitting application..." : "Submit Application →"}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
