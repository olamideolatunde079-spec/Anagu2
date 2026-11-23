"use client";
/**
 * PublicLayout — shell for public-facing pages (landing, about, verify).
 */
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Landmark } from "lucide-react";
import { clsx } from "clsx";

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Verify Title", href: "/verify" },
  { label: "Contact", href: "/#contact" },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-midnight)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#29345A]/60 backdrop-blur-md"
        style={{ background: "rgba(8,13,36,0.9)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Landmark size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white group-hover:text-[#6338F5] transition-colors">
              ANAGU<span className="text-[#6338F5]">!</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Public navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#AAB4CC] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login"    className="btn-ghost text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden btn-ghost p-2"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#29345A] px-4 py-4 space-y-1" style={{ background: "var(--surface-navy)" }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-[#AAB4CC] hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#29345A] flex flex-col gap-2">
              <Link href="/login"    className="btn-secondary text-sm text-center">Sign In</Link>
              <Link href="/register" className="btn-primary  text-sm text-center">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#29345A] py-10 mt-20" style={{ background: "var(--surface-navy)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Landmark size={14} className="text-white" />
                </div>
                <span className="font-bold text-white">ANAGU!</span>
              </div>
              <p className="text-xs text-[#AAB4CC] leading-relaxed">
                Blockchain-powered land administration and title verification for Nigeria.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Platform</h4>
              <ul className="space-y-2">
                {[{ label: "Features", href: "/#features" }, { label: "How It Works", href: "/#how-it-works" }, { label: "Verify Title", href: "/verify" }].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-xs text-[#AAB4CC] hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Legal</h4>
              <ul className="space-y-2">
                {["Privacy Policy", "Terms of Use", "Land Use Act 1978"].map((l) => (
                  <li key={l}><span className="text-xs text-[#AAB4CC]">{l}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Contact</h4>
              <p className="text-xs text-[#AAB4CC]">Jalingo, Taraba State, Nigeria</p>
              <p className="text-xs text-[#AAB4CC] mt-1">support@anagu.gov.ng</p>
            </div>
          </div>

          <div className="border-t border-[#29345A] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-[#AAB4CC]">
              © {new Date().getFullYear()} ANAGU Land Administration Framework. All rights reserved.
            </p>
            <p className="text-xs text-[#29345A]">
              Secure · Transparent · Trusted
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
