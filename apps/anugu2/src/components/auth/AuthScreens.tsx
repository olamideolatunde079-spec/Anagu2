import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, ArrowRight, AlertTriangle, Key, Loader2, CheckCircle2 } from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { sendPasswordReset, signIn, signUpAndIn } from '../../lib/supabase';
import { CadastralPattern } from '../common/CadastralPattern';

// ── Login Page ────────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    navigate('/portal/dashboard');
  };

  return (
    <div className="min-h-screen bg-white text-[#252B28] flex items-center justify-center p-4 relative">
      <CadastralPattern />
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E8E5] p-6 sm:p-8 shadow-xs space-y-6 relative z-10">
        <BackButton to="/" label="Back to Home" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#245C43] flex items-center justify-center mx-auto text-white shadow-xs">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#252B28]">Sign In to My ANAGU</h1>
          <p className="text-xs text-[#4A524D]">
            Access your personal land titles, applications, and authorized workspaces.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="text-[#252B28] block mb-1 font-semibold">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
              placeholder="e.g. adeleke@domain.ng"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#252B28] font-semibold">Password</label>
              <Link to="/auth/forgot-password" className="text-[#245C43] hover:underline font-semibold">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{loading ? "Signing in..." : "Sign In to My ANAGU"}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-[#E5E8E5] text-center text-xs text-[#4A524D]">
          <span>First time registering land? </span>
          <Link to="/auth/register" className="text-[#245C43] hover:underline font-semibold">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

// ── Register Page ─────────────────────────────────────────────────────────────
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [nin, setNin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error: err } = await signUpAndIn(email, password, {
      full_name: name,
      phone,
      role: 'citizen',
      nin,
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate('/portal/dashboard');
  };

  return (
    <div className="min-h-screen bg-white text-[#252B28] flex items-center justify-center p-4 relative">
      <CadastralPattern />
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E8E5] p-6 sm:p-8 shadow-xs space-y-6 relative z-10">
        <BackButton to="/" label="Back to Home" />

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#252B28]">Create Your My ANAGU Account</h1>
          <p className="text-xs text-[#4A524D]">
            Create an account to register parcels and track your applications. Institutional and government roles are provisioned separately by an authorized administrator.
          </p>
        </div>

        <div className="rounded-lg border border-[#CBD0C8] bg-[#F7F8F7] p-3 text-xs text-[#4A524D] leading-relaxed">
          New accounts start as landholders. Surveyor, registrar, administrator, and Governor permissions require approval and are assigned by Anagu administrators.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[#252B28] block mb-1 font-semibold">Full Legal Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Chief Emeka Adeleke"
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[#252B28] block mb-1 font-semibold">National Identification Number (NIN)</label>
            <input
              type="text"
              value={nin}
              onChange={e => setNin(e.target.value)}
              placeholder="11-digit NIN (e.g. 7749-2810-942)"
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[#252B28] block mb-1 font-semibold">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@domain.gov / user@mail.com"
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-[#252B28] block mb-1 font-semibold">Phone (SMS Notifications)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+234 803 000 0000"
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[#252B28] block mb-1 font-semibold">Password (min 8 chars)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{loading ? 'Creating account…' : 'Create account and continue'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-[#E5E8E5] text-center text-xs text-[#4A524D]">
          <span>Already have an account? </span>
          <Link to="/auth/login" className="text-[#245C43] hover:underline font-semibold">Continue to account</Link>
        </div>
      </div>
    </div>
  );
};

// ── Forgot Password Page ──────────────────────────────────────────────────────
export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await sendPasswordReset(
        email,
        `${window.location.origin}/auth/reset-password`,
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset could not be requested.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-[#252B28] flex items-center justify-center p-4 relative">
      <CadastralPattern />
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E8E5] p-6 sm:p-8 shadow-xs space-y-6 relative z-10">
        <BackButton to="/auth/login" label="Back to Login" />
        <div className="text-center space-y-2">
          <Key className="w-10 h-10 text-[#245C43] mx-auto" />
          <h1 className="text-2xl font-bold text-[#252B28]">Reset Account Key</h1>
          <p className="text-xs text-[#4A524D]">
            Enter your registered email to receive recovery instructions.
          </p>
        </div>
        {sent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs text-center space-y-2">
            <CheckCircle2 className="w-6 h-6 mx-auto text-[#245C43]" />
            <div>Recovery link sent to <strong>{email}</strong></div>
            <Link to="/auth/login" className="text-[#245C43] underline font-semibold block">Return to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-[#252B28] block mb-1 font-semibold">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
                placeholder="name@domain.gov"
                required
              />
            </div>
            {error && <p role="alert" className="text-red-700 font-semibold">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Send Recovery Instructions</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ── Access Denied ─────────────────────────────────────────────────────────────
export const AccessDeniedPage: React.FC = () => {
  const { currentRole } = useApp();
  return (
    <div className="min-h-screen bg-white text-[#252B28] flex items-center justify-center p-4 relative">
      <CadastralPattern />
      <div className="w-full max-w-md bg-white rounded-xl border border-red-200 p-6 sm:p-8 shadow-xs text-center space-y-4 relative z-10">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
        <AlertTriangle className="w-12 h-12 text-red-700 mx-auto" />
        <h1 className="text-2xl font-bold text-[#252B28]">Access Denied</h1>
        <p className="text-xs text-[#4A524D] leading-relaxed">
          Your assigned role ({currentRole}) does not have permission for this operation. Contact an administrator if you believe this is incorrect.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/portal/dashboard" className="w-full py-2.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white font-semibold text-xs">
            Return to Dashboard
          </Link>
          <Link to="/" className="w-full py-2 rounded-lg bg-[#F7F8F7] border border-[#CBD0C8] text-[#252B28] text-xs font-semibold hover:bg-[#E5E8E5]">
            Public Home
          </Link>
        </div>
      </div>
    </div>
  );
};
