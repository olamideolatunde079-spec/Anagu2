"use client";
/**
 * A01 — Sign In
 */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Landmark, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

const schema = z.object({
  email:      z.string().email("Enter a valid email address"),
  password:   z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router                            = useRouter();
  const searchParams                      = useSearchParams();
  const [showPassword, setShowPassword]   = useState(false);
  const [serverError,  setServerError]    = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "1") setJustRegistered(true);
  }, [searchParams]);

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });
      const result = await response.json() as {
        accessToken?: string;
        refreshToken?: string;
        error?: string;
      };
      if (!response.ok || !result.accessToken || !result.refreshToken) {
        setServerError(
          result.error ?? "Unable to sign in. Please check your connection and try again.",
        );
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) {
        setServerError("Sign-in succeeded, but the session could not be saved. Please try again.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))
          ? "Unable to reach the authentication service. Check your connection and try again."
          : "Something went wrong while signing in. Please try again.",
      );
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
          <p className="mt-2 text-sm text-[#AAB4CC]">Secure · Transparent · Trusted</p>
        </div>

        {/* Just registered banner */}
        {justRegistered && (
          <div className="flex items-start gap-2 rounded-xl bg-[#13C98A]/10 border border-[#13C98A]/30 p-3 mb-4">
            <CheckCircle2 size={16} className="text-[#13C98A] shrink-0 mt-0.5" />
            <p className="text-sm text-[#13C98A]">
              Account created successfully. Sign in with your email and password.
            </p>
          </div>
        )}

        <div className="card">
          <h1 className="text-xl font-bold text-white mb-1">Sign in to your account</h1>
          <p className="text-sm text-[#AAB4CC] mb-6">
            New to ANAGU?{" "}
            <Link href="/register" className="text-[#6338F5] hover:underline font-medium">
              Create account
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="label">Email address</label>
              <input
                {...register("email")}
                id="login-email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-[#EF4444]">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="label mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#6338F5] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAB4CC] hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#EF4444]">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                {...register("rememberMe")}
                id="rememberMe"
                type="checkbox"
                className="w-4 h-4 rounded border-[#29345A] bg-[#111832] accent-[#6338F5]"
              />
              <label htmlFor="rememberMe" className="text-sm text-[#AAB4CC] cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            {/* Error */}
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
                <AlertCircle size={16} className="text-[#EF4444] shrink-0 mt-0.5" />
                <p className="text-sm text-[#EF4444]">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#AAB4CC]">
          By signing in, you agree to ANAGU&apos;s{" "}
          <span className="text-[#6338F5]">Terms of Use</span>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
