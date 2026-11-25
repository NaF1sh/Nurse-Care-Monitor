import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cpu,
  ExternalLink,
  Gauge,
  HeartHandshake,
  History,
  LayoutDashboard,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeCareLogo } from "@/components/brand";
import { useStore, type StressLevel, WARDS } from "@/lib/store";
import { LanguageToggle, useT, type StringKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout, isDemoMode, activeWard, setActiveWard, notifications, supportRequests } = useStore();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsible & Resizable Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wecare-sidebar-collapsed") === "true";
    }
    return false;
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wecare-sidebar-width");
      return saved ? parseInt(saved, 10) : 230;
    }
    return 230;
  });

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("wecare-sidebar-collapsed", String(next));
      }
      return next;
    });
  };

  const toggleWideMode = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(260);
      localStorage.setItem("wecare-sidebar-collapsed", "false");
      localStorage.setItem("wecare-sidebar-width", "260");
    } else if (sidebarWidth >= 260) {
      setSidebarWidth(224);
      localStorage.setItem("wecare-sidebar-width", "224");
    } else {
      setSidebarWidth(280);
      localStorage.setItem("wecare-sidebar-width", "280");
    }
  };

  // Drag-to-resize sidebar logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 190), 380);
      setSidebarWidth(newWidth);
      if (typeof window !== "undefined") {
        localStorage.setItem("wecare-sidebar-width", String(newWidth));
      }
      if (isCollapsed && newWidth > 140) {
        setIsCollapsed(false);
        localStorage.setItem("wecare-sidebar-collapsed", "false");
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isCollapsed]);

  const unreadNotifs = notifications.filter((n) => n.status !== "acknowledged" && n.status !== "completed").length;
  const pendingSupport = supportRequests.filter((s) => s.status === "pending").length;

  const currentPath = location.pathname;

  const sections: NavSection[] = [
    {
      title: "WORKSPACE",
      items: [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        { to: "/nurses", label: "Nurses", icon: Users },
        { to: "/predictions", label: "Predictions", icon: Sparkles },
        { to: "/actions", label: "Manual actions", icon: ClipboardList },
        { to: "/simulation", label: "Live simulation", icon: Gauge, badge: "DEMO" },
        { to: "/notifications", label: "Notifications", icon: Bell, badge: unreadNotifs > 0 ? unreadNotifs : undefined },
        { to: "/support", label: "Support workflow", icon: HeartHandshake, badge: pendingSupport > 0 ? pendingSupport : undefined, highlight: pendingSupport > 0 },
      ],
    },
    {
      title: "ORGANIZATION",
      items: [
        { to: "/wards", label: "Wards", icon: Building2 },
        { to: "/staff", label: "Staff directory", icon: UserCheck },
        { to: "/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/activity", label: "Activity history", icon: History },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        { to: "/ai-devices", label: "AI & devices", icon: Cpu },
        { to: "/settings", label: "Settings", icon: Settings },
        { to: "/landing", label: "Public showcase", icon: ExternalLink },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F7F8F5] text-[#192C28] font-sans antialiased selection:bg-[#C6E2D6] selection:text-[#192C28]">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#192C28]/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Slim, Light-Colored Sidebar (~220-240px, subtle borders, Attio/Linear quiet aesthetic) */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#FFFFFF] border-r border-[#E1E6E1] text-[#192C28] md:static md:translate-x-0 md:shrink-0 relative group",
          isResizing ? "" : "transition-[width] duration-200 ease-out",
          mobileOpen ? "translate-x-0 w-[230px]" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-[64px]" : ""
        )}
      >
        {/* Inline width spacer on desktop when expanded */}
        <div
          style={{ width: isCollapsed ? 64 : sidebarWidth }}
          className="hidden md:block transition-none"
        />

        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Brand Header */}
          <div
            className={cn(
              "flex items-center pt-5 pb-4 border-b border-[#F0F3F0]",
              isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
            )}
          >
            <Link to="/" className="flex items-center min-w-0" title="Nurse Care Monitor">
              <WeCareLogo size={isCollapsed ? "sm" : "md"} variant="pine" withSubtitle={!isCollapsed} />
            </Link>

            {!isCollapsed && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={toggleWideMode}
                  title={sidebarWidth >= 260 ? "Reset sidebar width" : "Widen sidebar"}
                  className="rounded-md p-1 text-[#64766E] hover:bg-[#EFF3F0] hover:text-[#192C28] transition-colors"
                >
                  {sidebarWidth >= 260 ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={toggleCollapse}
                  title="Collapse sidebar"
                  className="rounded-md p-1 text-[#64766E] hover:bg-[#EFF3F0] hover:text-[#192C28] transition-colors"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Mobile close */}
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-1 text-[#64766E] hover:bg-[#EFF3F0] hover:text-[#192C28] md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Expand Button when Collapsed */}
          {isCollapsed && (
            <div className="px-2 my-2 hidden md:flex justify-center">
              <button
                onClick={toggleCollapse}
                title="Expand sidebar"
                className="grid h-7 w-7 place-items-center rounded-md bg-[#EFF3F0] text-[#244D45] hover:bg-[#E6EFEA] transition-colors"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {sections.map((sec) => (
              <div key={sec.title}>
                {!isCollapsed ? (
                  <div className="px-2.5 pb-1 text-[10px] font-bold tracking-wider text-[#8A9A92] uppercase truncate">
                    {sec.title}
                  </div>
                ) : (
                  <div className="my-1.5 mx-auto w-4 border-t border-[#E1E6E1]" />
                )}
                <nav className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.to === "/"
                        ? currentPath === "/" || currentPath === "/dashboard"
                        : currentPath === item.to || currentPath.startsWith(item.to + "/");

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        title={isCollapsed ? item.label : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group relative flex items-center rounded-lg text-xs font-medium transition-colors",
                          isCollapsed
                            ? "justify-center p-2"
                            : "justify-between px-2.5 py-1.5",
                          isActive
                            ? "bg-[#EFF3F0] text-[#244D45] font-semibold"
                            : "text-[#4A5D54] hover:bg-[#F5F7F5] hover:text-[#192C28]"
                        )}
                      >
                        <div className={cn("flex items-center gap-2.5 min-w-0", isCollapsed ? "justify-center" : "")}>
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-[#244D45]" : "text-[#75887E] group-hover:text-[#244D45]"
                            )}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!isCollapsed && item.badge !== undefined && (
                          <span
                            className={cn(
                              "ml-1.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold tabular-nums",
                              item.highlight
                                ? "bg-[#C24152] text-white"
                                : isActive
                                ? "bg-[#C6E2D6] text-[#244D45]"
                                : "bg-[#EFF3F0] text-[#64766E]"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isCollapsed && item.highlight && (
                          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#C24152] ring-2 ring-white" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Quiet Human-in-the-Loop Philosophy footer indicator */}
          {!isCollapsed ? (
            <div className="mx-3 my-2 flex items-center gap-2 rounded-lg bg-[#F7F8F5] px-2.5 py-1.5 text-xs border border-[#E1E6E1]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#244D45] shrink-0" />
              <div className="leading-tight min-w-0">
                <span className="block text-[11px] font-semibold text-[#192C28] truncate">Human-led care</span>
                <span className="block text-[10px] text-[#64766E] truncate">AI estimates, human judgment</span>
              </div>
            </div>
          ) : (
            <div className="my-2 flex justify-center" title="Human-led care: AI estimates, human judgment">
              <span className="h-1.5 w-1.5 rounded-full bg-[#244D45]" />
            </div>
          )}

          {/* Supervisor Profile Card */}
          <div className="border-t border-[#E1E6E1] p-2.5 bg-[#FFFFFF]">
            <div className={cn("flex items-center", isCollapsed ? "justify-center flex-col gap-1.5" : "justify-between gap-2")}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-[#E6EFEA] text-[11px] font-bold text-[#244D45] shrink-0">
                  {user?.full_name ? user.full_name[0].toUpperCase() : "S"}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#192C28]">
                      {user?.full_name || "Dr. Anika Rahman"}
                    </p>
                    <span className="text-[10px] text-[#64766E] block truncate">
                      Clinical Supervisor
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  await logout();
                  navigate({ to: "/landing" });
                }}
                title="Sign out"
                className="rounded-md p-1 text-[#64766E] transition-colors hover:bg-[#EFF3F0] hover:text-[#C24152]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Drag Handle */}
        {!isCollapsed && (
          <div
            onMouseDown={() => setIsResizing(true)}
            title="Drag to resize sidebar width"
            className="hidden md:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#244D45]/40 transition-colors"
          />
        )}
      </aside>

      {/* Main Workspace Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Minimal, unified top navigation */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E1E6E1] bg-[#FFFFFF] px-4 md:px-6">
          {/* Left: Mobile trigger, Sidebar Toggle & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-[#64766E] hover:bg-[#EFF3F0] md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <button
              onClick={toggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-[#E1E6E1] bg-[#FFFFFF] px-2 py-1 text-xs font-medium text-[#64766E] hover:text-[#192C28] hover:border-[#244D45] transition-colors"
            >
              <PanelLeft className="h-3.5 w-3.5 text-[#244D45]" />
              <span className="text-[11px]">
                {isCollapsed ? "Expand" : "Collapse"}
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-[#64766E]">
              <span>Nurse Care Monitor</span>
              <span className="text-[#A5B2AC]">/</span>
              <strong className="text-[#192C28] font-semibold">{title}</strong>
            </div>
          </div>

          {/* Center: Ward Selector */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[#E1E6E1] bg-[#FFFFFF] px-2.5 py-1 text-xs text-[#64766E]">
            <Building2 className="h-3.5 w-3.5 text-[#244D45]" />
            <span className="text-[#64766E]">Ward:</span>
            <select
              value={activeWard}
              onChange={(e) => setActiveWard(e.target.value)}
              className="bg-transparent font-medium text-[#192C28] outline-hidden cursor-pointer text-xs"
            >
              <option value="all">All Wards</option>
              {WARDS.map((w) => (
                <option key={w} value={w}>
                  {w} Ward
                </option>
              ))}
            </select>
          </div>

          {/* Right: Notification, Language, Supervisor indicator */}
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative rounded-md border border-[#E1E6E1] p-1.5 text-[#64766E] hover:bg-[#EFF3F0] hover:text-[#192C28] transition-colors"
              title="Notifications"
            >
              <Bell className="h-3.5 w-3.5" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C24152] text-[8px] font-bold text-white">
                  {unreadNotifs}
                </span>
              )}
            </Link>

            <LanguageToggle />

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#E1E6E1]">
              <span className="h-2 w-2 rounded-full bg-[#244D45]" />
              <span className="text-xs font-medium text-[#192C28]">Morning Shift</span>
            </div>
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<
  StressLevel,
  { label: string; labelKey: StringKey; bgCls: string; textCls: string; dotCls: string }
> = {
  normal: {
    label: "Normal",
    labelKey: "stress.normal",
    bgCls: "bg-[#E6EFEA]",
    textCls: "text-[#244D45]",
    dotCls: "bg-[#244D45]",
  },
  moderate: {
    label: "Moderate",
    labelKey: "stress.moderate",
    bgCls: "bg-[#FFF3DD]",
    textCls: "text-[#B7791F]",
    dotCls: "bg-[#B7791F]",
  },
  high: {
    label: "Elevated",
    labelKey: "stress.high",
    bgCls: "bg-[#FDE8EA]",
    textCls: "text-[#C24152]",
    dotCls: "bg-[#C24152]",
  },
  unknown: {
    label: "Unknown",
    labelKey: "stress.unknown",
    bgCls: "bg-[#EFF3F0]",
    textCls: "text-[#64766E]",
    dotCls: "bg-[#64766E]",
  },
};

export function StressBadge({ level, stale }: { level?: StressLevel | undefined; stale?: boolean }) {
  const t = useT();
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF3F0] px-2 py-0.5 text-xs font-medium text-[#64766E]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#64766E]" />
        {t("stress.none") || "Unknown"}
      </span>
    );
  }

  const s = STATUS_CONFIG[level] || STATUS_CONFIG.unknown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight whitespace-nowrap",
        s.bgCls,
        s.textCls
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", s.dotCls)} />
      <span>{t(s.labelKey) || s.label}</span>
      {stale && (
        <span className="ml-0.5 rounded-sm border border-dashed border-current/30 px-1 py-0 text-[9px] uppercase opacity-75">
          {t("stress.stale") || "stale"}
        </span>
      )}
    </span>
  );
}
