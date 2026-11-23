"use client";
/**
 * A02 — Create Account
 * Creates confirmed Supabase Auth accounts without sending confirmation email.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, Landmark, AlertCircle,
  User, Hammer, ChevronLeft, CheckCircle2,
} from "lucide-react";

const stepTwoSchema = z.object({
  fullName:        z.string().min(2, "Full name is required"),
  email:           z.string().email("Enter a valid email address"),
  phone:           z.string().min(7, "Phone number is required"),
  password:        z.string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "One uppercase letter required")
    .regex(/[0-9]/, "One number required"),
  confirmPassword: z.string(),
  terms:           z.literal<boolean>(true, {
    errorMap: () => ({ message: "You must accept the terms to continue" }),
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path:    ["confirmPassword"],
});

type StepTwoData = z.infer<typeof stepTwoSchema>;

const ROLES = [
  {
    value: "CITIZEN" as const,
    icon:  "citizen",
    title: "Citizen / Applicant",
    desc:  "Submit land applications, track progress, view owned titles",
  },
  {
    value: "SURVEYOR" as const,
    icon:  "surveyor",
    title: "Surveyor",
    desc:  "Submit parcel coordinates, GIS workspace access",
  },
];

export default function RegisterPage() {
  const router                        = useRouter();
  const [step, setStep]               = useState(1);
  const [role, setRole]               = useState<"CITIZEN" | "SURVEYOR">("CITIZEN");
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm<StepTwoData>({ resolver: zodResolver(stepTwoSchema) });

  const pw       = watch("password", "");
  const pwChecks = [
    { ok: pw.length >= 8,   label: "At least 8 characters" },
    { ok: /[A-Z]/.test(pw), label: "One uppercase letter"  },
    { ok: /[0-9]/.test(pw), label: "One number"            },
  ];

  const onSubmit = async (data: StepTwoData) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          role,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Account creation failed.");
      }

      router.replace("/login?registered=1");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
        setServerError("Unable to reach the authentication service. Check your connection and try again.");
      } else {
        setServerError(msg);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-midnight)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,56,245,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <Landmark size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white group-hover:text-[#6338F5] transition-colors">
              ANAGU<span className="text-[#6338F5]">!</span>
            </span>
          </Link>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[#6338F5]" : "bg-[#29345A]"
              }`}
            />
          ))}
        </div>

        <div className="card">
          {step === 1 ? (
            /* ── Step 1: Role selection ───────────────────────────────── */
            <>
              <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
              <p className="text-sm text-[#AAB4CC] mb-6">
                First, choose your account type
              </p>

              <div className="space-y-3 mb-6">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                      role === r.value
                        ? "border-[#6338F5] bg-[#6338F5]/10"
                        : "border-[#29345A] hover:border-[#6338F5]/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: r.value === "CITIZEN" ? "rgba(22,139,255,0.15)" : "rgba(99,56,245,0.15)" }}>
                      {r.value === "CITIZEN"
                        ? <User size={20} className="text-[#168BFF]" />
                        : <Hammer size={20} className="text-[#6338F5]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{r.title}</div>
                      <div className="text-xs text-[#AAB4CC] mt-0.5">{r.desc}</div>
                    </div>
                    {role === r.value && (
                      <CheckCircle2 size={18} className="text-[#6338F5] shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-primary w-full py-3"
              >
                Continue
              </button>

              <p className="text-center text-sm text-[#AAB4CC] mt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-[#6338F5] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            /* ── Step 2: Details form ─────────────────────────────────── */
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost p-1.5"
                  aria-label="Back"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">Account details</h1>
                  <p className="text-xs text-[#AAB4CC]">
                    {role === "CITIZEN" ? "Citizen / Applicant" : "Surveyor"} account
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Full name */}
                <div>
                  <label htmlFor="reg-fullName" className="label">Full name</label>
                  <input
                    {...register("fullName")}
                    id="reg-fullName"
                    type="text"
                    className="input"
                    placeholder="Ada Obi"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-[#EF4444]">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="reg-email" className="label">Email address</label>
                  <input
                    {...register("email")}
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    className="input"
                    placeholder="ada@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-[#EF4444]">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="reg-phone" className="label">Phone number</label>
                  <input
                    {...register("phone")}
                    id="reg-phone"
                    type="tel"
                    className="input"
                    placeholder="+234 801 234 5678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-[#EF4444]">{errors.phone.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="reg-password" className="label">Password</label>
                  <div className="relative">
                    <input
                      {...register("password")}
                      id="reg-password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      className="input pr-10"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAB4CC] hover:text-white"
                      aria-label={showPw ? "Hide" : "Show"}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {pwChecks.map((c) => (
                      <span
                        key={c.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          c.ok ? "text-[#13C98A]" : "text-[#AAB4CC]"
                        }`}
                      >
                        <CheckCircle2
                          size={11}
                          className={c.ok ? "text-[#13C98A]" : "text-[#29345A]"}
                        />
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="reg-confirm" className="label">Confirm password</label>
                  <div className="relative">
                    <input
                      {...register("confirmPassword")}
                      id="reg-confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      className="input pr-10"
                      placeholder="Repeat your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAB4CC] hover:text-white"
                      aria-label={showConfirm ? "Hide" : "Show"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-[#EF4444]">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      {...register("terms")}
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-[#29345A] bg-[#111832] accent-[#6338F5]"
                    />
                    <span className="text-sm text-[#AAB4CC]">
                      I agree to ANAGU&apos;s{" "}
                      <span className="text-[#6338F5]">Terms of Use</span> and{" "}
                      <span className="text-[#6338F5]">Privacy Policy</span>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="mt-1 text-xs text-[#EF4444]">{errors.terms.message}</p>
                  )}
                </div>

                {/* Error */}
                {serverError && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
                    <AlertCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                    <div className="text-sm text-[#EF4444]">
                      <p>{serverError}</p>
                      {serverError.includes("already exists") && (
                        <Link href="/login" className="mt-1 inline-block underline underline-offset-2">
                          Go to sign in
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
