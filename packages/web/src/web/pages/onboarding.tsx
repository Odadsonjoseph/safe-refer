import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient } from "../lib/auth";

const steps = ["Profile", "Identity", "W-9", "Review"];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { data: session } = authClient.useSession();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    phone: "",
    bio: "",
    skills: "",
    linkedinUrl: "",
    companyName: "",
    companyWebsite: "",
    industry: "",
    idFrontUrl: "",
    idBackUrl: "",
    selfieUrl: "",
    w9LegalName: "",
    w9Ssn: "",
    w9Address: "",
    w9City: "",
    w9State: "",
    w9Zip: "",
  });

  const user = session?.user as any;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.users.me.$patch({ json: data });
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await (api.users.me as any)["submit-application"].$post({});
      return res.json();
    },
    onSuccess: () => navigate("/pending"),
  });

  async function handleNext() {
    if (step < steps.length - 1) {
      await saveMutation.mutateAsync(form);
      setStep((s) => s + 1);
    } else {
      await saveMutation.mutateAsync({ ...form, w9Completed: true });
      await submitMutation.mutateAsync();
    }
  }

  const Field = ({ label, name, type = "text", placeholder = "" }: any) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={(form as any)[name]}
        onChange={(e) => update(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SR</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">Safe Refer</span>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-sky-500 text-white" : i === step ? "bg-sky-100 text-sky-600 ring-2 ring-sky-400" : "bg-slate-200 text-slate-400"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === step ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-lg">Complete your profile</h3>
              <Field label="Phone Number" name="phone" placeholder="+1 (555) 000-0000" />
              <Field label="Bio" name="bio" placeholder="Tell us about yourself…" />
              {(user?.role === "referrer" || user?.role === "both") && (
                <>
                  <Field label="Skills / Expertise" name="skills" placeholder="e.g. SaaS sales, real estate, finance" />
                  <Field label="LinkedIn URL" name="linkedinUrl" placeholder="https://linkedin.com/in/..." />
                </>
              )}
              {(user?.role === "poster" || user?.role === "both") && (
                <>
                  <Field label="Company Name" name="companyName" placeholder="Acme Corp" />
                  <Field label="Company Website" name="companyWebsite" placeholder="https://..." />
                  <Field label="Industry" name="industry" placeholder="e.g. Technology, Finance" />
                </>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-lg">Identity Verification</h3>
              <p className="text-sm text-slate-500">We need to verify your identity to enable payouts.</p>
              <Field label="ID Front (URL)" name="idFrontUrl" placeholder="Paste URL to front of ID" />
              <Field label="ID Back (URL)" name="idBackUrl" placeholder="Paste URL to back of ID" />
              <Field label="Selfie (URL)" name="selfieUrl" placeholder="Paste URL to selfie" />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-lg">W-9 Tax Form</h3>
              <p className="text-sm text-slate-500">Required for payouts over $600/year.</p>
              <Field label="Legal Name" name="w9LegalName" placeholder="Full legal name" />
              <Field label="SSN / EIN" name="w9Ssn" placeholder="XXX-XX-XXXX" />
              <Field label="Street Address" name="w9Address" placeholder="123 Main St" />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Field label="City" name="w9City" placeholder="New York" />
                </div>
                <div className="col-span-1">
                  <Field label="State" name="w9State" placeholder="NY" />
                </div>
                <div className="col-span-1">
                  <Field label="ZIP" name="w9Zip" placeholder="10001" />
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 text-lg">Review & Submit</h3>
              <p className="text-slate-500 text-sm">
                Your application will be reviewed by our team. You'll receive an email once approved.
              </p>
              <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 space-y-1.5 text-sm">
                <p><span className="font-medium text-slate-700">Name:</span> <span className="text-slate-600">{user?.name}</span></p>
                <p><span className="font-medium text-slate-700">Email:</span> <span className="text-slate-600">{user?.email}</span></p>
                <p><span className="font-medium text-slate-700">Phone:</span> <span className="text-slate-600">{form.phone || "—"}</span></p>
                <p><span className="font-medium text-slate-700">W-9:</span> <span className="text-slate-600">{form.w9LegalName || "—"}</span></p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            {step > 0 ? (
              <button onClick={() => setStep((s) => s - 1)} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>
            ) : <div />}
            <button
              onClick={handleNext}
              disabled={saveMutation.isPending || submitMutation.isPending}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending || submitMutation.isPending
                ? "Saving…"
                : step === steps.length - 1 ? "Submit Application" : "Save & Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
