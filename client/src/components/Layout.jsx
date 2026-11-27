import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import {
  LayoutDashboard,
  FilePlus,
  ClipboardList,
  Users,
  BarChart3,
  CheckCircle,
  LogOut,
  User,
  Settings,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

export default function Layout({ children }) {
  const { user, roleName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !mainRef.current) return;
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
    );
  }, [location.pathname]);

  const menu = {
    Employee: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Apply Leave", path: "/apply", icon: FilePlus },
      { label: "My Leaves", path: "/leaves", icon: ClipboardList },
      { label: "Track Leaves", path: "/track-leaves", icon: ClipboardList },
    ],
    Manager: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Apply Leave", path: "/apply", icon: FilePlus },
      { label: "My Leaves", path: "/leaves", icon: ClipboardList },
      { label: "Track Leaves", path: "/track-leaves", icon: ClipboardList },
      { label: "Approvals", path: "/approvals", icon: CheckCircle },
      { label: "Reports", path: "/reports", icon: BarChart3 },
    ],
    HR: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Apply Leave", path: "/apply", icon: FilePlus },
      { label: "All Leaves", path: "/leaves", icon: ClipboardList },
      { label: "Track Leaves", path: "/track-leaves", icon: ClipboardList },
      { label: "Approvals", path: "/approvals", icon: CheckCircle },
      { label: "Reports", path: "/reports", icon: BarChart3 },
    ],
    Admin: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "All Leaves", path: "/leaves", icon: ClipboardList },
      { label: "Master Data", path: "/admin/master-data", icon: Settings },
      { label: "Users", path: "/users", icon: Users },
      { label: "Reports", path: "/reports", icon: BarChart3 },
    ],
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getPageTitle = () => {
    const titles = {
      "/dashboard": "Dashboard",
      "/apply": "Apply for leave",
      "/leaves": roleName === "Employee" || roleName === "Manager" ? "My leave requests" : "All leave requests",
      "/track-leaves": "Track leave",
      "/users": "Employee management",
      "/reports": "MIS Reports",
      "/approvals": "Leave approvals",
      "/admin/master-data": "Master data administration",
      "/profile": "My profile",
    };
    return titles[location.pathname] || "Dashboard";
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="border-b border-border bg-card md:min-h-screen md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-4 md:py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ClipboardList size={21} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">LeaveEase</h2>
            <p className="text-xs text-muted-foreground">MCSP-232 LMS</p>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3 md:pb-6"
        >
          {(menu[roleName] || []).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:w-full ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div>
            <h1 className="font-serif text-xl tracking-tight sm:text-2xl">{getPageTitle()}</h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {roleName || "User"} workspace
              {user?.deptId?.deptName ? ` • ${user.deptId.deptName}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {user?.name?.charAt(0)?.toUpperCase() || <User size={18} />}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48 p-1">
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <User size={16} />
                  Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2 text-red-500"
                >
                  <LogOut size={16} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main ref={mainRef} className="w-full flex-1 p-4 sm:p-6 lg:p-8">{children}</main>

        <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          Copyright © 2026 Vivek Mishra (bytecode.vivek@gmail.com) • LeaveEase MCSP-232
        </footer>
      </div>
    </div>
  );
}
