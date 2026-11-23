"use client";
/**
 * A03 — Forgot Password
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2, Landmark, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent]               = useState(false);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setServerError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to send reset email.");
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
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,56,245,0.15) 0%, transparent 70%)" }}
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

        <div className="card">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-[#13C98A]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-[#13C98A]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-sm text-[#AAB4CC] mb-6">
                We sent a password reset link to your inbox. It expires in 1 hour.
              </p>
              <Link href="/login" className="btn-secondary inline-flex items-center gap-2">
                <ArrowLeft size={16} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#6338F5]/20 flex items-center justify-center">
                  <Mail size={18} className="text-[#6338F5]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Forgot password?</h1>
                  <p className="text-xs text-[#AAB4CC]">Enter your email to reset it</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <input
                    {...register("email")}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input"
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-[#EF4444]">{errors.email.message}</p>
                  )}
                </div>

                {serverError && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
                    <AlertCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                    <p className="text-sm text-[#EF4444]">{serverError}</p>
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
                  {isSubmitting
                    ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                    : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-[#AAB4CC] hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
