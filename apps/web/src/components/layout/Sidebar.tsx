"use client";
/**
 * Sidebar — left navigation with role-based links.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, FileText, FolderOpen, PlusCircle, Clipboard,
  Users, Settings, Shield, BookOpen, BarChart2, Activity,
  Landmark, Scale, MessageSquare, Radio, User, ChevronRight,
  Layers, Eye, FileSearch, AlertTriangle, List, Home
} from "lucide-react";
import { clsx } from "clsx";

export type UserRole =
  | "CITIZEN"
  | "SURVEYOR"
  | "REGISTRAR"
  | "LAND_ADMINISTRATOR"
  | "GOVERNOR"
  | "SYSTEM";

interface NavItem {
  label: string;
  href:  string;
  icon:  React.ReactNode;
  roles: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // ── Universal ────────────────────────────────────────
  { label: "Dashboard",         href: "/dashboard",             icon: <LayoutDashboard size={18} />, roles: ["CITIZEN","SURVEYOR","REGISTRAR","LAND_ADMINISTRATOR","GOVERNOR","SYSTEM"] },

  // ── Citizen ──────────────────────────────────────────
  { label: "My Lands",          href: "/citizen/lands",         icon: <Landmark size={18} />,        roles: ["CITIZEN"] },
  { label: "New Application",   href: "/citizen/apply",         icon: <PlusCircle size={18} />,      roles: ["CITIZEN"] },
  { label: "Track Applications",href: "/citizen/applications",  icon: <Activity size={18} />,        roles: ["CITIZEN"] },
  { label: "Documents",         href: "/citizen/documents",     icon: <FolderOpen size={18} />,      roles: ["CITIZEN"] },

  // ── Surveyor ─────────────────────────────────────────
  { label: "GIS Workspace",     href: "/gis/workspace",         icon: <Map size={18} />,             roles: ["SURVEYOR","REGISTRAR","LAND_ADMINISTRATOR"] },
  { label: "Survey Jobs",       href: "/surveyor/jobs",         icon: <Clipboard size={18} />,       roles: ["SURVEYOR"] },
  { label: "Submissions",       href: "/surveyor/submissions",  icon: <FileText size={18} />,        roles: ["SURVEYOR"] },

  // ── Registrar ────────────────────────────────────────
  { label: "Registrar Dashboard",href: "/registrar/dashboard",  icon: <LayoutDashboard size={18} />, roles: ["REGISTRAR"] },
  { label: "Review Queue",      href: "/registrar/queue",       icon: <FileSearch size={18} />,      roles: ["REGISTRAR"] },
  { label: "All Applications",  href: "/registrar/applications",icon: <List size={18} />,            roles: ["REGISTRAR"] },

  // ── Land Administrator ───────────────────────────────
  { label: "Admin Dashboard",   href: "/land-admin/dashboard",  icon: <LayoutDashboard size={18} />, roles: ["LAND_ADMINISTRATOR"] },
  { label: "Land Records",      href: "/land-admin/records",    icon: <BookOpen size={18} />,        roles: ["LAND_ADMINISTRATOR"] },
  { label: "Reports",           href: "/land-admin/reports",    icon: <BarChart2 size={18} />,       roles: ["LAND_ADMINISTRATOR"] },

  // ── Governor ─────────────────────────────────────────
  { label: "Revocation Dashboard",href:"/governor/dashboard",   icon: <Shield size={18} />,          roles: ["GOVERNOR"] },
  { label: "Review Revocations",href: "/governor/revoke",       icon: <AlertTriangle size={18} />,   roles: ["GOVERNOR"] },
  { label: "Revocation History",href: "/governor/history",      icon: <List size={18} />,            roles: ["GOVERNOR"] },

  // ── System Admin ────────────────────────────────────
  { label: "System Dashboard",  href: "/admin/dashboard",       icon: <LayoutDashboard size={18} />, roles: ["SYSTEM"] },
  { label: "User Management",   href: "/admin/users",           icon: <Users size={18} />,           roles: ["SYSTEM"] },
  { label: "Roles & Permissions",href:"/admin/roles",           icon: <Shield size={18} />,          roles: ["SYSTEM"] },
  { label: "Audit Log",         href: "/admin/audit",           icon: <Eye size={18} />,             roles: ["SYSTEM"] },
  { label: "System Settings",   href: "/admin/settings",        icon: <Settings size={18} />,        roles: ["SYSTEM"] },

  // ── Shared bottom ────────────────────────────────────
  { label: "Evaluation",        href: "/evaluation",            icon: <BarChart2 size={18} />,       roles: ["REGISTRAR","LAND_ADMINISTRATOR","SYSTEM"] },
  { label: "NFT Titles",        href: "/titles",                icon: <Layers size={18} />,          roles: ["CITIZEN","REGISTRAR","LAND_ADMINISTRATOR","SYSTEM"] },
  { label: "MQTT Monitor",      href: "/admin/mqtt",            icon: <Radio size={18} />,           roles: ["SYSTEM"] },
  { label: "My Profile",        href: "/profile",               icon: <User size={18} />,            roles: ["CITIZEN","SURVEYOR","REGISTRAR","LAND_ADMINISTRATOR","GOVERNOR","SYSTEM"] },
];

interface SidebarProps {
  role:        UserRole;
  onClose?:    () => void;
  collapsed?:  boolean;
}

function SidebarLinkItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item:      NavItem;
  active:    boolean;
  collapsed?: boolean;
  onClick?:  () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={clsx("sidebar-link", active && "active")}
      title={collapsed ? item.label : undefined}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && active && <ChevronRight size={14} className="shrink-0 opacity-60" />}
    </Link>
  );
}

export function Sidebar({ role, onClose, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav
      className="flex flex-col h-full py-4"
      style={{ background: "var(--surface-navy)" }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={clsx("px-5 mb-6", collapsed && "px-3")}>
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
            <Landmark size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-white group-hover:text-[#6338F5] transition-colors">
              ANAGU<span className="text-[#6338F5]">!</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <div className={clsx("flex-1 overflow-y-auto space-y-0.5 px-3", collapsed && "px-1")}>
        {visibleItems.map((item) => (
          <SidebarLinkItem
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            collapsed={collapsed}
            onClick={onClose}
          />
        ))}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-5 mt-4 pt-4 border-t border-[#29345A]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#6338F5]/30 flex items-center justify-center">
              <Shield size={12} className="text-[#6338F5]" />
            </div>
            <span className="text-xs text-[#AAB4CC] font-medium uppercase tracking-wider">
              {role.replace("_", " ")}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
