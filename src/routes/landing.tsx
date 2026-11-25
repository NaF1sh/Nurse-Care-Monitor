import { createFileRoute, Navigate, useNavigate, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Battery,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  Heart,
  HeartHandshake,
  Lock,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Watch,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeCareLogo } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { LanguageToggle, useT } from "@/lib/i18n";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Nurse Care Monitor — Nurse Monitoring & Workforce Support Platform" },
      { name: "description", content: "Care for those who care for us. Spot nurse strain early. Support teams sooner." },
      { property: "og:title", content: "Nurse Care Monitor — Nurse Monitoring & Workforce Support Platform" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Spot nurse strain early. Support teams sooner." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user, enterDemoMode } = useStore();
  const t = useT();
  const navigate = useNavigate();

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLaunchDemo = () => {
    enterDemoMode();
    toast.success("Welcome to the Nurse Care Monitor Workspace!", {
      description: "Supervisor dashboard with full left menu loaded.",
    });
    navigate({ to: "/" });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setMsg(error ? { type: "error", text: t("login.error.reset") || "Could not send reset email." } : { type: "info", text: t("login.info.resetSent") || "Reset link sent." });
    } else if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg({ type: "error", text: t("login.error.signin") || "Invalid email or password." });
      else navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
      });
      if (error) setMsg({ type: "error", text: error.message });
      else setMsg({ type: "info", text: t("login.info.signup") || "Check email to confirm your account." });
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-[#F3F5F8] text-[#172033] font-sans antialiased selection:bg-[#C9F3DD] selection:text-[#142039]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#E2E7EF] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <WeCareLogo size="md" variant="light" withSubtitle={true} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-[#64748B]">
            <a href="#problem" className="hover:text-[#172033] transition-colors">The Challenge</a>
            <a href="#how-it-works" className="hover:text-[#172033] transition-colors">How It Works</a>
            <a href="#affordability" className="hover:text-[#172033] transition-colors">Affordability</a>
            <a href="#trust" className="hover:text-[#172033] transition-colors">Trust & Safety</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMode("signin");
                setShowAuthModal(true);
              }}
              className="h-9 rounded-xl border-[#D9E0EB] text-xs font-bold text-[#172033]"
            >
              Supervisor Sign In
            </Button>
            <Button
              size="sm"
              onClick={handleLaunchDemo}
              className="h-9 rounded-xl bg-[#394BC5] hover:bg-[#303eaa] text-xs font-extrabold text-white shadow-xs"
            >
              Open Workspace <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C9F3DD] bg-[#E1F4E9] px-3.5 py-1 text-xs font-extrabold text-[#16835E] mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            International AI Builders Congress — HealthSphere AI Finalist
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#142039] leading-[1.1]">
            Care for those who <span className="text-[#394BC5] underline decoration-[#C9F3DD] decoration-wavy underline-offset-8">care for us</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-[#64748B] leading-relaxed">
            An intelligent nurse monitoring and workforce coordination platform for hospitals. Spot physiological strain early, communicate with companion mobile apps, and coordinate timely relief.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={handleLaunchDemo}
              className="h-12 rounded-2xl bg-[#394BC5] hover:bg-[#303eaa] px-6 text-sm font-extrabold text-white shadow-md transition-transform hover:-translate-y-0.5"
            >
              Open Supervisor Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Link
              to="/"
              className="inline-flex h-12 items-center rounded-2xl border border-[#D9E0EB] bg-white px-6 text-sm font-bold text-[#172033] hover:bg-[#F8FAFC]"
            >
              View Left Menu Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Integrated Supabase Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md rounded-2xl border border-[#E2E7EF] bg-white p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#64748B] hover:bg-[#F3F5F8]"
            >
              <X className="h-5 w-5" />
            </button>

            <CardHeader className="text-center p-0 pb-4">
              <WeCareLogo size="md" variant="light" className="justify-center mb-2" />
              <CardTitle className="text-lg font-extrabold text-[#172033]">
                {mode === "signin" ? "Supervisor Sign In" : mode === "signup" ? "Register Supervisor Account" : "Password Recovery"}
              </CardTitle>
              <CardDescription className="text-xs text-[#64748B]">
                {mode === "signin" ? "Access your hospital unit workspace" : mode === "signup" ? "Create authorized supervisor account" : "Enter your email to receive recovery link"}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {mode === "signup" && (
                  <div>
                    <Label className="text-xs font-bold text-[#172033]">Full Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={120}
                      placeholder="Dr. Anika Rahman"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs font-bold text-[#172033]">Hospital Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="supervisor@hospital.org"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-bold text-[#172033]">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => { setMode("forgot"); setMsg(null); }}
                          className="text-[11px] font-bold text-[#394BC5] hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      type="password"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}

                {msg && (
                  <p className={`text-xs font-semibold p-2 rounded-lg ${msg.type === "error" ? "bg-[#FCE6E9] text-[#C24152]" : "bg-[#E1F4E9] text-[#16835E]"}`}>
                    {msg.text}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full h-10 rounded-xl bg-[#394BC5] hover:bg-[#303eaa] font-extrabold text-xs text-white"
                >
                  {mode === "signin" ? "Sign In" : mode === "signup" ? "Register Supervisor" : "Send Recovery Email"}
                </Button>
              </form>

              <div className="mt-4 pt-3 border-t border-[#EEF2F7] flex flex-col gap-2 text-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setMsg(null);
                  }}
                  className="font-bold text-[#394BC5] hover:underline"
                >
                  {mode === "signin" ? "Need a supervisor account? Register" : "Back to Sign In"}
                </button>

                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-[#16835E] hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Or open Supervisor Workspace with left menu
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
