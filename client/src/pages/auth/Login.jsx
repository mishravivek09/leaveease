import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/lib/api";

const ChronosMonolith = lazy(() => import("@/components/ChronosMonolith"));

const DEMO_ACCOUNTS = [
  { label: "Employee", email: "employee@leaveease.local" },
  { label: "Manager", email: "manager@leaveease.local" },
  { label: "HR", email: "hr@leaveease.local" },
  { label: "Admin", email: "admin@leaveease.local" },
];

export default function AuthForm({ className, ...props }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        y: 22,
        opacity: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: "power3.out",
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("/auth/login", { email, password });
      login(res.data);
      if (res.data.employee?.mustChangePassword) {
        navigate("/profile");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("Demo@1234");
    setError("");
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "min-h-screen bg-background text-foreground grid lg:grid-cols-12",
        className
      )}
      {...props}
    >
      {/* Editorial & 3D Stage */}
      <section className="relative flex flex-col justify-between border-b border-border p-6 sm:p-10 lg:col-span-7 lg:border-b-0 lg:border-r lg:p-14">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground" data-reveal>
          <span>LeaveEase • MCSP-232</span>
          <span>08 Collections / RBAC</span>
        </div>

        <div className="my-8 space-y-6">
          <h1
            className="font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
            data-reveal
          >
            Time, <span className="italic text-primary">accounted</span> for.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base" data-reveal>
            An editorial leave ledger built for holiday-aware day calculation, configurable
            single and multi-stage approvals, and auditable balance accounting.
          </p>

          <div
            className="h-56 w-full overflow-hidden border border-border bg-card/50 sm:h-72 lg:h-80"
            data-reveal
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                  Initializing 3D time matrix...
                </div>
              }
            >
              <ChronosMonolith />
            </Suspense>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground" data-reveal>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 bg-[#232220]" /> Working Day
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 bg-[#d8cfc0]" /> Weekly Off
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 bg-primary" /> Public Holiday
            </span>
          </div>
        </div>

        <p className="font-mono text-xs text-muted-foreground" data-reveal>
          Copyright © 2026 Vivek Mishra (bytecode.vivek@gmail.com)
        </p>
      </section>

      {/* Sign-In Column */}
      <section className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-5 lg:p-14">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="space-y-2" data-reveal>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              Workspace Access
            </p>
            <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Enter your organization credentials or select a seeded demo role below.
            </p>
          </div>

          <div className="space-y-2" data-reveal>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Quick Demo Credentials (Demo@1234)
            </p>
            <div className="grid grid-cols-4 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => fillDemo(acc.email)}
                  className="border border-border bg-card px-2 py-2 font-mono text-xs transition-colors hover:border-primary hover:text-primary"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 border-t border-border pt-6" data-reveal>
            <div>
              <label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Email address
              </label>
              <Input
                id="email"
                autoComplete="email"
                className="mt-2 h-11 rounded-none border-border bg-card"
                placeholder="employee@leaveease.local"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <Input
                id="password"
                autoComplete="current-password"
                className="mt-2 h-11 rounded-none border-border bg-card"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-none font-mono text-xs uppercase tracking-widest transition-transform active:scale-[0.99]"
            >
              {loading ? "Authenticating..." : "Enter Workspace →"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
