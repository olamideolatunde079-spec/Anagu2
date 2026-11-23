"use client";
/**
 * TopBar — top application bar with breadcrumbs, notifications, user menu.
 */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, ChevronDown, LogOut, User, Settings, Sun, Moon, Menu, X
} from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import type { AppUser } from "@/hooks/useUser";

interface Notification {
  id:        string;
  title:     string;
  body:      string;
  read:      boolean;
  createdAt: string;
}

interface TopBarProps {
  user:         AppUser | null;
  pageTitle?:   string;
  onMenuToggle?: () => void;
  showMenuBtn?:  boolean;
}

function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("mqtt_events")
      .select("id, topic, payload, delivered, published_at")
      .eq("delivered", false)
      .order("published_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const mapped: Notification[] = (data ?? []).map((e) => ({
          id:        e.id as string,
          title:     String((e.payload as Record<string, unknown>)?.event ?? e.topic),
          body:      String((e.payload as Record<string, unknown>)?.message ?? ""),
          read:      Boolean(e.delivered),
          createdAt: String(e.published_at),
        }));
        setNotifications(mapped);
        setUnread(mapped.filter((n) => !n.read).length);
      });
  }, [userId]);

  return { notifications, unread };
}

export function TopBar({ user, pageTitle, onMenuToggle, showMenuBtn = false }: TopBarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [notifOpen,    setNotifOpen]      = useState(false);
  const [theme,        setTheme]          = useState<"dark" | "light">("dark");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);
  const { notifications, unread } = useNotifications(user?.id);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <header
      className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-[#29345A]"
      style={{ background: "var(--surface-navy)" }}
    >
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3">
        {showMenuBtn && (
          <button
            onClick={onMenuToggle}
            className="btn-ghost p-2"
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
        )}
        {pageTitle && (
          <h1 className="text-base font-semibold text-white truncate">{pageTitle}</h1>
        )}
      </div>

      {/* Right: theme, notifications, user */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2"
          aria-label="Toggle theme"
        >
          {theme === "dark"
            ? <Sun  size={18} className="text-[#F0B429]" />
            : <Moon size={18} className="text-[#6338F5]" />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="btn-ghost p-2 relative"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[#29345A] bg-[#171A3B] shadow-card z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#29345A]">
                <span className="text-sm font-semibold text-white">Notifications</span>
                <button onClick={() => setNotifOpen(false)} className="text-[#AAB4CC] hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-[#AAB4CC] text-center">No new notifications</p>
                ) : notifications.map((n) => (
                  <div
                    key={n.id}
                    className={clsx(
                      "px-4 py-3 border-b border-[#29345A]/50 last:border-0",
                      !n.read && "bg-[#6338F5]/5"
                    )}
                  >
                    <p className="text-sm font-medium text-white">{n.title}</p>
                    {n.body && <p className="text-xs text-[#AAB4CC] mt-0.5">{n.body}</p>}
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-[#29345A]">
                <Link href="/notifications" className="text-xs text-[#6338F5] hover:underline">
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white leading-none truncate max-w-[120px]">
                {user?.fullName ?? "User"}
              </p>
              <p className="text-xs text-[#AAB4CC] leading-none mt-0.5">
                {user?.role ?? ""}
              </p>
            </div>
            <ChevronDown size={14} className="text-[#AAB4CC] hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[#29345A] bg-[#171A3B] shadow-card z-50 overflow-hidden py-1">
              <div className="px-4 py-3 border-b border-[#29345A]">
                <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
                <p className="text-xs text-[#AAB4CC] truncate">{user?.email}</p>
              </div>

              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#AAB4CC] hover:text-white hover:bg-white/5 transition-colors"
              >
                <User size={15} /> My Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#AAB4CC] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings size={15} /> Settings
              </Link>

              <div className="border-t border-[#29345A] my-1" />

              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
