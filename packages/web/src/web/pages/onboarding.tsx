import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { authClient } from "../lib/auth";
import {
  User, MapPin, CreditCard, Camera, FileCheck, Phone, Building2,
  CheckCircle2, AlertCircle, Loader2, ChevronLeft, Upload, Eye, EyeOff,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const STEPS = [
  { id: 1, label: "Role", icon: User },
  { id: 2, label: "Profile", icon: User },
  { id: 3, label: "Address", icon: MapPin },
  { id: 4, label: "ID Scan", icon: CreditCard },
  { id: 5, label: "Selfie", icon: Camera },
  { id: 6, label: "Verify", icon: CheckCircle2 },
  { id: 7, label: "Terms", icon: FileCheck },
  { id: 8, label: "Contact", icon: Phone },
  { id: 9, label: "Business", icon: Building2 },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const INDUSTRIES = [
  "Real Estate","Insurance","Finance & Lending","Home Services","Legal Services",
  "Healthcare","Technology","Automotive","Education","Other",
];

async function getToken() {
  const session = await authClient.getSession();
  return (session as any)?.data?.session?.token as string | undefined;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const refCode = sessionStorage.getItem("sr_ref_code") ?? undefined;

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Role
  const [role, setRole] = useState<"affiliate" | "business" | "">("");

  // Step 2 — Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");

  // Step 3 — Address
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Step 4 — ID
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState("");
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState("");
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);

  // Step 5 — Selfie
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const selfieRef = useRef<HTMLInputElement>(null);

  // Step 6 — Verification result
  const [verifyResult, setVerifyResult] = useState<{ passed: boolean; score: number; reason?: string } | null>(null);

  // Step 7 — Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  // Step 8 — Phone
  const [phone, setPhone] = useState("");

  // Step 9 — Business (only if role === "business")
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [ein, setEin] = useState("");

  // Determine total steps based on role
  const totalSteps = role === "business" ? 9 : 8;
  const visibleSteps = STEPS.filter((s) => role !== "affiliate" || s.id !== 9);

  function progress() {
    return Math.round(((step - 1) / (totalSteps - 1)) * 100);
  }

  async function saveStep(data: Record<string, any>) {
    const token = await getToken();
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Save failed");
    }
    return res.json();
  }

  // Step 1: Role selection
  async function handleRoleSelect(r: "affiliate" | "business") {
    setRole(r);
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      await fetch("/api/users/me/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: r, referredBy: refCode }),
      });
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Profile
  async function handleProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await saveStep({ name: `${firstName} ${lastName}`.trim(), bio });
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Address
  async function handleAddress(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await saveStep({ addressLine1, addressLine2, city, state, zip });
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 4: ID upload — just advance, verification happens at step 6
  async function handleIdUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!idFrontFile) { setError("Front of ID is required"); return; }
    setStep(5);
  }

  // Step 5: Selfie upload
  async function handleSelfie(e: React.FormEvent) {
    e.preventDefault();
    if (!selfieFile) { setError("Selfie photo is required"); return; }
    setStep(6);
  }

  // Step 6: Run GPT-4 Vision verification
  async function handleVerify() {
    if (!idFrontFile || !selfieFile) return;
    setLoading(true);
    setError("");
    setVerifyResult(null);
    try {
      const idFrontBase64 = await fileToBase64(idFrontFile);
      const selfieBase64 = await fileToBase64(selfieFile);
      const token = await getToken();
      const res = await fetch("/api/users/verify-id", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ idFrontBase64, selfieBase64 }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setVerifyResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-run verify when we land on step 6
  useEffect(() => {
    if (step === 6 && !verifyResult && !loading) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Step 7: Terms
  async function handleTerms(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) { setError("You must accept the terms to continue"); return; }
    setLoading(true);
    setError("");
    try {
      await saveStep({ termsSigned: true, termsSignedAt: new Date().toISOString() });
      setStep(8);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 8: Phone — if affiliate, also finalizes; if business, goes to step 9
  async function handlePhone(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await saveStep({ phone });
      if (role === "business") {
        setStep(9);
      } else {
        // Affiliate: submit for admin review
        const token = await getToken();
        await fetch("/api/users/me/finalize-application", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        sessionStorage.removeItem("sr_pending_role");
        sessionStorage.removeItem("sr_ref_code");
        navigate("/pending");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 9: Business info + finalize
  async function handleBusiness(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await saveStep({ companyName, companyWebsite: website, industry, businessDescription: description, ein });
      const token = await getToken();
      await fetch("/api/users/me/finalize-application", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      sessionStorage.removeItem("sr_pending_role");
      sessionStorage.removeItem("sr_ref_code");
      navigate("/pending");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleIdFrontChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFrontFile(file);
    const url = URL.createObjectURL(file);
    setIdFrontPreview(url);
    setError("");
  }

  function handleIdBackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdBackFile(file);
    const url = URL.createObjectURL(file);
    setIdBackPreview(url);
    setError("");
  }

  function handleSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    const url = URL.createObjectURL(file);
    setSelfiePreview(url);
    setError("");
  }

  function handleTermsScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
      setTermsScrolled(true);
    }
  }

  function goBack() {
    if (step > 1) {
      // Skip step 6 (verify) when going back — go straight to step 5
      const prev = step === 7 ? 5 : (step - 1) as Step;
      setStep(prev);
      setError("");
      setVerifyResult(null);
    }
  }

  const stepNum = step <= 6 ? step : (role === "business" ? step : step);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow">
            <span className="text-white font-bold text-base">R</span>
          </div>
          <span className="text-sky-600 font-bold text-xl">Referrd</span>
        </div>

        {/* Progress bar */}
        {step > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">Step {step} of {totalSteps}</span>
              <span className="text-xs text-sky-600 font-semibold">{progress()}% complete</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${progress()}%` }}
              />
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {/* Back button */}
          {step > 1 && step !== 6 && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5 transition"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ─── STEP 1: Role ─── */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Referrd</h1>
              <p className="text-gray-500 text-sm mb-7">How will you be using the platform?</p>

              <div className="space-y-3">
                <button
                  onClick={() => handleRoleSelect("affiliate")}
                  disabled={loading}
                  className="w-full text-left border-2 border-gray-200 hover:border-sky-400 rounded-2xl p-5 transition group disabled:opacity-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center group-hover:bg-sky-100 transition">
                      <User size={20} className="text-sky-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">I'm an Affiliate</div>
                      <div className="text-sm text-gray-500 mt-0.5">Submit leads and earn commissions on every closed deal</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect("business")}
                  disabled={loading}
                  className="w-full text-left border-2 border-gray-200 hover:border-sky-400 rounded-2xl p-5 transition group disabled:opacity-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition">
                      <Building2 size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">I'm a Business</div>
                      <div className="text-sm text-gray-500 mt-0.5">Post referral offers and receive qualified leads from affiliates</div>
                    </div>
                  </div>
                </button>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 mt-5 text-sm text-sky-600">
                  <Loader2 size={16} className="animate-spin" /> Setting up your account...
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 2: Profile ─── */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <RoleBadge role={role as any} />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Your profile</h1>
                <p className="text-gray-500 text-sm mt-1">Tell us a bit about yourself.</p>
              </div>
              <form onSubmit={handleProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                    <input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Smith"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short bio <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your background and network..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                  />
                </div>
                <SubmitBtn loading={loading} label="Continue" />
              </form>
            </div>
          )}

          {/* ─── STEP 3: Address ─── */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <RoleBadge role={role as any} />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Your address</h1>
                <p className="text-gray-500 text-sm mt-1">Required for identity verification and tax compliance.</p>
              </div>
              <form onSubmit={handleAddress} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                  <input
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="123 Main St"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apt / Suite <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apt 4B"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Miami"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <select
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                    >
                      <option value="">—</option>
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP code</label>
                  <input
                    required
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="33101"
                    maxLength={10}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <SubmitBtn loading={loading} label="Continue" />
              </form>
            </div>
          )}

          {/* ─── STEP 4: ID Upload ─── */}
          {step === 4 && (
            <div>
              <div className="mb-6">
                <RoleBadge role={role as any} />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Upload your ID</h1>
                <p className="text-gray-500 text-sm mt-1">
                  We need a government-issued photo ID — driver's license, passport, or state ID.
                </p>
              </div>
              <form onSubmit={handleIdUpload} className="space-y-4">
                {/* Front */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Front of ID <span className="text-red-400">*</span></label>
                  <input ref={idFrontRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleIdFrontChange} />
                  {idFrontPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img src={idFrontPreview} alt="ID front" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => idFrontRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white transition"
                      >
                        Retake
                      </button>
                    </div>
                  ) : (
                    <UploadBox onClick={() => idFrontRef.current?.click()} label="Tap to upload front of ID" />
                  )}
                </div>

                {/* Back */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Back of ID <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input ref={idBackRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleIdBackChange} />
                  {idBackPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img src={idBackPreview} alt="ID back" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => idBackRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white transition"
                      >
                        Retake
                      </button>
                    </div>
                  ) : (
                    <UploadBox onClick={() => idBackRef.current?.click()} label="Tap to upload back of ID (optional)" faint />
                  )}
                </div>

                <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700">
                  Your ID is encrypted and used only for identity verification. We never share it with third parties.
                </div>

                <SubmitBtn loading={loading} label="Continue" />
              </form>
            </div>
          )}

          {/* ─── STEP 5: Selfie ─── */}
          {step === 5 && (
            <div>
              <div className="mb-6">
                <RoleBadge role={role as any} />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Take a selfie</h1>
                <p className="text-gray-500 text-sm mt-1">
                  We'll compare your face against your ID to confirm it's really you.
                </p>
              </div>
              <form onSubmit={handleSelfie} className="space-y-4">
                <input ref={selfieRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleSelfieChange} />

                {selfiePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                    <img src={selfiePreview} alt="Selfie" className="w-full h-64 object-cover object-top" />
                    <button
                      type="button"
                      onClick={() => selfieRef.current?.click()}
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white transition"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => selfieRef.current?.click()}
                    className="w-full border-2 border-dashed border-sky-200 bg-sky-50 hover:bg-sky-100 rounded-2xl p-10 flex flex-col items-center gap-3 transition"
                  >
                    <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
                      <Camera size={28} className="text-sky-400" />
                    </div>
                    <div className="text-sm font-medium text-sky-600">Tap to take selfie</div>
                    <div className="text-xs text-gray-400">Make sure your face is clearly visible and well-lit</div>
                  </button>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="font-medium text-gray-700 mb-0.5">Good lighting</div>
                    Face should be clearly lit
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="font-medium text-gray-700 mb-0.5">Look forward</div>
                    Face the camera straight on
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="font-medium text-gray-700 mb-0.5">No glasses</div>
                    Remove sunglasses if possible
                  </div>
                </div>

                <SubmitBtn loading={loading} label="Verify My Identity" disabled={!selfieFile} />
              </form>
            </div>
          )}

          {/* ─── STEP 6: Verification ─── */}
          {step === 6 && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Verifying your identity</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Our AI is comparing your ID and selfie. This takes about 10 seconds.
                </p>
              </div>

              {loading && !verifyResult && (
                <div className="flex flex-col items-center gap-5 py-10">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-sky-100 flex items-center justify-center">
                      <Loader2 size={32} className="text-sky-500 animate-spin" />
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    Analyzing your government ID and selfie photo...
                  </div>
                </div>
              )}

              {verifyResult && verifyResult.passed && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Identity Verified</h2>
                  <p className="text-gray-500 text-sm mb-1">
                    Confidence score: <span className="font-semibold text-green-600">{Math.round((verifyResult.score ?? 0) * 100)}%</span>
                  </p>
                  <p className="text-gray-400 text-xs mb-7">{verifyResult.reason}</p>
                  <button
                    onClick={() => setStep(7)}
                    className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition"
                  >
                    Continue to Terms →
                  </button>
                </div>
              )}

              {verifyResult && !verifyResult.passed && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={40} className="text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                  <p className="text-sm text-gray-500 mb-2">{verifyResult.reason || "We couldn't verify your identity."}</p>
                  <p className="text-xs text-gray-400 mb-7">
                    Please make sure your ID is clearly visible and your selfie shows your face in good lighting.
                  </p>
                  <button
                    onClick={() => {
                      setVerifyResult(null);
                      setIdFrontFile(null);
                      setIdFrontPreview("");
                      setSelfieFile(null);
                      setSelfiePreview("");
                      setStep(4);
                    }}
                    className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!loading && !verifyResult && (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 mb-4">Verification didn't start automatically.</p>
                  <button
                    onClick={handleVerify}
                    className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition"
                  >
                    Run Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 7: Terms ─── */}
          {step === 7 && (
            <div>
              <div className="mb-5">
                <RoleBadge role={role as any} />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Terms & Conditions</h1>
                <p className="text-gray-500 text-sm mt-1">Please read and accept our terms to continue.</p>
              </div>
              <form onSubmit={handleTerms} className="space-y-4">
                <div
                  ref={termsRef}
                  onScroll={handleTermsScroll}
                  className="h-56 overflow-y-auto border border-gray-200 rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-3 bg-gray-50"
                >
                  <p><strong>Referrd Platform Terms of Service</strong></p>
                  <p>By creating an account on Referrd, you agree to these terms of service ("Terms"). Please read them carefully.</p>
                  <p><strong>1. Account Eligibility.</strong> You must be at least 18 years old and a legal resident or citizen of the United States to use Referrd. By creating an account, you confirm you meet these requirements.</p>
                  <p><strong>2. Identity Verification.</strong> You consent to identity verification, including uploading a government-issued ID and selfie. Providing false identity information is grounds for immediate account termination and may be referred to law enforcement.</p>
                  <p><strong>3. Affiliate Conduct.</strong> Affiliates agree to submit only genuine leads with accurate contact information. Fabricating, duplicating, or fraudulently submitting leads is strictly prohibited and may result in account termination and forfeiture of any earnings.</p>
                  <p><strong>4. Business Conduct.</strong> Businesses agree to review leads in good faith and pay commissions for all qualified leads per the terms of their active listings. Businesses may not circumvent the platform to make direct payments to affiliates outside of Referrd.</p>
                  <p><strong>5. Payments & Commissions.</strong> All payments flow through Referrd's escrow system. The platform retains a 4% platform fee on all successful payouts. Businesses are charged a 25% deposit on lead acceptance, with the remaining 75% due upon deal closure. Failure to pay within 48 hours of the deadline triggers an automatic forfeit, and the deposit is transferred to the affiliate.</p>
                  <p><strong>6. Privacy.</strong> We collect personal information including your name, address, phone number, and identity documents for verification and compliance purposes. We do not sell your personal data to third parties. See our full Privacy Policy for details.</p>
                  <p><strong>7. Dispute Resolution.</strong> Any disputes between affiliates and businesses must first be submitted to Referrd's admin team for mediation. Referrd's decision is final on all platform disputes.</p>
                  <p><strong>8. Termination.</strong> Referrd reserves the right to suspend or terminate any account for violations of these terms, fraudulent activity, or any conduct deemed harmful to the platform or its users.</p>
                  <p><strong>9. Changes to Terms.</strong> We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
                  <p>By checking the box below, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
                  <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                {!termsScrolled && (
                  <p className="text-xs text-gray-400 text-center">↓ Scroll to the bottom to enable acceptance</p>
                )}

                <label className={`flex items-start gap-3 cursor-pointer ${!termsScrolled ? "opacity-50 pointer-events-none" : ""}`}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-sky-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the Referrd <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>
                  </span>
                </label>

                <SubmitBtn loading={loading} label="Accept & Continue" disabled={!termsAccepted} />
              </form>
            </div>
          )}

          {/* ─── STEP 8: Phone / Contact ─── */}
          {step === 8 && (
            <div>
              <div className="mb-6">
                <RoleBadge role={role as any} />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Phone number</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {role === "business"
                    ? "We'll use this to contact you about your application and leads."
                    : "We'll use this for account security and important notifications."}
                </p>
              </div>
              <form onSubmit={handlePhone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>

                {role === "affiliate" && (
                  <div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-700">
                    <strong>Almost there!</strong> After submitting, our team will review your application. You'll be notified by email once approved — usually within 24 hours.
                  </div>
                )}

                <SubmitBtn
                  loading={loading}
                  label={role === "business" ? "Continue →" : "Submit Application →"}
                />
              </form>
            </div>
          )}

          {/* ─── STEP 9: Business Info (business only) ─── */}
          {step === 9 && (
            <div>
              <div className="mb-6">
                <RoleBadge role="business" />
                <h1 className="text-2xl font-bold text-gray-900 mt-2">Business details</h1>
                <p className="text-gray-500 text-sm mt-1">Tell us about your company so we can review your application.</p>
              </div>
              <form onSubmit={handleBusiness} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
                  <input
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <select
                      required
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                    >
                      <option value="">Select...</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      EIN <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      value={ein}
                      onChange={(e) => setEin(e.target.value)}
                      placeholder="12-3456789"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business description</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does your business do and what kind of referrals are you looking for?"
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                  />
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
                  Your application will be reviewed by our team. Most approvals happen within <strong>24 hours</strong>.
                </div>
                <SubmitBtn loading={loading} label="Submit Application →" />
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: "affiliate" | "business" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
      role === "affiliate" ? "bg-sky-50 text-sky-600" : "bg-amber-50 text-amber-600"
    }`}>
      {role === "affiliate" ? <User size={12} /> : <Building2 size={12} />}
      {role === "affiliate" ? "Affiliate" : "Business"} Account
    </span>
  );
}

function SubmitBtn({ loading, label, disabled }: { loading: boolean; label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full bg-sky-500 text-white rounded-xl py-3 font-semibold hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : label}
    </button>
  );
}

function UploadBox({ onClick, label, faint }: { onClick: () => void; label: string; faint?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 transition ${
        faint
          ? "border-gray-200 bg-gray-50 hover:bg-gray-100"
          : "border-sky-200 bg-sky-50 hover:bg-sky-100"
      }`}
    >
      <Upload size={24} className={faint ? "text-gray-300" : "text-sky-400"} />
      <span className={`text-sm font-medium ${faint ? "text-gray-400" : "text-sky-600"}`}>{label}</span>
      <span className="text-xs text-gray-400">JPG, PNG, or HEIC — max 10MB</span>
    </button>
  );
}
